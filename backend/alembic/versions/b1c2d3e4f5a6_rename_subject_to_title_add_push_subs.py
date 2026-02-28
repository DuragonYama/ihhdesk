"""Rename daily_reminder_config.subject to title; add push_subscriptions if missing

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-02-28 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(name: str) -> bool:
    bind = op.get_bind()
    return inspect(bind).has_table(name)


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    cols = [c['name'] for c in inspect(bind).get_columns(table)]
    return column in cols


def upgrade() -> None:
    # ── daily_reminder_config: rename subject → title ────────────────────────
    if _table_exists('daily_reminder_config'):
        if _column_exists('daily_reminder_config', 'subject') and \
                not _column_exists('daily_reminder_config', 'title'):
            with op.batch_alter_table('daily_reminder_config') as batch_op:
                batch_op.alter_column(
                    'subject',
                    new_column_name='title',
                    existing_type=sa.String(),
                )

    # ── push_subscriptions: create if it was missing from earlier migration ──
    if not _table_exists('push_subscriptions'):
        op.create_table(
            'push_subscriptions',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('endpoint', sa.String(), nullable=False, unique=True),
            sa.Column('p256dh', sa.String(), nullable=False),
            sa.Column('auth', sa.String(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    if _table_exists('push_subscriptions'):
        op.drop_table('push_subscriptions')

    if _table_exists('daily_reminder_config') and \
            _column_exists('daily_reminder_config', 'title') and \
            not _column_exists('daily_reminder_config', 'subject'):
        with op.batch_alter_table('daily_reminder_config') as batch_op:
            batch_op.alter_column(
                'title',
                new_column_name='subject',
                existing_type=sa.String(),
            )
