-- =============================================
-- Fix: DELETE policies faltando em tabelas de obra
-- Todas as tabelas abaixo têm RLS habilitado mas
-- não tinham policy de DELETE, causando falha silenciosa.
-- =============================================

-- =============================================
-- 1. TABELAS PRINCIPAIS DE OBRA (20260203_obras.sql)
-- =============================================

CREATE POLICY "Usuarios autenticados podem excluir obras"
  ON obras FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir fotos de obra"
  ON obra_fotos FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir documentos de obra"
  ON obra_documentos FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir medicoes"
  ON obra_medicoes FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir etapas"
  ON obra_etapas FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir rdo legado"
  ON obra_rdo FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- 2. TABELAS DE RDO (20260205_rdo.sql)
-- =============================================

CREATE POLICY "Usuarios autenticados podem excluir rdos"
  ON rdos FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir rdo_mao_obra"
  ON rdo_mao_obra FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir rdo_atividades"
  ON rdo_atividades FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir rdo_fotos"
  ON rdo_fotos FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir rdo_equipamentos"
  ON rdo_equipamentos FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir rdo_materiais"
  ON rdo_materiais FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir rdo_ocorrencias"
  ON rdo_ocorrencias FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- 3. OBRA EMPRESAS (20260204_obra_empresas_historico.sql)
-- =============================================

CREATE POLICY "Usuarios autenticados podem excluir obra_empresas"
  ON obra_empresas FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- 4. CRONOGRAMA DE OBRAS (20260206_cronograma_obras.sql)
-- =============================================

CREATE POLICY "Usuarios autenticados podem excluir cronograma_obras"
  ON cronograma_obras FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir cronograma_obra_atividades"
  ON cronograma_obra_atividades FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir cronograma_obra_materiais"
  ON cronograma_obra_materiais FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir cronograma_obra_templates"
  ON cronograma_obra_templates FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir cronograma_obra_notificacoes"
  ON cronograma_obra_notificacoes FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem excluir cronograma_obra_historico"
  ON cronograma_obra_historico FOR DELETE
  TO authenticated
  USING (true);
