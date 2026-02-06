// =====================================================
// TYPES - CONFIGURAÇÕES DA EMPRESA
// =====================================================

export interface EmpresaConfig {
  id: string
  nome_empresa: string
  cnpj?: string | null
  endereco?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  telefone?: string | null
  email?: string | null
  website?: string | null
  logo_url?: string | null
  created_at: string
  updated_at: string
  updated_by?: string | null
}

export interface EmpresaConfigUpdate {
  nome_empresa?: string
  cnpj?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  telefone?: string
  email?: string
  website?: string
  logo_url?: string
  updated_by?: string
}
