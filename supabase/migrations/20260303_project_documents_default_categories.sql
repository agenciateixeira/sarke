-- Trigger para criar categorias de documentos padrão ao criar projeto

CREATE OR REPLACE FUNCTION criar_categorias_documentos_padrao()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir categorias padrão de documentos baseadas nas etapas do projeto
  INSERT INTO project_document_categories (projeto_id, title, description, order_index, stage, created_by)
  VALUES
    -- PLANEJAMENTO (6 categorias)
    (NEW.id, 'Forms', 'Formulários iniciais e documentação', 1, 'planejamento', NEW.created_by),
    (NEW.id, 'Visita e medição', 'Visita técnica ao local e medições', 2, 'planejamento', NEW.created_by),
    (NEW.id, 'As built', 'Levantamento do estado atual', 3, 'planejamento', NEW.created_by),
    (NEW.id, 'Análise', 'Análise técnica e normativa', 4, 'planejamento', NEW.created_by),
    (NEW.id, 'Planejamento', 'Planejamento geral do projeto', 5, 'planejamento', NEW.created_by),
    (NEW.id, 'Entrevista de alinhamento', 'Entrevista inicial com cliente', 6, 'planejamento', NEW.created_by),

    -- PLANTA BAIXA (4 categorias)
    (NEW.id, 'Criação de conceito', 'Desenvolvimento do conceito inicial', 7, 'planta_baixa', NEW.created_by),
    (NEW.id, 'Setorização e estudo de fluxo', 'Definição de setores e fluxos', 8, 'planta_baixa', NEW.created_by),
    (NEW.id, 'Elaboração', 'Elaboração da planta baixa', 9, 'planta_baixa', NEW.created_by),
    (NEW.id, 'Apresentação', 'Apresentação ao cliente', 10, 'planta_baixa', NEW.created_by),

    -- 3D (3 categorias)
    (NEW.id, 'Modelagem', 'Modelagem 3D do projeto', 11, '3d', NEW.created_by),
    (NEW.id, 'Render', 'Renderização de imagens', 12, '3d', NEW.created_by),
    (NEW.id, 'Apresentação', 'Apresentação ou passeio virtual', 13, '3d', NEW.created_by),

    -- EXECUTIVO (2 categorias)
    (NEW.id, 'Caderno executivo', 'Elaboração do caderno executivo', 14, 'executivo', NEW.created_by),
    (NEW.id, 'Caderno final', 'Finalização e entrega do caderno', 15, 'executivo', NEW.created_by);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger apenas para novos projetos (não afeta projetos existentes)
DROP TRIGGER IF EXISTS trigger_criar_categorias_documentos ON projetos;
CREATE TRIGGER trigger_criar_categorias_documentos
  AFTER INSERT ON projetos
  FOR EACH ROW
  EXECUTE FUNCTION criar_categorias_documentos_padrao();
