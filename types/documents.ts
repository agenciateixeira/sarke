// Tipos para sistema de documentos do projeto

export interface ProjectDocumentCategory {
  id: string
  projeto_id: string

  // Informações básicas
  title: string
  description?: string

  // Ordenação e agrupamento
  order_index: number
  stage: 'planejamento' | 'planta_baixa' | '3d' | 'executivo' | 'outros'

  // Metadados
  created_at: string
  updated_at: string
  created_by?: string
}

export interface ProjectDocumentFile {
  id: string
  category_id: string
  projeto_id: string

  // Informações do arquivo
  file_name: string
  file_path: string // Caminho no Supabase Storage
  file_size: number
  file_type: string // MIME type

  // Metadados
  description?: string
  uploaded_at: string
  uploaded_by?: string

  // Controle de versão
  version: number
}

export interface ProjectDocumentCategoryWithFiles extends ProjectDocumentCategory {
  files: ProjectDocumentFile[]
  file_count: number
}
