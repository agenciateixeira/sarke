// Script de teste para diagnosticar o erro nos relatórios
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarRelatorios() {
  console.log('🔍 Testando funções de relatórios...\n')

  // Testar gerar_dre
  console.log('1️⃣ Testando gerar_dre...')
  const { data: dreData, error: dreError } = await supabase.rpc('gerar_dre', {
    p_data_inicio: '2024-01-01',
    p_data_fim: '2024-12-31',
  })

  if (dreError) {
    console.error('❌ Erro em gerar_dre:')
    console.error('   Código:', dreError.code)
    console.error('   Mensagem:', dreError.message)
    console.error('   Detalhes:', dreError.details)
    console.error('   Hint:', dreError.hint)
    console.error('   Objeto completo:', JSON.stringify(dreError, null, 2))
  } else {
    console.log('✅ gerar_dre funcionou!')
    console.log('   Dados:', dreData)
  }

  // Testar rentabilidade_por_cliente
  console.log('\n2️⃣ Testando rentabilidade_por_cliente...')
  const { data: rentData, error: rentError } = await supabase.rpc(
    'rentabilidade_por_cliente',
    {
      p_data_inicio: '2024-01-01',
      p_data_fim: '2024-12-31',
      p_limite: 10,
    }
  )

  if (rentError) {
    console.error('❌ Erro em rentabilidade_por_cliente:')
    console.error('   Código:', rentError.code)
    console.error('   Mensagem:', rentError.message)
    console.error('   Detalhes:', rentError.details)
  } else {
    console.log('✅ rentabilidade_por_cliente funcionou!')
    console.log('   Dados:', rentData)
  }

  // Testar evolucao_mensal
  console.log('\n3️⃣ Testando evolucao_mensal...')
  const { data: evolData, error: evolError } = await supabase.rpc('evolucao_mensal', {
    p_meses: 6,
  })

  if (evolError) {
    console.error('❌ Erro em evolucao_mensal:')
    console.error('   Código:', evolError.code)
    console.error('   Mensagem:', evolError.message)
    console.error('   Detalhes:', evolError.details)
  } else {
    console.log('✅ evolucao_mensal funcionou!')
    console.log('   Dados:', evolData)
  }

  // Verificar se as funções existem
  console.log('\n4️⃣ Verificando se as funções existem no banco...')
  const { data: functions, error: funcError } = await supabase
    .from('pg_proc')
    .select('proname')
    .in('proname', [
      'gerar_dre',
      'rentabilidade_por_cliente',
      'rentabilidade_por_projeto',
      'evolucao_mensal',
      'fluxo_caixa_realizado',
    ])

  if (funcError) {
    console.error('❌ Erro ao verificar funções:', funcError)
  } else {
    console.log('✅ Funções encontradas:', functions)
  }
}

testarRelatorios().catch(console.error)
