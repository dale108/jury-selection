"""Initial schema with all tables

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create sessions table
    op.create_table(
        'sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('case_number', sa.String(100), nullable=False),
        sa.Column('case_name', sa.String(500), nullable=False),
        sa.Column('court', sa.String(200), nullable=False),
        sa.Column('status', sa.Enum('pending', 'active', 'paused', 'completed', 'cancelled', name='sessionstatus'), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sessions_case_number'), 'sessions', ['case_number'], unique=False)
    
    # Create jurors table
    op.create_table(
        'jurors',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('seat_number', sa.Integer(), nullable=False),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('occupation', sa.String(200), nullable=True),
        sa.Column('neighborhood', sa.String(200), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('demographics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('flags', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_jurors_session_id'), 'jurors', ['session_id'], unique=False)
    
    # Create speaker_mappings table
    op.create_table(
        'speaker_mappings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('juror_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('speaker_label', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['juror_id'], ['jurors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_speaker_mappings_session_id'), 'speaker_mappings', ['session_id'], unique=False)
    
    # Create audio_recordings table
    op.create_table(
        'audio_recordings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('status', sa.Enum('recording', 'processing', 'completed', 'failed', name='recordingstatus'), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audio_recordings_session_id'), 'audio_recordings', ['session_id'], unique=False)
    
    # Create audio_chunks table
    op.create_table(
        'audio_chunks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recording_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('duration_seconds', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audio_chunks_recording_id'), 'audio_chunks', ['recording_id'], unique=False)
    op.create_index(op.f('ix_audio_chunks_session_id'), 'audio_chunks', ['session_id'], unique=False)
    
    # Create transcript_segments table
    op.create_table(
        'transcript_segments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('audio_recording_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('speaker_label', sa.String(50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('start_time', sa.Float(), nullable=False),
        sa.Column('end_time', sa.Float(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transcript_segments_session_id'), 'transcript_segments', ['session_id'], unique=False)
    op.create_index(op.f('ix_transcript_segments_audio_recording_id'), 'transcript_segments', ['audio_recording_id'], unique=False)
    op.create_index(op.f('ix_transcript_segments_speaker_label'), 'transcript_segments', ['speaker_label'], unique=False)


def downgrade() -> None:
    op.drop_table('transcript_segments')
    op.drop_table('audio_chunks')
    op.drop_table('audio_recordings')
    op.drop_table('speaker_mappings')
    op.drop_table('jurors')
    op.drop_table('sessions')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS sessionstatus')
    op.execute('DROP TYPE IF EXISTS recordingstatus')

