"""Add scheduled_notifications table; migrate existing DailyReminderConfig data

Revision ID: c1d2e3f4a5b6
Revises: b1c2d3e4f5a6
Create Date: 2026-03-02 12:00:00.000000

"""
from typing import Sequence, Union
from datetime import datetime

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text

revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(name: str) -> bool:
    bind = op.get_bind()
    return inspect(bind).has_table(name)


def upgrade() -> None:
    if not _table_exists('scheduled_notifications'):
        op.create_table(
            'scheduled_notifications',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('title', sa.String(), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('send_time', sa.String(), nullable=False),
            sa.Column('days_of_week', sa.JSON(), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('target_type', sa.String(), nullable=False, server_default=sa.text("'all_scheduled'")),
            sa.Column('target_employee_ids', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        )

    # Migrate existing enabled DailyReminderConfig into scheduled_notifications (if not already done)
    bind = op.get_bind()
    count = bind.execute(text("SELECT COUNT(*) FROM scheduled_notifications")).scalar()
    if count == 0 and _table_exists('daily_reminder_config'):
        row = bind.execute(
            text("SELECT title, message, send_time FROM daily_reminder_config WHERE is_enabled = TRUE LIMIT 1")
        ).fetchone()
        if row:
            now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            bind.execute(
                text(
                    "INSERT INTO scheduled_notifications "
                    "(title, message, send_time, days_of_week, is_active, target_type, created_at, updated_at) "
                    "VALUES (:title, :message, :send_time, '[1,2,3,4,5]', 1, 'all_scheduled', :now, :now)"
                ),
                {"title": row[0], "message": row[1], "send_time": row[2], "now": now},
            )


def downgrade() -> None:
    if _table_exists('scheduled_notifications'):
        op.drop_table('scheduled_notifications')
