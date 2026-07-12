"""Shared power thresholds and status helper.

A rack's power draw is the sum of its devices' power_watts. Relative to the
rack's power_capacity_watts:
  normal   < 70%
  warning  70% – 90%
  critical > 90%
"""

POWER_WARNING_RATIO = 0.70
POWER_CRITICAL_RATIO = 0.90


def power_status(consumption_watts: int, capacity_watts: int | None) -> str:
    if not capacity_watts:
        return "unknown"
    ratio = consumption_watts / capacity_watts
    if ratio >= POWER_CRITICAL_RATIO:
        return "critical"
    if ratio >= POWER_WARNING_RATIO:
        return "warning"
    return "normal"


def power_percent(consumption_watts: int, capacity_watts: int | None) -> float:
    if not capacity_watts:
        return 0.0
    return round(consumption_watts / capacity_watts * 100, 1)
