from alembic import op
import sqlalchemy as sa
revision = "0003_docs"; down_revision = "0002_normalize_core"; branch_labels=None; depends_on=None
def upgrade():
    op.create_table("documents",
        sa.Column("doc_id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("source", sa.Text, nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("path", sa.Text, nullable=False),
        sa.Column("uploaded_at", sa.TIMESTAMP, server_default=sa.text("now()"))
    )
    op.create_table("doc_course_map",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("doc_id", sa.Integer, nullable=False),
        sa.Column("course_id", sa.Text, nullable=False),
        sa.Column("confidence", sa.Numeric(5,2)),
        sa.Column("rule_text", sa.Text)
    )
    op.create_foreign_key("fk_doc_map_doc","doc_course_map","documents",["doc_id"],["doc_id"],ondelete="CASCADE")
    op.create_foreign_key("fk_doc_map_course","doc_course_map","courses",["course_id"],["course_id"],ondelete="CASCADE")
def downgrade():
    op.drop_constraint("fk_doc_map_course","doc_course_map", type_="foreignkey")
    op.drop_constraint("fk_doc_map_doc","doc_course_map", type_="foreignkey")
    op.drop_table("doc_course_map")
    op.drop_table("documents")
