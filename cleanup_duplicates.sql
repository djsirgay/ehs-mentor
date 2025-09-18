-- Remove duplicate documents keeping only the first occurrence
WITH duplicates AS (
  SELECT doc_id, 
         ROW_NUMBER() OVER (PARTITION BY file_hash ORDER BY doc_id) as rn
  FROM documents 
  WHERE file_hash IS NOT NULL
),
docs_to_delete AS (
  SELECT doc_id FROM duplicates WHERE rn > 1
)
DELETE FROM doc_course_map WHERE doc_id IN (SELECT doc_id FROM docs_to_delete);

WITH duplicates AS (
  SELECT doc_id, 
         ROW_NUMBER() OVER (PARTITION BY file_hash ORDER BY doc_id) as rn
  FROM documents 
  WHERE file_hash IS NOT NULL
),
docs_to_delete AS (
  SELECT doc_id FROM duplicates WHERE rn > 1
)
DELETE FROM documents WHERE doc_id IN (SELECT doc_id FROM docs_to_delete);

-- Show remaining document count
SELECT COUNT(*) as remaining_documents FROM documents;