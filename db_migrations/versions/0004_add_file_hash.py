from alembic import op
import sqlalchemy as sa

revision = "0004_add_file_hash"
down_revision = "0003_docs"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("documents", sa.Column("file_hash", sa.String(64), nullable=True))
    op.create_index("idx_documents_file_hash", "documents", ["file_hash"])

def downgrade():
    op.drop_index("idx_documents_file_hash", "documents")
    op.drop_column("documents", "file_hash")