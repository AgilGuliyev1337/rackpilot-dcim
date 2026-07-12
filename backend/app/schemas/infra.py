from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import DeviceStatus, DeviceType, LifecycleStatus


# --- DataCenter ---


class DataCenterCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    description: str | None = None


class DataCenterUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    description: str | None = None


class DataCenterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    location: str | None
    description: str | None
    organization_id: int


# --- Room ---


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    floor: str | None = Field(default=None, max_length=50)
    description: str | None = None
    datacenter_id: int
    floor_width: int = Field(default=20, ge=1, le=200)
    floor_height: int = Field(default=15, ge=1, le=200)


class RoomUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    floor: str | None = Field(default=None, max_length=50)
    description: str | None = None
    datacenter_id: int | None = None
    floor_width: int | None = Field(default=None, ge=1, le=200)
    floor_height: int | None = Field(default=None, ge=1, le=200)


class RoomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    floor: str | None
    description: str | None
    datacenter_id: int
    organization_id: int
    floor_width: int
    floor_height: int


# --- Rack ---


class RackCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    u_height: int = Field(default=42, ge=1, le=60)
    description: str | None = None
    room_id: int
    pos_x: float = Field(default=0.0, ge=0)
    pos_y: float = Field(default=0.0, ge=0)
    width_units: float = Field(default=1.0, gt=0, le=20)
    depth_units: float = Field(default=1.0, gt=0, le=20)
    power_capacity_watts: int | None = Field(default=10000, ge=0, le=1000000)


class RackUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    u_height: int | None = Field(default=None, ge=1, le=60)
    description: str | None = None
    room_id: int | None = None
    pos_x: float | None = Field(default=None, ge=0)
    pos_y: float | None = Field(default=None, ge=0)
    width_units: float | None = Field(default=None, gt=0, le=20)
    depth_units: float | None = Field(default=None, gt=0, le=20)
    power_capacity_watts: int | None = Field(default=None, ge=0, le=1000000)


class RackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    u_height: int
    description: str | None
    room_id: int
    organization_id: int
    pos_x: float
    pos_y: float
    width_units: float
    depth_units: float
    power_capacity_watts: int | None


class FloorPlanRack(BaseModel):
    id: int
    name: str
    u_height: int
    pos_x: float
    pos_y: float
    width_units: float
    depth_units: float
    device_count: int
    used_u: int
    utilization_percent: float
    power_percent: float
    power_status: str


class FloorPlanOut(BaseModel):
    room_id: int
    room_name: str
    floor_width: int
    floor_height: int
    racks: list[FloorPlanRack]


class RackUnit(BaseModel):
    u: int
    occupied: bool
    device_id: int | None = None
    device_name: str | None = None
    device_type: DeviceType | None = None
    device_photo_url: str | None = None


class RackLayout(BaseModel):
    rack_id: int
    rack_name: str
    u_height: int
    units: list[RackUnit]
    power_capacity_watts: int | None
    power_consumption_watts: int
    power_available_watts: int | None
    power_percent: float
    power_status: str


# --- Device ---


class DeviceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    asset_tag: str = Field(min_length=1, max_length=100)
    serial_number: str = Field(min_length=1, max_length=100)
    vendor: str | None = Field(default=None, max_length=100)
    model: str | None = Field(default=None, max_length=255)
    device_type: DeviceType
    status: DeviceStatus = DeviceStatus.active
    lifecycle_status: LifecycleStatus = LifecycleStatus.production
    owner: str | None = Field(default=None, max_length=255)
    department: str | None = Field(default=None, max_length=255)
    support_contract: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    cpu: str | None = Field(default=None, max_length=255)
    ram: str | None = Field(default=None, max_length=100)
    storage: str | None = Field(default=None, max_length=255)
    ip_address: str | None = Field(default=None, max_length=45)
    mac_address: str | None = Field(default=None, max_length=17)
    operating_system: str | None = Field(default=None, max_length=255)
    power_watts: int | None = Field(default=None, ge=0, le=100000)
    rack_id: int | None = None
    warehouse_id: int | None = None
    position_u: int | None = Field(default=None, ge=1)
    height_u: int = Field(default=1, ge=1)
    warranty_expiry: date | None = None
    purchase_date: date | None = None


class DeviceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    asset_tag: str | None = Field(default=None, min_length=1, max_length=100)
    serial_number: str | None = Field(default=None, min_length=1, max_length=100)
    vendor: str | None = Field(default=None, max_length=100)
    model: str | None = Field(default=None, max_length=255)
    device_type: DeviceType | None = None
    status: DeviceStatus | None = None
    lifecycle_status: LifecycleStatus | None = None
    owner: str | None = Field(default=None, max_length=255)
    department: str | None = Field(default=None, max_length=255)
    support_contract: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    cpu: str | None = Field(default=None, max_length=255)
    ram: str | None = Field(default=None, max_length=100)
    storage: str | None = Field(default=None, max_length=255)
    ip_address: str | None = Field(default=None, max_length=45)
    mac_address: str | None = Field(default=None, max_length=17)
    operating_system: str | None = Field(default=None, max_length=255)
    power_watts: int | None = Field(default=None, ge=0, le=100000)
    rack_id: int | None = None
    warehouse_id: int | None = None
    position_u: int | None = Field(default=None, ge=1)
    height_u: int | None = Field(default=None, ge=1)
    warranty_expiry: date | None = None
    purchase_date: date | None = None


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    asset_tag: str
    serial_number: str
    vendor: str | None
    model: str | None
    device_type: DeviceType
    status: DeviceStatus
    lifecycle_status: LifecycleStatus
    owner: str | None
    department: str | None
    support_contract: str | None
    notes: str | None
    cpu: str | None
    ram: str | None
    storage: str | None
    ip_address: str | None
    mac_address: str | None
    operating_system: str | None
    power_watts: int | None
    rack_id: int | None
    warehouse_id: int | None
    position_u: int | None
    height_u: int
    warranty_expiry: date | None
    purchase_date: date | None
    photo_front_url: str | None
    photo_back_url: str | None
    organization_id: int
    created_at: datetime
    updated_at: datetime


class DeviceListOut(BaseModel):
    items: list[DeviceOut]
    total: int
    page: int
    page_size: int
