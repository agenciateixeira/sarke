// INSTRUÇÕES: Este arquivo contém apenas as partes atualizadas do CaixaObraView.tsx
// Substitua as seções correspondentes no arquivo original

// =====================================================
// IMPORTS ADICIONAIS (adicionar no topo do arquivo)
// =====================================================
import { Upload, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import {
  isComprovantePendente,
  isPrazoVencido,
  calcularDiasRestantes,
  getStatusComprovanteCor,
} from '@/types/obra-adm-financeiro';

// =====================================================
// ATUALIZAÇÃO: FormularioMovimentacao
// Substituir a função FormularioMovimentacao completa
// =====================================================

function FormularioMovimentacao({ movimentacao, obraId, semanaSelecionada, onSalvar, onCancelar }: FormularioMovimentacaoProps) {
  const [tipoCaixa, setTipoCaixa] = useState<'despesa' | 'receita'>(
    movimentacao ? (isDespesa(movimentacao.valor) ? 'despesa' : 'receita') : 'despesa'
  );

  const [formData, setFormData] = useState<ObraCaixaInput>({
    obra_id: obraId,
    semana: semanaSelecionada,
    data: movimentacao?.data || new Date().toISOString().split('T')[0],
    descricao: movimentacao?.descricao || '',
    empresa: movimentacao?.empresa || '',
    valor: movimentacao ? Math.abs(movimentacao.valor) : 0,
    tipo_recibo: movimentacao?.tipo_recibo || '',
    codigo_recibo: movimentacao?.codigo_recibo || '',
    status: movimentacao?.status || 'PAGO',
    observacoes: movimentacao?.observacoes || '',
    is_marketplace: movimentacao?.is_marketplace || false,
    justificativa_sem_comprovante: movimentacao?.justificativa_sem_comprovante || '',
  });

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mostrarJustificativa, setMostrarJustificativa] = useState(
    !!movimentacao?.justificativa_sem_comprovante
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Arquivo muito grande! Tamanho máximo: 5MB');
        return;
      }

      // Validar tipo
      const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!tiposPermitidos.includes(file.type)) {
        alert('Tipo de arquivo não permitido! Use PDF, JPG ou PNG');
        return;
      }

      setArquivo(file);
    }
  };

  const handleUploadComprovante = async (): Promise<string | null> => {
    if (!arquivo) return null;

    try {
      setUploading(true);

      const fileExt = arquivo.name.split('.').pop();
      const fileName = `${obraId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('comprovantes-caixa')
        .upload(fileName, arquivo);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('comprovantes-caixa')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao enviar comprovante');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação: Se é despesa, precisa ter comprovante OU justificativa
    if (tipoCaixa === 'despesa') {
      const temAnexoExistente = !!movimentacao?.anexo_url;
      const vaiEnviarNovo = !!arquivo;
      const temJustificativa = !!formData.justificativa_sem_comprovante?.trim();

      if (!temAnexoExistente && !vaiEnviarNovo && !temJustificativa) {
        alert('Para despesas, é obrigatório enviar o comprovante OU justificar por que não pode enviar!');
        return;
      }
    }

    // Upload do arquivo se houver
    let anexoUrl = formData.anexo_url;
    if (arquivo) {
      const url = await handleUploadComprovante();
      if (url) {
        anexoUrl = url;
      }
    }

    // Ajustar o sinal do valor baseado no tipo
    const valorFinal = tipoCaixa === 'despesa' ? -Math.abs(formData.valor) : Math.abs(formData.valor);

    onSalvar({
      ...formData,
      valor: valorFinal,
      anexo_url: anexoUrl,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {movimentacao ? 'Editar Movimentação' : 'Nova Movimentação'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Movimentação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Movimentação
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={tipoCaixa === 'despesa'}
                    onChange={() => setTipoCaixa('despesa')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Despesa</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={tipoCaixa === 'receita'}
                    onChange={() => setTipoCaixa('receita')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Receita / Adiantamento</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
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
                rows={2}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empresa / Fornecedor
              </label>
              <input
                type="text"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="ex: SERCOM, SANTA O'DILA, Mercado Livre"
              />
            </div>

            {/* NOVO: Checkbox Marketplace */}
            {tipoCaixa === 'despesa' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.is_marketplace}
                    onChange={(e) => setFormData({ ...formData, is_marketplace: e.target.checked })}
                    className="w-5 h-5 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-blue-900">
                      É compra em Marketplace? (Mercado Livre, Amazon, etc.)
                    </span>
                    <p className="text-xs text-blue-700 mt-1">
                      {formData.is_marketplace
                        ? '✓ Prazo de 5 dias corridos para enviar o comprovante'
                        : 'Prazo padrão de 2 dias corridos para enviar o comprovante'
                      }
                    </p>
                  </div>
                </label>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Recibo
                </label>
                <select
                  value={formData.tipo_recibo}
                  onChange={(e) => setFormData({ ...formData, tipo_recibo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Selecione...</option>
                  <option value="NF">Nota Fiscal</option>
                  <option value="CUPOM">Cupom Fiscal</option>
                  <option value="RECIBO">Recibo</option>
                  <option value="SEM NF">Sem Nota Fiscal</option>
                  <option value="PIX">PIX</option>
                  <option value="TRANSFERÊNCIA">Transferência</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código do Recibo
                </label>
                <input
                  type="text"
                  value={formData.codigo_recibo}
                  onChange={(e) => setFormData({ ...formData, codigo_recibo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Número da NF/Cupom"
                />
              </div>
            </div>

            {/* NOVO: Upload de Comprovante */}
            {tipoCaixa === 'despesa' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      Comprovante de Pagamento {!mostrarJustificativa && <span className="text-red-500">*</span>}
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">
                      Envie o comprovante (NF, cupom fiscal, print, etc.) - Máximo 5MB
                    </p>

                    {movimentacao?.anexo_url && !arquivo && (
                      <div className="flex items-center gap-2 mb-3 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>Comprovante já enviado</span>
                        <a
                          href={movimentacao.anexo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-2"
                        >
                          Ver arquivo
                        </a>
                      </div>
                    )}

                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />

                    {arquivo && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                        <FileText className="w-4 h-4" />
                        <span>{arquivo.name}</span>
                        <span className="text-gray-500">
                          ({(arquivo.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    )}

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setMostrarJustificativa(!mostrarJustificativa)}
                        className="text-sm text-gray-600 hover:text-gray-900 underline"
                      >
                        {mostrarJustificativa
                          ? '← Voltar para envio de comprovante'
                          : 'Não consigo enviar o comprovante agora →'
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOVO: Justificativa (alternativa ao comprovante) */}
            {tipoCaixa === 'despesa' && mostrarJustificativa && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900">
                      Justificativa para não enviar o comprovante <span className="text-red-500">*</span>
                    </h4>
                    <p className="text-xs text-yellow-700 mt-1">
                      Explique o motivo de não poder enviar o comprovante neste momento.
                      Você ainda poderá enviar depois.
                    </p>
                  </div>
                </div>

                <textarea
                  value={formData.justificativa_sem_comprovante}
                  onChange={(e) => setFormData({
                    ...formData,
                    justificativa_sem_comprovante: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                  rows={3}
                  placeholder="Ex: Aguardando fornecedor enviar nota fiscal por email..."
                  required={!arquivo && !movimentacao?.anexo_url}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="PAGO">PAGO</option>
                <option value="PENDENTE">PENDENTE</option>
                <option value="TRANSFERIDO">TRANSFERIDO</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>
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
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Enviando...
                  </>
                ) : (
                  movimentacao ? 'Salvar Alterações' : 'Adicionar Movimentação'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// ATUALIZAÇÃO: Coluna de Comprovante na Tabela
// Adicionar esta coluna na tabela de movimentações
// =====================================================

// Na seção <thead>, adicionar após a coluna "Status":
<th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comprovante</th>

// Na seção <tbody>, adicionar após a célula de status:
<td className="px-3 py-3 text-sm">
  {isDespesa(mov.valor) && (
    <div className="flex items-center gap-2">
      {mov.tem_comprovante ? (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-xs">Enviado</span>
          {mov.anexo_url && (
            <a
              href={mov.anexo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-xs ml-1"
            >
              Ver
            </a>
          )}
        </div>
      ) : mov.justificativa_sem_comprovante ? (
        <div className="flex items-center gap-1 text-yellow-600"
             title={mov.justificativa_sem_comprovante}>
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs">Justificado</span>
        </div>
      ) : isPrazoVencido(mov.prazo_comprovante) ? (
        <div className="flex items-center gap-1 text-red-600 font-semibold animate-pulse">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs">VENCIDO!</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-orange-600">
          <Clock className="w-4 h-4" />
          <span className="text-xs">
            {calcularDiasRestantes(mov.prazo_comprovante)} dias
          </span>
        </div>
      )}
    </div>
  )}
</td>
