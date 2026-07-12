import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    engineer = "engineer"
    viewer = "viewer"


class DeviceType(str, enum.Enum):
    server = "server"
    switch = "switch"
    router = "router"
    firewall = "firewall"
    load_balancer = "load_balancer"
    san = "san"
    nas = "nas"
    ups = "ups"
    pdu = "pdu"


class DeviceStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    maintenance = "maintenance"
    decommissioned = "decommissioned"


class LifecycleStatus(str, enum.Enum):
    planning = "planning"
    ordered = "ordered"
    received = "received"
    installed = "installed"
    production = "production"
    maintenance = "maintenance"
    decommissioned = "decommissioned"
    disposed = "disposed"


# Forward order of lifecycle stages (index = progression)
LIFECYCLE_ORDER = [
    LifecycleStatus.planning,
    LifecycleStatus.ordered,
    LifecycleStatus.received,
    LifecycleStatus.installed,
    LifecycleStatus.production,
    LifecycleStatus.maintenance,
    LifecycleStatus.decommissioned,
    LifecycleStatus.disposed,
]

# Terminal stages that require an admin to reverse out of
LIFECYCLE_TERMINAL = {LifecycleStatus.decommissioned, LifecycleStatus.disposed}


class StockCategory(str, enum.Enum):
    cable = "cable"
    transceiver = "transceiver"
    rail_kit = "rail_kit"
    screw_kit = "screw_kit"
    spare_psu = "spare_psu"
    spare_drive = "spare_drive"
    other = "other"


class StockUnit(str, enum.Enum):
    pcs = "pcs"
    box = "box"
    meter = "meter"
    roll = "roll"


class MovementType(str, enum.Enum):
    received = "received"  # +quantity
    issued = "issued"  # -quantity
    adjusted = "adjusted"  # set/correct (delta applied as signed)
    returned = "returned"  # +quantity

# Movement types that increase stock; others decrease (issued) or are signed (adjusted)
MOVEMENT_INCREASES = {MovementType.received, MovementType.returned}
