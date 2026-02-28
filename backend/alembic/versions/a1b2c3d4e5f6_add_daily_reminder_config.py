"""Add push_subscriptions and daily_reminder_config tables

Revision ID: a1b2c3d4e5f6
Revises: 1a7a9b690546
Create Date: 2026-02-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '1a7a9b690546'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'push_subscriptions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('endpoint', sa.String(), nullable=False, unique=True),
        sa.Column('p256dh', sa.String(), nullable=False),
        sa.Column('auth', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_table(
        'daily_reminder_config',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('send_time', sa.String(), nullable=False, server_default='07:30'),
        sa.Column('title', sa.String(), nullable=False, server_default='Vergeet niet in te klokken!'),
        sa.Column('message', sa.Text(), nullable=False, server_default='Goedemorgen! Vergeet niet in te klokken vandaag.'),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('push_subscriptions')
    op.drop_table('daily_reminder_config')
