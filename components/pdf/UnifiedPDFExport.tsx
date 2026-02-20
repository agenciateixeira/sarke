'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  FileText,
  DollarSign,
  Building,
  FileSpreadsheet,
  Image as ImageIcon,
  Download,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface UnifiedPDFExportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  obraId: string
  obraNome: string
  // Opcional: RDO específico para exportar
  rdoId?: string
  // Callbacks para buscar dados
  onExport: (sections: string[]) => Promise<void>
}

interface Section {
  id: string
  label: string
  description: string
  icon: React.ElementType
  enabled: boolean
}

export function UnifiedPDFExport({
  open,
  onOpenChange,
  obraId,
  obraNome,
  rdoId,
  onExport,
}: UnifiedPDFExportProps) {
  const [loading, setLoading] = useState(false)
  const [sections, setSections] = useState<Section[]>([
    {
      id: 'rdo',
      label: 'RDO - Relatório Diário de Obra',
      description: rdoId
        ? 'Incluir este RDO no documento'
        : 'Incluir todos os RDOs da obra',
      icon: FileText,
      enabled: true,
    },
    {
      id: 'financeiro',
      label: 'Financeiro - Caixa de Obra',
      description: 'Movimentações financeiras e totalizadores',
      icon: DollarSign,
      enabled: false,
    },
    {
      id: 'orcamento',
      label: 'Financeiro - Orçamento de Materiais',
      description: 'Orçamento detalhado de materiais e serviços',
      icon: FileSpreadsheet,
      enabled: false,
    },
    {
      id: 'cronograma',
      label: 'Cronograma de Obra',
      description: 'Atividades, datas e progresso',
      icon: Building,
      enabled: false,
    },
    {
      id: 'fotos',
      label: 'Fotos da Obra',
      description: 'Galeria completa de fotos',
      icon: ImageIcon,
      enabled: false,
    },
  ])

  function toggleSection(sectionId: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, enabled: !s.enabled } : s))
    )
  }

  async function handleExport() {
    const selectedSections = sections.filter((s) => s.enabled).map((s) => s.id)

    if (selectedSections.length === 0) {
      toast.error('Selecione ao menos uma seção para exportar')
      return
    }

    try {
      setLoading(true)
      toast.info('Gerando documento unificado...')

      await onExport(selectedSections)

      toast.success('Documento gerado com sucesso!')
      onOpenChange(false)
    } catch (error: any) {
      console.error('Erro ao gerar documento:', error)
      toast.error('Erro ao gerar documento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Documento Unificado
          </DialogTitle>
          <DialogDescription>
            Selecione as seções que deseja incluir no documento PDF final
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Obra:</span> {obraNome}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <p className="text-sm font-medium">Seções disponíveis:</p>

          <div className="space-y-3">
            {sections.map((section) => {
              const Icon = section.icon

              return (
                <div
                  key={section.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={section.id}
                    checked={section.enabled}
                    onCheckedChange={() => toggleSection(section.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={section.id}
                      className="flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{section.label}</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        <div className="bg-muted/30 p-3 rounded-lg text-sm">
          <p className="font-medium mb-1">Informações:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>As seções serão organizadas na ordem selecionada</li>
            <li>Cada seção começará em uma nova página</li>
            <li>O documento incluirá índice e numeração de páginas</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
