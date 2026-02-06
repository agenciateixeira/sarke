import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🔄 Executando migration de configurações da empresa...')

    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260206_empresa_config.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    // Dividir em statements individuais
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executando: ${statement.substring(0, 100)}...`)
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        if (error) {
          console.error('❌ Erro:', error)
        } else {
          console.log('✅ OK')
        }
      }
    }

    console.log('✅ Migration concluída!')
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error)
    process.exit(1)
  }
}

runMigration()
