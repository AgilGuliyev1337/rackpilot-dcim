"""split device photo into front and back

Revision ID: 5675ae56b22c
Revises: cbda8662f5fe
Create Date: 2026-07-12 00:16:30.173477

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '5675ae56b22c'
down_revision: Union[str, None] = 'cbda8662f5fe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('devices', sa.Column('photo_front_url', sa.String(length=500), nullable=True))
    op.add_column('devices', sa.Column('photo_back_url', sa.String(length=500), nullable=True))
    # preserve any existing photo as the front photo
    op.execute('UPDATE devices SET photo_front_url = photo_url')
    op.drop_column('devices', 'photo_url')


def downgrade() -> None:
    op.add_column('devices', sa.Column('photo_url', sa.String(length=500), nullable=True))
    op.execute('UPDATE devices SET photo_url = photo_front_url')
    op.drop_column('devices', 'photo_back_url')
    op.drop_column('devices', 'photo_front_url')
