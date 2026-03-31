-- Store which proofs were used as source material when generating an evaluation
alter table evaluations add column if not exists source_proof_ids jsonb default null;
