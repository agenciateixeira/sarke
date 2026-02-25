-- =====================================================
-- FIX DEFINITIVO: Mapeamento CORRETO de obra_orcamento_materiais
-- Execute este SQL no Supabase
-- =====================================================

CREATE OR REPLACE FUNCTION arquivar_obra_no_memorial(
  p_obra_id UUID,
  p_user_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_memorial_id UUID;
  v_cronograma_id UUID;
  v_memorial_cronograma_id UUID;
BEGIN
  -- 1. Inserir obra no memorial
  INSERT INTO memorial_obras (
    obra_original_id, nome, descricao, cliente_id, endereco, cidade, estado, cep,
    area_construida, area_terreno, tipo_obra, valor_contrato,
    data_inicio, data_previsao_termino, data_termino_real, duracao_meses,
    status, progresso_percentual,
    engenheiro_responsavel_id, arquiteto_responsavel_id, fiscal_responsavel_id,
    alvara_numero, alvara_data_emissao, art_rrt_numero,
    observacoes, riscos,
    arquivado_por, motivo_arquivamento,
    created_by, created_at, updated_at
  )
  SELECT
    id, nome, descricao, cliente_id, endereco, cidade, estado, cep,
    area_construida, area_terreno, tipo_obra, valor_contrato,
    data_inicio, data_previsao_termino, data_termino_real, duracao_meses,
    status, progresso_percentual,
    engenheiro_responsavel_id, arquiteto_responsavel_id, fiscal_responsavel_id,
    alvara_numero, alvara_data_emissao, art_rrt_numero,
    observacoes, riscos,
    p_user_id, p_motivo,
    created_by, created_at, updated_at
  FROM obras
  WHERE id = p_obra_id
  RETURNING id INTO v_memorial_id;

  -- 2. Mover fotos
  IF EXISTS (SELECT 1 FROM obra_fotos WHERE obra_id = p_obra_id LIMIT 1) THEN
    INSERT INTO memorial_obra_fotos (
      memorial_obra_id, foto_original_id, titulo, descricao, url, tipo,
      data_foto, latitude, longitude, uploaded_by, created_at
    )
    SELECT
      v_memorial_id, id, titulo, descricao, url, tipo,
      data_foto, latitude, longitude, uploaded_by, created_at
    FROM obra_fotos
    WHERE obra_id = p_obra_id;

    DELETE FROM obra_fotos WHERE obra_id = p_obra_id;
  END IF;

  -- 3. Mover documentos
  IF EXISTS (SELECT 1 FROM obra_documentos WHERE obra_id = p_obra_id LIMIT 1) THEN
    INSERT INTO memorial_obra_documentos (
      memorial_obra_id, documento_original_id, titulo, descricao, tipo, url,
      tamanho_bytes, mime_type, uploaded_by, created_at
    )
    SELECT
      v_memorial_id, id, titulo, descricao, tipo, url,
      tamanho_bytes, mime_type, uploaded_by, created_at
    FROM obra_documentos
    WHERE obra_id = p_obra_id;

    DELETE FROM obra_documentos WHERE obra_id = p_obra_id;
  END IF;

  -- 4. Mover cronograma
  SELECT id INTO v_cronograma_id FROM cronograma_obras WHERE obra_id = p_obra_id LIMIT 1;

  IF v_cronograma_id IS NOT NULL THEN
    INSERT INTO memorial_cronograma_obras (
      memorial_obra_id, cronograma_original_id, nome, descricao,
      data_inicio, data_fim_prevista, data_fim_real, status, progresso_percentual,
      created_at, updated_at, created_by
    )
    SELECT
      v_memorial_id, id, nome, descricao,
      data_inicio, data_fim_prevista, data_fim_real, status, progresso_percentual,
      created_at, updated_at, created_by
    FROM cronograma_obras
    WHERE id = v_cronograma_id
    RETURNING id INTO v_memorial_cronograma_id;

    -- 4.1. Mover atividades do cronograma
    IF EXISTS (SELECT 1 FROM cronograma_obra_atividades WHERE cronograma_id = v_cronograma_id LIMIT 1) THEN
      INSERT INTO memorial_cronograma_atividades (
        memorial_cronograma_id, atividade_original_id, mes, dia_semana, data_prevista,
        descricao_servico, observacao, empresa_parceira_id, status,
        data_inicio_real, data_conclusao_real, rdo_id, ordem, prioridade,
        created_at, updated_at, created_by
      )
      SELECT
        v_memorial_cronograma_id, id, mes, dia_semana, data_prevista,
        descricao_servico, observacao, empresa_parceira_id, status,
        data_inicio_real, data_conclusao_real, rdo_id, ordem, prioridade,
        created_at, updated_at, created_by
      FROM cronograma_obra_atividades
      WHERE cronograma_id = v_cronograma_id;

      DELETE FROM cronograma_obra_atividades WHERE cronograma_id = v_cronograma_id;
    END IF;

    DELETE FROM cronograma_obras WHERE id = v_cronograma_id;
  END IF;

  -- 5. Mover RDOs
  IF EXISTS (SELECT 1 FROM rdos WHERE obra_id = p_obra_id LIMIT 1) THEN
    INSERT INTO memorial_rdos (
      memorial_obra_id, rdo_original_id, data, clima, responsavel_id,
      atividades, materiais, equipamentos, mao_de_obra, observacoes, fotos,
      created_at, updated_at
    )
    SELECT
      v_memorial_id,
      id,
      data_relatorio,
      CASE
        WHEN clima_manha_tempo IS NOT NULL AND clima_noite_tempo IS NOT NULL
        THEN clima_manha_tempo || ' / ' || clima_noite_tempo
        WHEN clima_manha_tempo IS NOT NULL THEN clima_manha_tempo
        WHEN clima_noite_tempo IS NOT NULL THEN clima_noite_tempo
        ELSE 'Não informado'
      END,
      created_by,
      '', '', '', '',
      CASE WHEN observacoes_gerais IS NULL THEN '' ELSE observacoes_gerais END,
      NULL,
      created_at,
      updated_at
    FROM rdos
    WHERE obra_id = p_obra_id;

    DELETE FROM rdos WHERE obra_id = p_obra_id;
  END IF;

  -- 6. Mover caixa de obra
  IF EXISTS (SELECT 1 FROM obra_caixa WHERE obra_id = p_obra_id LIMIT 1) THEN
    INSERT INTO memorial_caixa_obra (
      memorial_obra_id, movimentacao_original_id, tipo, categoria, descricao,
      valor, data, forma_pagamento, comprovante_url,
      created_at
    )
    SELECT
      v_memorial_id,
      id,
      CASE WHEN valor < 0 THEN 'saida' ELSE 'entrada' END,
      CASE WHEN categoria IS NULL THEN 'Não informado' ELSE categoria END,
      descricao,
      ABS(valor),
      data,
      tipo_recibo,
      anexo_url,
      created_at
    FROM obra_caixa
    WHERE obra_id = p_obra_id;

    DELETE FROM obra_caixa WHERE obra_id = p_obra_id;
  END IF;

  -- 7. Mover orçamento de materiais (MAPEAMENTO CORRETO)
  IF EXISTS (SELECT 1 FROM obra_orcamento_materiais WHERE obra_id = p_obra_id LIMIT 1) THEN
    INSERT INTO memorial_orcamento_materiais (
      memorial_obra_id, material_original_id, categoria, item, descricao,
      unidade, quantidade, valor_unitario, valor_total, fornecedor, observacoes,
      created_at, updated_at
    )
    SELECT
      v_memorial_id,
      om.id,
      COALESCE(om.local, 'GERAL'),                    -- local → categoria
      om.item,
      om.descricao,
      COALESCE(om.medida, 'UNID'),                    -- medida → unidade
      om.quantidade,
      0,                                               -- não existe valor_unitario
      COALESCE(om.valor_total, 0),
      '',                                              -- não existe fornecedor
      om.observacoes,
      NOW(),                                           -- não existe created_at
      NOW()                                            -- não existe updated_at
    FROM obra_orcamento_materiais om
    WHERE om.obra_id = p_obra_id;

    DELETE FROM obra_orcamento_materiais WHERE obra_id = p_obra_id;
  END IF;

  -- 8. Registrar empresas parceiras
  IF EXISTS (
    SELECT 1
    FROM obra_empresas oe
    WHERE oe.obra_id = p_obra_id
    LIMIT 1
  ) THEN
    INSERT INTO memorial_obra_empresas (
      memorial_obra_id, empresa_parceira_id, empresa_nome, empresa_cnpj,
      tipo_servico, data_inicio, data_fim, valor_contrato, status, created_at
    )
    SELECT
      v_memorial_id,
      ep.id,
      ep.nome,
      ep.cnpj,
      oe.servico_executado,
      oe.data_inicio,
      oe.data_termino,
      oe.valor_contratado,
      oe.status,
      oe.created_at
    FROM obra_empresas oe
    JOIN empresas_parceiras ep ON ep.id = oe.empresa_id
    WHERE oe.obra_id = p_obra_id;

    DELETE FROM obra_empresas WHERE obra_id = p_obra_id;
  END IF;

  -- 9. Registrar no histórico
  INSERT INTO memorial_historico (memorial_obra_id, acao, realizado_por, motivo)
  VALUES (v_memorial_id, 'arquivado', p_user_id, p_motivo);

  -- 10. Deletar obra original
  DELETE FROM obras WHERE id = p_obra_id;

  RETURN v_memorial_id;
END;
$$;
