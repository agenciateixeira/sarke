'use client';

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import {
  ObraOrcamentoMaterial,
  ObraOrcamentoMaterialInput,
  ObraOrcamentoResumo,
  formatarMoeda,
  STATUS_PAGAMENTO_LABELS,
  STATUS_OBRA_LABELS,
  getStatusPagamentoCor,
} from '@/types/obra-adm-financeiro';
import { Plus, Pencil, Trash2, Download, Upload, Loader2, X } from 'lucide-react';
import { importarOrcamentoExcel } from '@/lib/orcamentoExcel';
import { importarFinanceiroObra } from '@/lib/importadorFinanceiroObra';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

interface OrcamentoMateriaisViewProps {
  obraId: string;
}

export default function OrcamentoMateriaisView({ obraId }: OrcamentoMateriaisViewProps) {
  const [materiais, setMateriais] = useState<ObraOrcamentoMaterial[]>([]);
  const [resumo, setResumo] = useState<ObraOrcamentoResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editando, setEditando] = useState<ObraOrcamentoMaterial | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Carregar dados
  useEffect(() => {
    carregarDados();
  }, [obraId]);

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Carregar materiais
      const { data: materiaisData, error: materiaisError } = await supabase
        .from('obra_orcamento_materiais')
        .select(`
          *,
          empresa_parceira:empresas_parceiras(id, nome)
        `)
        .eq('obra_id', obraId)
        .order('ordem', { ascending: true });

      if (materiaisError) throw materiaisError;
      setMateriais(materiaisData || []);

      // Carregar resumo
      const { data: resumoData, error: resumoError } = await supabase
        .from('obra_orcamento_resumo')
        .select('*')
        .eq('obra_id', obraId)
        .single();

      if (resumoError && resumoError.code !== 'PGRST116') throw resumoError;
      setResumo(resumoData);

    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (data: ObraOrcamentoMaterialInput) => {
    try {
      if (editando) {
        // Atualizar
        const { error } = await supabase
          .from('obra_orcamento_materiais')
          .update(data)
          .eq('id', editando.id);

        if (error) throw error;
      } else {
        // Inserir
        const { error } = await supabase
          .from('obra_orcamento_materiais')
          .insert([data]);

        if (error) throw error;
      }

      setShowDialog(false);
      setEditando(null);
      carregarDados();
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      alert('Erro ao salvar material');
    }
  };

  const handleExcluir = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from('obra_orcamento_materiais')
        .delete()
        .eq('id', itemToDelete);

      if (error) throw error;
      setItemToDelete(null);
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir material:', error);
    }
  };

  // Funções de seleção em massa
  const toggleSelecionarTodos = () => {
    if (itensSelecionados.size === materiais.length) {
      console.log('[OrcamentoMateriais] Desmarcando todos os itens');
      setItensSelecionados(new Set());
    } else {
      console.log('[OrcamentoMateriais] Marcando todos os', materiais.length, 'itens');
      setItensSelecionados(new Set(materiais.map(m => m.id)));
    }
  };

  const toggleSelecionarItem = (id: string) => {
    const novosItensSelecionados = new Set(itensSelecionados);
    if (novosItensSelecionados.has(id)) {
      console.log('[OrcamentoMateriais] Desmarcando item:', id);
      novosItensSelecionados.delete(id);
    } else {
      console.log('[OrcamentoMateriais] Marcando item:', id);
      novosItensSelecionados.add(id);
    }
    setItensSelecionados(novosItensSelecionados);
  };

  const handleExcluirSelecionados = async () => {
    if (itensSelecionados.size === 0) {
      console.log('[OrcamentoMateriais] Nenhum item selecionado');
      return;
    }

    try {
      console.log('[OrcamentoMateriais] Excluindo itens:', Array.from(itensSelecionados));

      const { error } = await supabase
        .from('obra_orcamento_materiais')
        .delete()
        .in('id', Array.from(itensSelecionados));

      if (error) {
        console.error('[OrcamentoMateriais] Erro ao excluir:', error);
        throw error;
      }

      console.log(`[OrcamentoMateriais] ${itensSelecionados.size} item(ns) excluído(s) com sucesso`);
      toast.success(`${itensSelecionados.size} item(ns) excluído(s) com sucesso!`);
      setItensSelecionados(new Set());
      setShowDeleteDialog(false);
      carregarDados();
    } catch (error: any) {
      console.error('[OrcamentoMateriais] Erro ao excluir materiais:', error);
      toast.error(`Erro ao excluir materiais: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleImportarExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = ''; // Reset input

    try {
      setImporting(true);
      toast.info('Importando Excel...');

      // Usar o novo importador que reconhece múltiplas abas
      const resultado = await importarFinanceiroObra(file);

      // Verificar se tem materiais para importar
      if (resultado.materiais && resultado.materiais.total > 0) {
        const materiaisParaInserir = resultado.materiais.dados.map((mat, index) => ({
          obra_id: obraId,
          local: mat.local || null,
          item: mat.item || `${index + 1}`,
          descricao: mat.descricao,
          quantidade: mat.quantidade || null,
          medida: mat.medida || null,
          valor_total: mat.valor_total || 0,
          valor_pago: mat.valor_pago || 0,
          forma_pagamento: mat.forma_pagamento || null,
          responsavel_sarke: mat.responsavel_sarke || null,
          status_obra: mat.status_obra || 'PENDENTE',
          status_pagamento: mat.status_pagamento || 'A PAGAR',
          observacoes: null,
          ordem: materiais.length + index,
        }));

        const { error } = await supabase
          .from('obra_orcamento_materiais')
          .insert(materiaisParaInserir);

        if (error) throw error;

        toast.success(
          `✅ ${resultado.materiais.total} materiais importados com sucesso!`,
          {
            description: `Valor total: R$ ${resultado.materiais.valor_total.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            })}`
          }
        );
      }

      // Avisar sobre outras abas encontradas
      if (resultado.caixaObra && resultado.caixaObra.total > 0) {
        toast.info(
          `📊 Aba CAIXA DE OBRA detectada!`,
          {
            description: `${resultado.caixaObra.total} movimentos encontrados. Acesse a seção "Caixa da Obra" para importá-los.`,
            duration: 5000
          }
        );
      }

      if (resultado.servicos && resultado.servicos.total > 0) {
        toast.info(
          `🛠️ Aba SERVIÇOS detectada!`,
          {
            description: `${resultado.servicos.total} serviços encontrados.`,
            duration: 5000
          }
        );
      }

      // Mostrar erros se houver
      if (resultado.erros.length > 0) {
        resultado.erros.forEach(erro => {
          toast.error(erro);
        });
      }

      carregarDados();
    } catch (error: any) {
      console.error('Erro ao importar Excel:', error);
      toast.error('Erro ao importar Excel', {
        description: error.message,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleExportarPDF = () => {
    toast.info('Funcionalidade de exportar PDF em desenvolvimento');
    // TODO: Implementar exportação PDF
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      {resumo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">Total Orçado</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {formatarMoeda(resumo.valor_total_orcado)}
            </div>
            <div className="text-xs text-blue-600 mt-1">{resumo.total_itens} itens</div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium">Total Pago</div>
            <div className="text-2xl font-bold text-green-900 mt-1">
              {formatarMoeda(resumo.valor_total_pago)}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {resumo.percentual_pago.toFixed(1)}% do total
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-600 font-medium">Total Restante</div>
            <div className="text-2xl font-bold text-red-900 mt-1">
              {formatarMoeda(resumo.valor_total_restante)}
            </div>
            <div className="text-xs text-red-600 mt-1">{resumo.itens_a_pagar} itens a pagar</div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm text-yellow-600 font-medium">Pagamentos Parciais</div>
            <div className="text-2xl font-bold text-yellow-900 mt-1">
              {resumo.itens_parciais}
            </div>
            <div className="text-xs text-yellow-600 mt-1">itens</div>
          </div>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Orçamento de Materiais</h2>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importar Excel
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleImportarExcel}
              disabled={importing}
            />
          </label>
          <button
            onClick={handleExportarPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Exportar PDF
              </>
            )}
          </button>
          {itensSelecionados.size > 0 && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Selecionados ({itensSelecionados.size})
            </button>
          )}
          <button
            onClick={() => {
              setEditando(null);
              setShowDialog(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Adicionar Item
          </button>
        </div>
      </div>

      {/* Tabela de Materiais */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-center w-12">
                  <Checkbox
                    checked={materiais.length > 0 && itensSelecionados.size === materiais.length}
                    onCheckedChange={toggleSelecionarTodos}
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Local</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qtde</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medida</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Pago</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Restante</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status Obra</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status Pag.</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {materiais.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-3 py-8 text-center text-gray-500">
                    Nenhum item no orçamento. Clique em "Adicionar Item" para começar.
                  </td>
                </tr>
              ) : (
                materiais.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-center">
                      <Checkbox
                        checked={itensSelecionados.has(material.id)}
                        onCheckedChange={() => toggleSelecionarItem(material.id)}
                      />
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">{material.local || '-'}</td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{material.item}</td>
                    <td className="px-3 py-3 text-sm text-gray-900 max-w-xs truncate" title={material.descricao}>
                      {material.descricao}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">{material.quantidade || '-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{material.medida || '-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-900 text-right">
                      {formatarMoeda(material.valor_total)}
                    </td>
                    <td className="px-3 py-3 text-sm text-green-600 text-right">
                      {formatarMoeda(material.valor_pago)}
                    </td>
                    <td className="px-3 py-3 text-sm text-red-600 text-right">
                      {formatarMoeda(material.valor_restante)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">
                      {(material as any).empresa_parceira?.nome || material.responsavel_sarke || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        {material.status_obra || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        material.status_pagamento === 'PAGO' ? 'bg-green-100 text-green-800' :
                        material.status_pagamento === 'A PAGAR' ? 'bg-red-100 text-red-800' :
                        material.status_pagamento === 'PARCIAL' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {material.status_pagamento}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditando(material);
                            setShowDialog(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setItemToDelete(material.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog de Adicionar/Editar */}
      {showDialog && (
        <FormularioMaterial
          material={editando}
          obraId={obraId}
          onSalvar={handleSalvar}
          onCancelar={() => {
            setShowDialog(false);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

// Componente de Formulário
interface FormularioMaterialProps {
  material: ObraOrcamentoMaterial | null;
  obraId: string;
  onSalvar: (data: ObraOrcamentoMaterialInput) => void;
  onCancelar: () => void;
}

function FormularioMaterial({ material, obraId, onSalvar, onCancelar }: FormularioMaterialProps) {
  const [formData, setFormData] = useState<ObraOrcamentoMaterialInput>({
    obra_id: obraId,
    local: material?.local || '',
    item: material?.item || '',
    descricao: material?.descricao || '',
    quantidade: material?.quantidade || 0,
    medida: material?.medida || '',
    valor_total: material?.valor_total || 0,
    valor_pago: material?.valor_pago || 0,
    forma_pagamento: material?.forma_pagamento || '',
    responsavel_sarke: material?.responsavel_sarke || '',
    status_obra: material?.status_obra || 'PENDENTE',
    status_pagamento: material?.status_pagamento || 'A PAGAR',
    observacoes: material?.observacoes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSalvar(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {material ? 'Editar Item' : 'Adicionar Item'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Local
                </label>
                <input
                  type="text"
                  value={formData.local}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="ex: GERAL, LAVABO, COPA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="ex: 1.1, 1.2"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medida
                </label>
                <select
                  value={formData.medida}
                  onChange={(e) => setFormData({ ...formData, medida: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Selecione...</option>
                  <option value="VERBA">VERBA</option>
                  <option value="M²">M²</option>
                  <option value="M³">M³</option>
                  <option value="UNID">UNID</option>
                  <option value="METROS">METROS</option>
                  <option value="KG">KG</option>
                  <option value="LITROS">LITROS</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Total
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor_total}
                  onChange={(e) => setFormData({ ...formData, valor_total: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Pago
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor_pago}
                  onChange={(e) => setFormData({ ...formData, valor_pago: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de Pagamento
              </label>
              <input
                type="text"
                value={formData.forma_pagamento}
                onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="ex: ATO / 30 / 60 / 90 - TODO DIA 19"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsável SARKE
              </label>
              <input
                type="text"
                value={formData.responsavel_sarke}
                onChange={(e) => setFormData({ ...formData, responsavel_sarke: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="ex: GUILHERME"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status da Obra
                </label>
                <select
                  value={formData.status_obra}
                  onChange={(e) => setFormData({ ...formData, status_obra: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="EM ANDAMENTO">EM ANDAMENTO</option>
                  <option value="FINALIZADO">FINALIZADO</option>
                  <option value="PAUSADO">PAUSADO</option>
                  <option value="CANCELADO">CANCELADO</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status de Pagamento
                </label>
                <select
                  value={formData.status_pagamento}
                  onChange={(e) => setFormData({ ...formData, status_pagamento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="A PAGAR">A PAGAR</option>
                  <option value="PAGO">PAGO</option>
                  <option value="PARCIAL">PARCIAL</option>
                  <option value="DESCONTO">DESCONTO</option>
                  <option value="CANCELADO">CANCELADO</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancelar}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {material ? 'Salvar Alterações' : 'Adicionar Item'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(o) => { if (!o) setItemToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item do orçamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Exclusão em Massa */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {itensSelecionados.size} item(ns)?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir os {itensSelecionados.size} itens selecionados? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirSelecionados}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
