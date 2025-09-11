from alembic import op
import sqlalchemy as sa
revision = "0001_base"; down_revision = None; branch_labels = None; depends_on = None
def upgrade():
    op.create_table("courses",
        sa.Column("course_id", sa.Text, primary_key=True),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("category", sa.Text),
        sa.Column("duration_minutes", sa.Integer),
        sa.Column("url", sa.Text),
        sa.Column("tags", sa.Text),
        sa.Column("prerequisites", sa.Text),
        sa.Column("provider", sa.Text),
    )
    op.create_table("rules",
        sa.Column("role", sa.Text, nullable=False),
        sa.Column("required_course_ids", sa.Text, nullable=False),
        sa.Column("frequency", sa.Text),
        sa.Column("region", sa.Text),
        sa.PrimaryKeyConstraint("role","region")
    )
    op.create_table("users",
        sa.Column("user_id", sa.Text, primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("email", sa.Text, nullable=False),
        sa.Column("role", sa.Text, nullable=False),
        sa.Column("department", sa.Text),
    )
    op.create_table("user_courses",
        sa.Column("user_id", sa.Text, nullable=False),
        sa.Column("course_id", sa.Text, nullable=False),
        sa.Column("completed_on", sa.Date),
        sa.PrimaryKeyConstraint("user_id","course_id")
    )
def downgrade():
    for t in ["user_courses","users","rules","courses"]:
        op.drop_table(t)
