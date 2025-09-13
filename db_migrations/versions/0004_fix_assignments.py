from alembic import op
import sqlalchemy as sa

revision = "0004_fix_assignments"
down_revision = "0003_docs"
branch_labels = None
depends_on = None

def upgrade():
    # Добавляем уникальный constraint для (user_id, course_id) в assignments
    op.create_unique_constraint(
        "uq_assignments_user_course",
        "assignments",
        ["user_id", "course_id"]
    )

def downgrade():
    op.drop_constraint("uq_assignments_user_course", "assignments", type_="unique")