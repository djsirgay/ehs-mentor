"""Add training tracking columns

Revision ID: add_training_tracking
Revises: 
Create Date: 2025-01-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '0006_add_training_tracking'
down_revision = '0005_fix_assignments_logic'
branch_labels = None
depends_on = None

def upgrade():
    # Add columns for tracking training progress
    op.add_column('assignments', sa.Column('started_at', sa.DateTime(), nullable=True))
    op.add_column('assignments', sa.Column('completed_at', sa.DateTime(), nullable=True))
    op.add_column('assignments', sa.Column('score', sa.Integer(), nullable=True))
    op.add_column('assignments', sa.Column('completion_time', sa.Integer(), nullable=True))

def downgrade():
    op.drop_column('assignments', 'completion_time')
    op.drop_column('assignments', 'score')
    op.drop_column('assignments', 'completed_at')
    op.drop_column('assignments', 'started_at')