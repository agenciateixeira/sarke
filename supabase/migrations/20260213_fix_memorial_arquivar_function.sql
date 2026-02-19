-- =====================================================
-- FIX: Corrige função arquivar_obra_no_memorial
-- Problema: conflito com palavra-chave "data"
-- =====================================================

CREATE OR REPLACE FUNCTION arquivar_obra_no_memorial(
  p_obra_id UUID,
  p_user_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS UUID AS $$
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
    o.id, o.nome, o.descricao, o.cliente_id, o.endereco, o.cidade, o.estado, o.cep,
    o.area_construida, o.area_terreno, o.tipo_obra, o.valor_contrato,
    o.data_inicio, o.data_previsao_termino, o.data_termino_real, o.duracao_meses,
    o.status, o.progresso_percentual,
    o.engenheiro_responsavel_id, o.arquiteto_responsavel_id, o.fiscal_responsavel_id,
    o.alvara_numero, o.alvara_data_emissao, o.art_rrt_numero,
    o.observacoes, o.riscos,
    p_user_id, p_motivo,
    o.created_by, o.created_at, o.updated_at
  FROM obras o
  WHERE o.id = p_obra_id
  RETURNING id INTO v_memorial_id;

  -- 2. Mover fotos
  INSERT INTO memorial_obra_fotos (
    memorial_obra_id, foto_original_id, titulo, descricao, url, tipo,
    data_foto, latitude, longitude, uploaded_by, created_at
  )
  SELECT
    v_memorial_id, f.id, f.titulo, f.descricao, f.url, f.tipo,
    f.data_foto, f.latitude, f.longitude, f.uploaded_by, f.created_at
  FROM obra_fotos f
  WHERE f.obra_id = p_obra_id;

  DELETE FROM obra_fotos WHERE obra_id = p_obra_id;

  -- 3. Mover documentos
  INSERT INTO memorial_obra_documentos (
    memorial_obra_id, documento_original_id, titulo, descricao, tipo, url,
    tamanho_bytes, mime_type, uploaded_by, created_at
  )
  SELECT
    v_memorial_id, d.id, d.titulo, d.descricao, d.tipo, d.url,
    d.tamanho_bytes, d.mime_type, d.uploaded_by, d.created_at
  FROM obra_documentos d
  WHERE d.obra_id = p_obra_id;

  DELETE FROM obra_documentos WHERE obra_id = p_obra_id;

  -- 4. Mover cronograma
  SELECT id INTO v_cronograma_id FROM cronograma_obras WHERE obra_id = p_obra_id;

  IF v_cronograma_id IS NOT NULL THEN
    INSERT INTO memorial_cronograma_obras (
      memorial_obra_id, cronograma_original_id, nome, descricao,
      data_inicio, data_fim_prevista, data_fim_real, status, progresso_percentual,
      created_at, updated_at, created_by
    )
    SELECT
      v_memorial_id, c.id, c.nome, c.descricao,
      c.data_inicio, c.data_fim_prevista, c.data_fim_real, c.status, c.progresso_percentual,
      c.created_at, c.updated_at, c.created_by
    FROM cronograma_obras c
    WHERE c.id = v_cronograma_id
    RETURNING id INTO v_memorial_cronograma_id;

    -- 4.1. Mover atividades do cronograma
    INSERT INTO memorial_cronograma_atividades (
      memorial_cronograma_id, atividade_original_id, mes, dia_semana, data_prevista,
      descricao_servico, observacao, empresa_parceira_id, status,
      data_inicio_real, data_conclusao_real, rdo_id, ordem, prioridade,
      created_at, updated_at, created_by
    )
    SELECT
      v_memorial_cronograma_id, a.id, a.mes, a.dia_semana, a.data_prevista,
      a.descricao_servico, a.observacao, a.empresa_parceira_id, a.status,
      a.data_inicio_real, a.data_conclusao_real, a.rdo_id, a.ordem, a.prioridade,
      a.created_at, a.updated_at, a.created_by
    FROM cronograma_obra_atividades a
    WHERE a.cronograma_id = v_cronograma_id;

    DELETE FROM cronograma_obra_atividades WHERE cronograma_id = v_cronograma_id;
    DELETE FROM cronograma_obras WHERE id = v_cronograma_id;
  END IF;

  -- 5. Mover RDOs
  INSERT INTO memorial_rdos (
    memorial_obra_id, rdo_original_id, data, clima, responsavel_id,
    atividades, materiais, equipamentos, mao_de_obra, observacoes, fotos,
    created_at, updated_at
  )
  SELECT
    v_memorial_id, r.id, r.data_relatorio,
    COALESCE(r.clima_manha_tempo, 'claro'),
    NULL as responsavel_id,
    r.observacoes_gerais,
    NULL as materiais,
    NULL as equipamentos,
    NULL as mao_de_obra,
    r.observacoes_gerais,
    NULL as fotos,
    r.created_at, r.updated_at
  FROM rdos r
  WHERE r.obra_id = p_obra_id;

  DELETE FROM rdos WHERE obra_id = p_obra_id;

  -- 6. Mover caixa de obra
  INSERT INTO memorial_caixa_obra (
    memorial_obra_id, movimentacao_original_id, tipo, categoria, descricao,
    valor, data, forma_pagamento, comprovante_url, empresa_parceira_id,
    created_by, created_at
  )
  SELECT
    v_memorial_id, cx.id, cx.tipo, cx.categoria, cx.descricao,
    cx.valor, cx.data, cx.forma_pagamento, cx.comprovante_url, cx.empresa_parceira_id,
    cx.created_by, cx.created_at
  FROM caixa_obra cx
  WHERE cx.obra_id = p_obra_id;

  DELETE FROM caixa_obra WHERE obra_id = p_obra_id;

  -- 7. Mover orçamento de materiais
  INSERT INTO memorial_orcamento_materiais (
    memorial_obra_id, material_original_id, categoria, item, descricao,
    unidade, quantidade, valor_unitario, valor_total, fornecedor, observacoes,
    created_at, updated_at
  )
  SELECT
    v_memorial_id, m.id, m.categoria, m.item, m.descricao,
    m.unidade, m.quantidade, m.valor_unitario, m.valor_total, m.fornecedor, m.observacoes,
    m.created_at, m.updated_at
  FROM orcamento_materiais m
  WHERE m.obra_id = p_obra_id;

  DELETE FROM orcamento_materiais WHERE obra_id = p_obra_id;

  -- 8. Registrar empresas parceiras (snapshot)
  INSERT INTO memorial_obra_empresas (
    memorial_obra_id, empresa_parceira_id, empresa_nome, empresa_cnpj,
    tipo_servico, data_inicio, data_fim, valor_contrato, status, created_at
  )
  SELECT
    v_memorial_id, ep.id, ep.nome, ep.cnpj,
    oeh.tipo_servico, oeh.data_inicio, oeh.data_fim, oeh.valor_contrato,
    oeh.status, oeh.created_at
  FROM obra_empresas_historico oeh
  JOIN empresas_parceiras ep ON ep.id = oeh.empresa_id
  WHERE oeh.obra_id = p_obra_id;

  DELETE FROM obra_empresas_historico WHERE obra_id = p_obra_id;

  -- 9. Registrar no histórico
  INSERT INTO memorial_historico (memorial_obra_id, acao, realizado_por, motivo)
  VALUES (v_memorial_id, 'arquivado', p_user_id, p_motivo);

  -- 10. Deletar obra original
  DELETE FROM obras WHERE id = p_obra_id;

  RETURN v_memorial_id;
END;
$$ LANGUAGE plpgsql;
