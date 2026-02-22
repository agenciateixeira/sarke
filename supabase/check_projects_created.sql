-- Ver projetos criados automaticamente pelo sistema
SELECT
  p.id,
  p.name,
  p.description,
  p.status,
  p.priority,
  p.deal_id,
  d.title as deal_title,
  c.name as client_name,
  c.razao_social,
  p.created_at
FROM projects p
LEFT JOIN deals d ON d.id = p.deal_id
LEFT JOIN clients c ON c.id = p.client_id
WHERE p.name ILIKE '%Revisar%' OR p.name ILIKE '%Fechamento%'
ORDER BY p.created_at DESC
LIMIT 5;
