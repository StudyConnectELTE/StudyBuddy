"""add xp and level to users

Revision ID: c3f1a2b4d8e0
Revises: b2c8e1f4a9d0
Create Date: 2026-05-08

"""
from alembic import op
import sqlalchemy as sa

revision = "c3f1a2b4d8e0"
down_revision = "b2c8e1f4a9d0"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("xp", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "users",
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
    )


def downgrade():
    op.drop_column("users", "level")
    op.drop_column("users", "xp")
