-- Popular categorias de documentos em projetos existentes

-- Inserir categorias para todos os projetos que não têm categorias ainda
INSERT INTO project_document_categories (projeto_id, title, description, order_index, stage, created_by)
SELECT
  p.id as projeto_id,
  cat.title,
  cat.description,
  cat.order_index,
  cat.stage,
  p.created_by
FROM projetos p
CROSS JOIN (
  VALUES
    -- PLANEJAMENTO
    ('Forms', 'Formulários iniciais e documentação', 1, 'planejamento'),
    ('Visita e medição', 'Visita técnica ao local e medições', 2, 'planejamento'),
    ('As built', 'Levantamento do estado atual', 3, 'planejamento'),
    ('Análise', 'Análise técnica e normativa', 4, 'planejamento'),
    ('Planejamento', 'Planejamento geral do projeto', 5, 'planejamento'),
    ('Entrevista de alinhamento', 'Entrevista inicial com cliente', 6, 'planejamento'),

    -- PLANTA BAIXA
    ('Criação de conceito', 'Desenvolvimento do conceito inicial', 7, 'planta_baixa'),
    ('Setorização e estudo de fluxo', 'Definição de setores e fluxos', 8, 'planta_baixa'),
    ('Elaboração', 'Elaboração da planta baixa', 9, 'planta_baixa'),
    ('Apresentação', 'Apresentação ao cliente', 10, 'planta_baixa'),

    -- 3D
    ('Modelagem', 'Modelagem 3D do projeto', 11, '3d'),
    ('Render', 'Renderização de imagens', 12, '3d'),
    ('Apresentação', 'Apresentação ou passeio virtual', 13, '3d'),

    -- EXECUTIVO
    ('Caderno executivo', 'Elaboração do caderno executivo', 14, 'executivo'),
    ('Caderno final', 'Finalização e entrega do caderno', 15, 'executivo')
) AS cat(title, description, order_index, stage)
WHERE NOT EXISTS (
  SELECT 1
  FROM project_document_categories pdc
  WHERE pdc.projeto_id = p.id
);
