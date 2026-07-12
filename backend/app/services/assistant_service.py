"""Optional AI assistant backed by OpenRouter.

Gathers a compact, strictly tenant-scoped snapshot of the organization's
infrastructure and asks an OpenRouter chat model to answer the user's question.
Disabled (returns a clear message) when OPENROUTER_API_KEY is not set.
"""

import logging
from datetime import date, timedelta

import httpx
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import DataCenter, Device, Rack, Room, StockItem, Warehouse
from app.services import dashboard_service, power

logger = logging.getLogger("assistant")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT = (
    "You are RackPilot, an assistant embedded in a data center infrastructure "
    "management (DCIM) tool. Answer the user's question concisely and factually "
    "using ONLY the organization data provided below. If the data does not "
    "contain the answer, say so plainly. Prefer short paragraphs or bullet "
    "points. Do not invent devices, racks, or numbers.\n\n"
    "LANGUAGE RULE (very important): First look at the QUESTION text only and "
    "decide its language. Then write your ENTIRE answer in that SAME language. "
    "Rules: English question -> answer in English. Russian question -> answer in "
    "Russian. Turkish question -> answer in Turkish. For anything else, or if the "
    "input is Azerbaijani, or too short/ambiguous to tell -> answer in Azerbaijani. "
    "Never reply in a language different from the question's language. "
    "Examples: 'Which racks are full?' -> English. 'Hansi refler doludur?' -> "
    "Azerbaijani. 'Какие стойки заполнены?' -> Russian. 'Hangi raflar dolu?' -> "
    "Turkish."
)


def is_configured() -> bool:
    return bool(settings.openrouter_api_key)


def build_context(db: Session, org_id: int) -> str:
    dash = dashboard_service.get_dashboard(db, org_id)

    used_by_rack = dict(
        db.execute(
            select(Device.rack_id, func.coalesce(func.sum(Device.height_u), 0))
            .where(
                Device.organization_id == org_id,
                Device.rack_id.is_not(None),
                Device.position_u.is_not(None),
            )
            .group_by(Device.rack_id)
        ).all()
    )
    power_by_rack = dict(
        db.execute(
            select(Device.rack_id, func.coalesce(func.sum(Device.power_watts), 0))
            .where(Device.organization_id == org_id, Device.rack_id.is_not(None))
            .group_by(Device.rack_id)
        ).all()
    )

    rack_lines: list[str] = []
    for rack, room, dc in db.execute(
        select(Rack, Room, DataCenter)
        .join(Room, Rack.room_id == Room.id)
        .join(DataCenter, Room.datacenter_id == DataCenter.id)
        .where(Rack.organization_id == org_id)
        .order_by(DataCenter.name, Rack.name)
    ):
        used = int(used_by_rack.get(rack.id, 0))
        pw = int(power_by_rack.get(rack.id, 0))
        rack_lines.append(
            f"- {rack.name} ({dc.name}/{room.name}): {rack.u_height - used}U free of "
            f"{rack.u_height}U, power {power.power_percent(pw, rack.power_capacity_watts)}% "
            f"({power.power_status(pw, rack.power_capacity_watts)})"
        )

    today = date.today()
    warranty = db.scalars(
        select(Device)
        .where(
            Device.organization_id == org_id,
            Device.warranty_expiry.is_not(None),
            Device.warranty_expiry >= today,
            Device.warranty_expiry <= today + timedelta(days=90),
        )
        .order_by(Device.warranty_expiry)
    ).all()
    warranty_lines = [
        f"- {d.name} ({d.asset_tag}) expires {d.warranty_expiry.isoformat()}"
        for d in warranty
    ]

    # Warehouses and stock items
    warehouses = db.scalars(
        select(Warehouse).where(Warehouse.organization_id == org_id).order_by(Warehouse.name)
    ).all()
    stock_items = db.scalars(
        select(StockItem).where(StockItem.organization_id == org_id).order_by(StockItem.name)
    ).all()
    wh_names = {w.id: w.name for w in warehouses}
    stock_lines = [
        f"- {s.name} (SKU {s.sku}) in {wh_names.get(s.warehouse_id, '?')}: "
        f"{s.quantity} {s.unit.value}, low-stock threshold {s.min_threshold}"
        f"{'  [LOW STOCK]' if s.quantity <= s.min_threshold else ''}"
        for s in stock_items
    ]

    groups = dash.devices_by_group
    parts = [
        "ORGANIZATION INFRASTRUCTURE SNAPSHOT",
        f"Total devices: {dash.total_devices} "
        f"(servers {groups.servers}, network {groups.network}, "
        f"storage {groups.storage}, power {groups.power})",
        f"Overall rack U utilization: {dash.rack_utilization_percent}%",
        f"Total power draw: {dash.total_power_watts} W of "
        f"{dash.total_power_capacity_watts} W capacity",
        "",
        "RACKS (free space and power):",
        *rack_lines,
        "",
        f"WARRANTY: {len(warranty)} device(s) expiring within 90 days:",
        *(warranty_lines or ["- none"]),
        "",
        f"WAREHOUSES: {len(warehouses)} warehouse(s): "
        + (", ".join(w.name for w in warehouses) or "none"),
        f"STOCK ITEMS: {len(stock_items)} item(s) "
        f"({len(dash.low_stock)} below their low-stock threshold):",
        *(stock_lines or ["- none"]),
    ]
    return "\n".join(parts)


def ask(db: Session, org_id: int, question: str) -> dict:
    if not is_configured():
        return {
            "configured": False,
            "answer": (
                "The AI assistant is not configured. Set OPENROUTER_API_KEY in the "
                "backend environment to enable it (see the README)."
            ),
        }

    context = build_context(db, org_id)
    payload = {
        "model": settings.openrouter_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"{context}\n\nQUESTION: {question}"},
        ],
    }
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        # Attribution headers per OpenRouter docs
        "HTTP-Referer": settings.frontend_base_url,
        "X-Title": "RackPilot DCIM",
    }

    logger.info("assistant query (org=%s, model=%s)", org_id, settings.openrouter_model)
    try:
        with httpx.Client(timeout=45) as client:
            resp = client.post(OPENROUTER_URL, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        logger.warning("assistant network error: %s", exc)
        return {
            "configured": True,
            "answer": "Could not reach the AI provider. Please try again shortly.",
        }

    if resp.status_code == 401:
        return {"configured": True, "answer": "The configured OpenRouter API key is invalid."}
    if resp.status_code == 429:
        return {"configured": True, "answer": "The AI provider is rate-limiting requests. Try again shortly."}
    if resp.status_code >= 400:
        detail = ""
        try:
            detail = resp.json().get("error", {}).get("message", "")
        except Exception:
            pass
        logger.warning("assistant provider error %s: %s", resp.status_code, detail)
        return {
            "configured": True,
            "answer": f"The AI provider returned an error{f': {detail}' if detail else ''}.",
        }

    try:
        answer = resp.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, ValueError):
        return {"configured": True, "answer": "The AI provider returned an unexpected response."}
    return {"configured": True, "answer": answer}
