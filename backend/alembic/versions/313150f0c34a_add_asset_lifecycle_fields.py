"""add asset lifecycle fields

Revision ID: 313150f0c34a
Revises: 5675ae56b22c
Create Date: 2026-07-12 00:31:13.485825

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '313150f0c34a'
down_revision: Union[str, None] = '5675ae56b22c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


lifecycle_enum = sa.Enum(
    'planning', 'ordered', 'received', 'installed', 'production',
    'maintenance', 'decommissioned', 'disposed', name='lifecycle_status',
)


def upgrade() -> None:
    lifecycle_enum.create(op.get_bind(), checkfirst=True)
    op.add_column('devices', sa.Column('lifecycle_status', lifecycle_enum, nullable=False, server_default='production'))
    op.add_column('devices', sa.Column('department', sa.String(length=255), nullable=True))
    op.add_column('devices', sa.Column('support_contract', sa.String(length=255), nullable=True))
    op.add_column('devices', sa.Column('purchase_date', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('devices', 'purchase_date')
    op.drop_column('devices', 'support_contract')
    op.drop_column('devices', 'department')
    op.drop_column('devices', 'lifecycle_status')
    lifecycle_enum.drop(op.get_bind(), checkfirst=True)
