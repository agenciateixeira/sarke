'use client';

import { useState, useEffect } from 'react';
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
import { Plus, Pencil, Trash2, Download, Upload } from 'lucide-react';

interface OrcamentoMateriaisViewProps {
  obraId: string;
}

export default function OrcamentoMateriaisView({ obraId }: OrcamentoMateriaisViewProps) {
  const [materiais, setMateriais] = useState<ObraOrcamentoMaterial[]>([]);
  const [resumo, setResumo] = useState<ObraOrcamentoResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editando, setEditando] = useState<ObraOrcamentoMaterial | null>(null);

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

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      const { error } = await supabase
        .from('obra_orcamento_materiais')
        .delete()
        .eq('id', id);

      if (error) throw error;
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir material:', error);
      alert('Erro ao excluir material');
    }
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
          <button
            onClick={() => {/* TODO: Implementar importação Excel */}}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" />
            Importar Excel
          </button>
          <button
            onClick={() => {/* TODO: Implementar exportação PDF */}}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
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
                  <td colSpan={12} className="px-3 py-8 text-center text-gray-500">
                    Nenhum item no orçamento. Clique em "Adicionar Item" para começar.
                  </td>
                </tr>
              ) : (
                materiais.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50">
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
                          onClick={() => handleExcluir(material.id)}
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
    </div>
  );
}
