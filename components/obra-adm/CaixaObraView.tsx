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
  ObraCaixa,
  ObraCaixaInput,
  ObraCaixaSemana,
  ObraCaixaSemanaInput,
  ObraCaixaResumoSemana,
  formatarMoeda,
  STATUS_CAIXA_LABELS,
  TIPO_RECIBO_LABELS,
  isDespesa,
  isReceita,
  isComprovantePendente,
  isPrazoVencido,
  calcularDiasRestantes,
  getStatusComprovanteCor,
} from '@/types/obra-adm-financeiro';
import { Plus, Pencil, Trash2, Download, Calendar, DollarSign, TrendingUp, TrendingDown, Upload, FileText, AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { importarCaixaExcel, detectarSemanasExcel, SemanaDetectada } from '@/lib/caixaExcel';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface CaixaObraViewProps {
  obraId: string;
}

export default function CaixaObraView({ obraId }: CaixaObraViewProps) {
  const [semanas, setSemanas] = useState<ObraCaixaSemana[]>([]);
  const [semanaSelecionada, setSemanaSelecionada] = useState<string>('');
  const [movimentacoes, setMovimentacoes] = useState<ObraCaixa[]>([]);
  const [resumoSemana, setResumoSemana] = useState<ObraCaixaResumoSemana | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialogMovimentacao, setShowDialogMovimentacao] = useState(false);
  const [showDialogSemana, setShowDialogSemana] = useState(false);
  const [editandoMovimentacao, setEditandoMovimentacao] = useState<ObraCaixa | null>(null);
  const [movToDelete, setMovToDelete] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [semanaDetectada, setSemanaDetectada] = useState<SemanaDetectada[] | null>(null);
  const [showDialogImport, setShowDialogImport] = useState(false);
  const [semanasParaImportar, setSemanasParaImportar] = useState<string[]>([]);
  const [semanaToDelete, setSemanaToDelete] = useState<string | null>(null);

  // Carregar semanas
  useEffect(() => {
    carregarSemanas();
  }, [obraId]);

  // Carregar movimentações quando seleciona uma semana
  useEffect(() => {
    if (semanaSelecionada) {
      carregarMovimentacoes();
    }
  }, [semanaSelecionada]);

  const carregarSemanas = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('obra_caixa_semanas')
        .select('*')
        .eq('obra_id', obraId)
        .order('numero_semana', { ascending: false });

      if (error) throw error;
      setSemanas(data || []);

      // Selecionar primeira semana automaticamente
      if (data && data.length > 0 && !semanaSelecionada) {
        setSemanaSelecionada(data[0].nome);
      }

    } catch (error) {
      console.error('Erro ao carregar semanas:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarMovimentacoes = async () => {
    try {
      // Carregar movimentações
      const { data: movData, error: movError } = await supabase
        .from('obra_caixa')
        .select('*')
        .eq('obra_id', obraId)
        .eq('semana', semanaSelecionada)
        .order('data', { ascending: true });

      if (movError) throw movError;
      setMovimentacoes(movData || []);

      // Carregar resumo
      const { data: resumoData, error: resumoError } = await supabase
        .from('obra_caixa_resumo_semana')
        .select('*')
        .eq('obra_id', obraId)
        .eq('semana', semanaSelecionada)
        .single();

      if (resumoError && resumoError.code !== 'PGRST116') throw resumoError;
      setResumoSemana(resumoData);

    } catch (error) {
      console.error('Erro ao carregar movimentações:', error);
    }
  };

  const handleCriarSemana = async (data: ObraCaixaSemanaInput) => {
    try {
      const { error } = await supabase
        .from('obra_caixa_semanas')
        .insert([data]);

      if (error) throw error;

      setShowDialogSemana(false);
      carregarSemanas();
    } catch (error) {
      console.error('Erro ao criar semana:', error);
      alert('Erro ao criar semana');
    }
  };

  const handleSalvarMovimentacao = async (data: ObraCaixaInput) => {
    try {
      if (editandoMovimentacao) {
        // Atualizar
        const { error } = await supabase
          .from('obra_caixa')
          .update(data)
          .eq('id', editandoMovimentacao.id);

        if (error) throw error;
      } else {
        // Inserir
        const { error } = await supabase
          .from('obra_caixa')
          .insert([{ ...data, semana: semanaSelecionada }]);

        if (error) throw error;
      }

      setShowDialogMovimentacao(false);
      setEditandoMovimentacao(null);
      carregarMovimentacoes();
      carregarSemanas(); // Atualizar totais da semana
    } catch (error) {
      console.error('Erro ao salvar movimentação:', error);
      alert('Erro ao salvar movimentação');
    }
  };

  const handleExcluirMovimentacao = async () => {
    if (!movToDelete) return;

    try {
      const { error } = await supabase
        .from('obra_caixa')
        .delete()
        .eq('id', movToDelete);

      if (error) throw error;
      setMovToDelete(null);
      carregarMovimentacoes();
      carregarSemanas();
    } catch (error) {
      console.error('Erro ao excluir movimentação:', error);
    }
  };

  const handleExcluirSemana = async () => {
    if (!semanaToDelete) return;

    try {
      // Excluir todas as movimentações da semana
      const { error: errorMov } = await supabase
        .from('obra_caixa')
        .delete()
        .eq('obra_id', obraId)
        .eq('semana', semanaToDelete);

      if (errorMov) throw errorMov;

      // Excluir a semana
      const { error: errorSemana } = await supabase
        .from('obra_caixa_semanas')
        .delete()
        .eq('obra_id', obraId)
        .eq('nome', semanaToDelete);

      if (errorSemana) throw errorSemana;

      toast.success('Semana excluída com sucesso!');
      setSemanaToDelete(null);
      setSemanaSelecionada('');
      carregarSemanas();
    } catch (error) {
      console.error('Erro ao excluir semana:', error);
      toast.error('Erro ao excluir semana');
    }
  };

  const handleImportarExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = ''; // Reset input

    try {
      setImporting(true);
      toast.info('Analisando Excel...');

      // Detectar semanas no arquivo
      const semanasDetectadas = await detectarSemanasExcel(file);

      setSemanaDetectada(semanasDetectadas);
      setSemanasParaImportar(semanasDetectadas.map(s => s.nome));
      setShowDialogImport(true);

      toast.success(`${semanasDetectadas.length} semana(s) detectada(s) no arquivo!`);
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao importar Excel', {
        description: error.message,
      });
    } finally {
      setImporting(false);
    }
  };

  const confirmarImportacao = async () => {
    if (!semanaDetectada) return;

    try {
      setImporting(true);
      toast.info('Importando semanas selecionadas...');

      // Filtrar apenas semanas selecionadas
      const semanasParaInserirData = semanaDetectada.filter(s =>
        semanasParaImportar.includes(s.nome)
      );

      let totalImportado = 0;

      for (const semanaData of semanasParaInserirData) {
        // Criar semana se não existir
        const nomeSemana = semanaData.nome;

        // Verificar se semana já existe
        const { data: semanaExistente } = await supabase
          .from('obra_caixa_semanas')
          .select('nome')
          .eq('obra_id', obraId)
          .eq('nome', nomeSemana)
          .single();

        if (!semanaExistente) {
          // Extrair número da semana
          const numeroMatch = nomeSemana.match(/SEMANA\s*(\d+)/i);
          const numeroSemana = numeroMatch ? parseInt(numeroMatch[1]) : semanas.length + 1;

          // Calcular data_inicio e data_fim baseado nas movimentações
          const datas = semanaData.movimentacoes.map(m => new Date(m.data));
          const dataInicio = new Date(Math.min(...datas.map(d => d.getTime())));
          const dataFim = new Date(Math.max(...datas.map(d => d.getTime())));

          const { error: semanaError } = await supabase
            .from('obra_caixa_semanas')
            .insert({
              obra_id: obraId,
              nome: nomeSemana,
              numero_semana: numeroSemana,
              data_inicio: dataInicio.toISOString().split('T')[0],
              data_fim: dataFim.toISOString().split('T')[0],
              status: 'EM_ANDAMENTO',
            });

          if (semanaError) {
            console.error('Erro ao criar semana:', semanaError);
            toast.error(`Erro ao criar semana ${nomeSemana}: ${semanaError.message}`);
            continue;
          }
        }

        // Inserir movimentações desta semana
        const movimentacoesParaInserir = semanaData.movimentacoes.map((mov, index) => ({
          obra_id: obraId,
          semana: nomeSemana,
          data: mov.data,
          descricao: mov.descricao,
          empresa: mov.empresa || null,
          valor: mov.valor,
          tipo_recibo: mov.tipo_recibo || 'SEM NF',
          codigo_recibo: mov.codigo_recibo || null,
          status: mov.status || 'PENDENTE',
          observacoes: mov.observacoes || null,
          item_numero: index + 1,
        }));

        const { error } = await supabase
          .from('obra_caixa')
          .insert(movimentacoesParaInserir);

        if (error) {
          console.error('Erro ao inserir movimentações:', error);
          continue;
        }

        totalImportado += movimentacoesParaInserir.length;
      }

      toast.success(`${totalImportado} movimentações importadas!`);
      setShowDialogImport(false);
      setSemanaDetectada(null);
      setSemanasParaImportar([]);
      carregarMovimentacoes();
      carregarSemanas();
    } catch (error: any) {
      console.error('Erro ao confirmar importação:', error);
      toast.error('Erro ao confirmar importação', {
        description: error.message,
      });
    } finally {
      setImporting(false);
    }
  };

  const semanaAtual = semanas.find(s => s.nome === semanaSelecionada);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Semana */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Caixa de Obra</h2>
          <select
            value={semanaSelecionada}
            onChange={(e) => setSemanaSelecionada(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            {semanas.map((semana) => (
              <option key={semana.id} value={semana.nome}>
                {semana.nome} ({new Date(semana.data_inicio).toLocaleDateString()} - {new Date(semana.data_fim).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowDialogSemana(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Calendar className="w-4 h-4" />
            Nova Semana
          </button>
          {semanaSelecionada && (
            <>
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
                onClick={() => {
                  setEditandoMovimentacao(null);
                  setShowDialogMovimentacao(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Nova Movimentação
              </button>
              <button
                onClick={() => setSemanaToDelete(semanaSelecionada)}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Semana
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cards de Resumo da Semana */}
      {semanaAtual && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-600 font-medium">Receitas</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">
                  {formatarMoeda(semanaAtual.total_receitas)}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {movimentacoes.filter(m => isReceita(m.valor)).length} movimentações
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-red-600 font-medium">Despesas</div>
                <div className="text-2xl font-bold text-red-900 mt-1">
                  {formatarMoeda(semanaAtual.total_despesas)}
                </div>
                <div className="text-xs text-red-600 mt-1">
                  {movimentacoes.filter(m => isDespesa(m.valor)).length} movimentações
                </div>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className={`${semanaAtual.saldo >= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} border rounded-lg p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm ${semanaAtual.saldo >= 0 ? 'text-green-600' : 'text-orange-600'} font-medium`}>
                  Saldo
                </div>
                <div className={`text-2xl font-bold ${semanaAtual.saldo >= 0 ? 'text-green-900' : 'text-orange-900'} mt-1`}>
                  {formatarMoeda(semanaAtual.saldo)}
                </div>
                <div className={`text-xs ${semanaAtual.saldo >= 0 ? 'text-green-600' : 'text-orange-600'} mt-1`}>
                  da semana
                </div>
              </div>
              <DollarSign className={`w-8 h-8 ${semanaAtual.saldo >= 0 ? 'text-green-600' : 'text-orange-600'}`} />
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm text-purple-600 font-medium">Status</div>
            <div className="text-2xl font-bold text-purple-900 mt-1">
              {semanaAtual.status === 'ABERTA' ? 'Aberta' :
               semanaAtual.status === 'FECHADA' ? 'Fechada' :
               'Enviada'}
            </div>
            {semanaAtual.data_envio_cliente && (
              <div className="text-xs text-purple-600 mt-1">
                Enviada em {new Date(semanaAtual.data_envio_cliente).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabela de Movimentações */}
      {semanaSelecionada ? (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo Recibo</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comprovante</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                      Nenhuma movimentação nesta semana. Clique em "Nova Movimentação" para adicionar.
                    </td>
                  </tr>
                ) : (
                  movimentacoes.map((mov, index) => (
                    <tr key={mov.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {new Date(mov.data).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 max-w-xs truncate" title={mov.descricao}>
                        {mov.descricao}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900">{mov.empresa || '-'}</td>
                      <td className={`px-3 py-3 text-sm font-medium text-right ${
                        isDespesa(mov.valor) ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatarMoeda(mov.valor)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900">{mov.tipo_recibo || '-'}</td>
                      <td className="px-3 py-3 text-sm text-gray-900">{mov.codigo_recibo || '-'}</td>
                      <td className="px-3 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          mov.status === 'PAGO' ? 'bg-green-100 text-green-800' :
                          mov.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800' :
                          mov.status === 'TRANSFERIDO' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {mov.status}
                        </span>
                      </td>
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
                      <td className="px-3 py-3 text-sm text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditandoMovimentacao(mov);
                              setShowDialogMovimentacao(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setMovToDelete(mov.id)}
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
      ) : (
        <div className="border rounded-lg p-8 text-center text-gray-500">
          Nenhuma semana criada. Clique em "Nova Semana" para começar.
        </div>
      )}

      {/* Dialogs */}
      {showDialogSemana && (
        <FormularioSemana
          obraId={obraId}
          ultimoNumero={semanas.length > 0 ? Math.max(...semanas.map(s => s.numero_semana)) : 0}
          onSalvar={handleCriarSemana}
          onCancelar={() => setShowDialogSemana(false)}
        />
      )}

      {showDialogMovimentacao && (
        <FormularioMovimentacao
          movimentacao={editandoMovimentacao}
          obraId={obraId}
          semanaSelecionada={semanaSelecionada}
          onSalvar={handleSalvarMovimentacao}
          onCancelar={() => {
            setShowDialogMovimentacao(false);
            setEditandoMovimentacao(null);
          }}
        />
      )}

      <AlertDialog open={!!movToDelete} onOpenChange={(o) => { if (!o) setMovToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta movimentação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirMovimentacao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!semanaToDelete} onOpenChange={(o) => { if (!o) setSemanaToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir semana?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a semana "{semanaToDelete}"?
              Todas as movimentações desta semana também serão excluídas.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirSemana}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Semana
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Seleção de Semanas para Importar */}
      <Dialog open={showDialogImport} onOpenChange={setShowDialogImport}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Semanas para Importar</DialogTitle>
            <DialogDescription>
              Foram detectadas {semanaDetectada?.length || 0} semana(s) no arquivo Excel.
              Selecione quais deseja importar:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {semanaDetectada?.map((semana) => {
              const isSelected = semanasParaImportar.includes(semana.nome);

              return (
                <div
                  key={semana.nome}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    if (isSelected) {
                      setSemanasParaImportar(prev => prev.filter(s => s !== semana.nome));
                    } else {
                      setSemanasParaImportar(prev => [...prev, semana.nome]);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSemanasParaImportar(prev => [...prev, semana.nome]);
                        } else {
                          setSemanasParaImportar(prev => prev.filter(s => s !== semana.nome));
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{semana.nome}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {semana.movimentacoes.length} movimentação(ões) detectada(s)
                      </p>

                      {/* Preview das primeiras movimentações */}
                      <div className="mt-2 space-y-1">
                        {semana.movimentacoes.slice(0, 3).map((mov, idx) => (
                          <div key={idx} className="text-xs text-gray-500 flex justify-between">
                            <span className="truncate flex-1">{mov.descricao}</span>
                            <span className={`ml-2 ${mov.valor < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatarMoeda(mov.valor)}
                            </span>
                          </div>
                        ))}
                        {semana.movimentacoes.length > 3 && (
                          <p className="text-xs text-gray-400">
                            ...e mais {semana.movimentacoes.length - 3}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialogImport(false);
                setSemanaDetectada(null);
                setSemanasParaImportar([]);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarImportacao}
              disabled={semanasParaImportar.length === 0 || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                `Importar ${semanasParaImportar.length} semana(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Formulário de Semana
interface FormularioSemanaProps {
  obraId: string;
  ultimoNumero: number;
  onSalvar: (data: ObraCaixaSemanaInput) => void;
  onCancelar: () => void;
}

function FormularioSemana({ obraId, ultimoNumero, onSalvar, onCancelar }: FormularioSemanaProps) {
  const proximoNumero = ultimoNumero + 1;
  const [formData, setFormData] = useState<ObraCaixaSemanaInput>({
    obra_id: obraId,
    numero_semana: proximoNumero,
    nome: `SEMANA ${proximoNumero.toString().padStart(2, '0')}`,
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'ABERTA',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSalvar(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Nova Semana</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Semana
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Início
                </label>
                <input
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
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
                Criar Semana
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Formulário de Movimentação
interface FormularioMovimentacaoProps {
  movimentacao: ObraCaixa | null;
  obraId: string;
  semanaSelecionada: string;
  onSalvar: (data: ObraCaixaInput) => void;
  onCancelar: () => void;
}

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
                placeholder="ex: SERCOM, SANTA O'DILA"
              />
            </div>

            {/* Seção de Comprovante (apenas para despesas) */}
            {tipoCaixa === 'despesa' && (
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">
                      Comprovante de Pagamento
                    </h4>
                    <p className="text-xs text-blue-700 mb-3">
                      Para despesas, é obrigatório enviar o comprovante (NF, cupom fiscal, print, etc.)
                      OU justificar por que não pode enviar.
                    </p>

                    {/* Checkbox Marketplace */}
                    <label className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        checked={formData.is_marketplace}
                        onChange={(e) => setFormData({ ...formData, is_marketplace: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        É compra de marketplace (Mercado Livre, Amazon, etc.)
                      </span>
                    </label>

                    <div className="text-xs text-blue-600 bg-blue-100 px-3 py-2 rounded">
                      <strong>Prazo:</strong> {formData.is_marketplace ? '5 dias corridos' : '2 dias corridos'} após a compra
                    </div>
                  </div>
                </div>

                {/* Upload de Arquivo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anexar Comprovante
                  </label>

                  {movimentacao?.anexo_url && !arquivo && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">Comprovante já enviado</span>
                      <a
                        href={movimentacao.anexo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline ml-auto"
                      >
                        Ver arquivo
                      </a>
                    </div>
                  )}

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/jpg"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      {arquivo ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <FileText className="w-5 h-5" />
                          <span className="text-sm font-medium">{arquivo.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setArquivo(null);
                            }}
                            className="text-red-600 hover:text-red-800 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Clique para selecionar ou arraste o arquivo
                          </span>
                          <span className="text-xs text-gray-500">
                            PDF, JPG ou PNG (máx. 5MB)
                          </span>
                        </>
                      )}
                    </label>
                  </div>

                  {uploading && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Enviando arquivo...</span>
                    </div>
                  )}
                </div>

                {/* Botão para mostrar justificativa */}
                <button
                  type="button"
                  onClick={() => setMostrarJustificativa(!mostrarJustificativa)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {mostrarJustificativa ? 'Ocultar justificativa' : 'Não consigo enviar o comprovante agora'}
                </button>

                {/* Campo de Justificativa */}
                {mostrarJustificativa && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Justificativa <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.justificativa_sem_comprovante}
                      onChange={(e) => setFormData({
                        ...formData,
                        justificativa_sem_comprovante: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="Explique por que não pode enviar o comprovante agora..."
                    />
                    <p className="text-xs text-yellow-700 mt-1">
                      ⚠️ Você ainda precisará enviar o comprovante posteriormente
                    </p>
                  </div>
                )}
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
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {movimentacao ? 'Salvar Alterações' : 'Adicionar Movimentação'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
