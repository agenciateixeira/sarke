-- =====================================================
-- FIX: Permitir Colaboradores Criarem Projetos
-- =====================================================
-- Data: 23/02/2026
-- Descrição: Ajusta as políticas RLS para permitir que
-- colaboradores também possam criar e gerenciar projetos
-- =====================================================

-- 1. Remover política antiga que permite apenas admins e gerentes
DROP POLICY IF EXISTS "Admins e gerentes podem gerenciar projetos" ON projetos;

-- 2. Criar nova política que permite admins, gerentes E colaboradores
CREATE POLICY "Admins, gerentes e colaboradores podem gerenciar projetos"
  ON projetos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente', 'colaborador')
    )
  );

-- 3. Atualizar políticas das tabelas relacionadas
DROP POLICY IF EXISTS "Admins e gerentes podem gerenciar planejamento" ON projeto_planejamento;
CREATE POLICY "Admins, gerentes e colaboradores podem gerenciar planejamento"
  ON projeto_planejamento FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "Admins e gerentes podem gerenciar planta baixa" ON projeto_planta_baixa;
CREATE POLICY "Admins, gerentes e colaboradores podem gerenciar planta baixa"
  ON projeto_planta_baixa FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "Admins e gerentes podem gerenciar 3D" ON projeto_3d;
CREATE POLICY "Admins, gerentes e colaboradores podem gerenciar 3D"
  ON projeto_3d FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "Admins e gerentes podem gerenciar executivo" ON projeto_executivo;
CREATE POLICY "Admins, gerentes e colaboradores podem gerenciar executivo"
  ON projeto_executivo FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "Admins e gerentes podem gerenciar arquivos" ON projeto_arquivos;
CREATE POLICY "Admins, gerentes e colaboradores podem gerenciar arquivos"
  ON projeto_arquivos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente', 'colaborador')
    )
  );

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON POLICY "Admins, gerentes e colaboradores podem gerenciar projetos" ON projetos IS
  'Permite que admins, gerentes e colaboradores criem e gerenciem projetos';
