from alembic import op
import sqlalchemy as sa

revision = "0002_normalize_core"
down_revision = "0001_base"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "roles",
        sa.Column("role_id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.Text, nullable=False, unique=True),
        sa.Column("description", sa.Text),
        sa.Column("risk_level", sa.Text),
    )

    op.create_table(
        "rule_requirements",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("role_id", sa.Integer, nullable=False),
        sa.Column("course_id", sa.Text, nullable=False),
        sa.Column("frequency", sa.Text),
        sa.Column("region", sa.Text),
        sa.Column("active", sa.Boolean, server_default=sa.text("TRUE")),
        sa.Column("effective_from", sa.Date, server_default=sa.text("CURRENT_DATE")),
        sa.Column("effective_to", sa.Date),
    )
    op.create_foreign_key(
        "fk_rule_req_role", "rule_requirements", "roles", ["role_id"], ["role_id"], ondelete="CASCADE"
    )
    op.create_foreign_key(
        "fk_rule_req_course", "rule_requirements", "courses", ["course_id"], ["course_id"], ondelete="CASCADE"
    )
    op.create_unique_constraint(
        "uq_rule_req_role_course_region",
        "rule_requirements",
        ["role_id", "course_id", "region"],
    )

    op.create_table(
        "assignments",
        sa.Column("assignment_id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Text, nullable=False),
        sa.Column("course_id", sa.Text, nullable=False),
        sa.Column("due_date", sa.Date),
        sa.Column("status", sa.Text, nullable=False, server_default="assigned"),  # assigned|in_progress|completed|overdue|waived
        sa.Column("assigned_by", sa.Text, server_default="system"),
        sa.Column("created_at", sa.TIMESTAMP, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP, server_default=sa.text("now()")),
    )
    op.create_foreign_key(
        "fk_assign_user", "assignments", "users", ["user_id"], ["user_id"], ondelete="CASCADE"
    )
    op.create_foreign_key(
        "fk_assign_course", "assignments", "courses", ["course_id"], ["course_id"], ondelete="CASCADE"
    )
    op.create_index("ix_assign_user_status", "assignments", ["user_id", "status"])

def downgrade():
    op.drop_index("ix_assign_user_status", table_name="assignments")
    op.drop_constraint("fk_assign_course", "assignments", type_="foreignkey")
    op.drop_constraint("fk_assign_user", "assignments", type_="foreignkey")
    op.drop_table("assignments")

    op.drop_constraint("fk_rule_req_course", "rule_requirements", type_="foreignkey")
    op.drop_constraint("fk_rule_req_role", "rule_requirements", type_="foreignkey")
    op.drop_constraint("uq_rule_req_role_course_region", "rule_requirements", type_="unique")
    op.drop_table("rule_requirements")

    op.drop_table("roles")
