from alembic import op
import sqlalchemy as sa

revision = "0005_fix_assignments_logic"
down_revision = "0004_add_file_hash"
branch_labels = None
depends_on = None

def upgrade():
    # Add urgency_level column
    op.add_column("assignments", sa.Column("urgency_level", sa.Text, server_default="normal"))
    
    # Create index for faster queries
    op.create_index("ix_assignments_urgency", "assignments", ["urgency_level"])

def downgrade():
    op.drop_index("ix_assignments_urgency", table_name="assignments")
    op.drop_column("assignments", "urgency_level")