-- Add description (význam) column to proof_types
alter table proof_types add column if not exists description text not null default '';
