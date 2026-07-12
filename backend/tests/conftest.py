import os
import tempfile
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://rackpilot:rackpilot@localhost:5432/rackpilot_test",
)

# Isolate uploaded files to a temp dir so tests never touch the (root-owned in
# Docker) backend/uploads mountpoint. Must be set before the app is imported.
os.environ.setdefault("UPLOADS_DIR", tempfile.mkdtemp(prefix="rackpilot-uploads-"))

from app.core.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User, UserRole  # noqa: E402  (registers models on Base)


def _ensure_test_database() -> None:
    url = make_url(TEST_DATABASE_URL)
    admin_url = url.set(database="postgres")
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        exists = conn.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": url.database},
        )
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{url.database}"'))
    admin_engine.dispose()


_ensure_test_database()

engine = create_engine(TEST_DATABASE_URL)
TestSessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
def _schema() -> Generator[None, None, None]:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def _clean_tables() -> Generator[None, None, None]:
    yield
    with engine.begin() as conn:
        tables = ", ".join(t.name for t in Base.metadata.sorted_tables)
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture
def db() -> Generator[Session, None, None]:
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        session = TestSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


PASSWORD = "Testpass123!"


def register_org(client: TestClient, org_name: str, email: str) -> dict[str, str]:
    """Register an org (email becomes its admin) and return auth headers."""
    r = client.post(
        "/api/auth/register",
        json={
            "organization_name": org_name,
            "email": email,
            "password": PASSWORD,
            "full_name": "Test Admin",
        },
    )
    assert r.status_code == 201, r.text
    r = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def create_user_with_role(
    db: Session, client: TestClient, org_id: int, email: str, role: UserRole
) -> dict[str, str]:
    """Insert a user with the given role directly and return auth headers."""
    from app.core.security import hash_password

    db.add(
        User(
            email=email,
            hashed_password=hash_password(PASSWORD),
            full_name=f"Test {role.value}",
            role=role,
            organization_id=org_id,
        )
    )
    db.commit()
    r = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def make_infra(client: TestClient, headers: dict[str, str]) -> dict[str, int]:
    """Create a datacenter -> room -> rack chain, return their ids."""
    dc = client.post(
        "/api/datacenters", json={"name": "DC", "location": "Baku"}, headers=headers
    ).json()
    room = client.post(
        "/api/rooms", json={"name": "Room", "datacenter_id": dc["id"]}, headers=headers
    ).json()
    rack = client.post(
        "/api/racks", json={"name": "RACK-01", "room_id": room["id"]}, headers=headers
    ).json()
    return {"datacenter_id": dc["id"], "room_id": room["id"], "rack_id": rack["id"]}
