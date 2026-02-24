'use client'

import { useState, useEffect } from 'react'
import { PlanoContas } from '@/types/erp'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'

interface PlanoContasSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  tipo?: 'receita' | 'despesa' | 'ativo' | 'passivo' | 'patrimonio'
  apenasLancamento?: boolean // Apenas contas que aceitam lançamento
  placeholder?: string
  disabled?: boolean
}

export function PlanoContasSelector({
  value,
  onValueChange,
  tipo,
  apenasLancamento = true,
  placeholder = 'Selecione uma conta',
  disabled = false,
}: PlanoContasSelectorProps) {
  const [contas, setContas] = useState<PlanoContas[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContas()
  }, [tipo])

  async function loadContas() {
    try {
      setLoading(true)

      let query = supabase
        .from('plano_contas')
        .select('*')
        .eq('ativa', true)
        .order('codigo')

      if (tipo) {
        query = query.eq('tipo', tipo)
      }

      if (apenasLancamento) {
        query = query.eq('aceita_lancamento', true)
      }

      const { data, error } = await query

      if (error) throw error

      setContas(data || [])
    } catch (error) {
      console.error('Erro ao carregar plano de contas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Agrupar contas por nível 1
  const contasPorGrupo = contas.reduce((acc, conta) => {
    const nivel1 = conta.codigo.split('.')[0]
    if (!acc[nivel1]) {
      acc[nivel1] = []
    }
    acc[nivel1].push(conta)
    return acc
  }, {} as Record<string, PlanoContas[]>)

  // Função para formatar o nome com indentação baseado no nível
  const formatarNome = (conta: PlanoContas) => {
    const indent = '  '.repeat(conta.nivel - 1)
    return `${indent}${conta.codigo} - ${conta.nome}`
  }

  // Pegar o nome do grupo (primeiro nível)
  const getNomeGrupo = (codigo: string) => {
    const contaGrupo = contas.find((c) => c.codigo === codigo && c.nivel === 1)
    return contaGrupo?.nome || codigo
  }

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Carregando..." />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.keys(contasPorGrupo).map((grupoKey) => (
          <SelectGroup key={grupoKey}>
            <SelectLabel className="font-semibold text-xs uppercase">
              {getNomeGrupo(grupoKey)}
            </SelectLabel>
            {contasPorGrupo[grupoKey].map((conta) => (
              <SelectItem
                key={conta.id}
                value={conta.id}
                className="font-mono text-xs"
                disabled={!conta.aceita_lancamento}
              >
                {formatarNome(conta)}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
