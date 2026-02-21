"""add_force_logout_to_users

Revision ID: 1a7a9b690546
Revises: 4fda964d0bc7
Create Date: 2026-02-21 19:38:07.729414

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a7a9b690546'
down_revision: Union[str, Sequence[str], None] = '4fda964d0bc7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('force_logout', sa.Boolean(), nullable=True, server_default='0'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'force_logout')
