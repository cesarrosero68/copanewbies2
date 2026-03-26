-- Remove duplicate skills_results rows (keep earliest per player+test+attempt)
DELETE FROM skills_results
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY player_id, test_number, attempt_number ORDER BY created_at ASC) as rn
    FROM skills_results
  ) sub
  WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates for timed tests
ALTER TABLE skills_results ADD CONSTRAINT skills_results_unique_attempt UNIQUE (player_id, test_number, attempt_number);