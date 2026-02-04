const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Executando migration de Obras...')

    const migrationPath = path.join(__dirname, '../supabase/migrations/20260203_obras.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')

    // Dividir por statements (comandos separados por ;)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📝 Executando ${statements.length} statements...`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          console.error(`❌ Erro no statement ${i + 1}:`, error.message)
        } else {
          console.log(`✅ Statement ${i + 1}/${statements.length} executado`)
        }
      } catch (err) {
        console.error(`❌ Erro ao executar statement ${i + 1}:`, err.message)
      }
    }

    console.log('✅ Migration concluída!')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

runMigration()
