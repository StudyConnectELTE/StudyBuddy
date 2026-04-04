"""pomodoro invite flow: group_id, invite_deadline, invite_status

Revision ID: b2c8e1f4a9d0
Revises: 3ed4ac7724a6
Create Date: 2026-03-23

"""
from alembic import op
import sqlalchemy as sa

revision = "b2c8e1f4a9d0"
down_revision = "3ed4ac7724a6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "pomodoro_sessions",
        sa.Column("group_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "pomodoro_sessions",
        sa.Column("invite_deadline", sa.DateTime(), nullable=True),
    )
    op.create_foreign_key(
        "fk_pomodoro_sessions_group_id",
        "pomodoro_sessions",
        "study_groups",
        ["group_id"],
        ["id"],
    )

    op.add_column(
        "pomodoro_session_participants",
        sa.Column(
            "invite_status",
            sa.String(length=20),
            nullable=False,
            server_default="accepted",
        ),
    )


def downgrade():
    op.drop_column("pomodoro_session_participants", "invite_status")
    op.drop_constraint("fk_pomodoro_sessions_group_id", "pomodoro_sessions", type_="foreignkey")
    op.drop_column("pomodoro_sessions", "invite_deadline")
    op.drop_column("pomodoro_sessions", "group_id")
