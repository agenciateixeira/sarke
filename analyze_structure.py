#!/usr/bin/env python3
import pandas as pd
import os

# Caminho do arquivo
file_path = os.path.expanduser("~/Downloads/Cronograma - Viale Conveniencia.xlsx")

print("=" * 60)
print("ANÁLISE DETALHADA - ESTRUTURA DO CRONOGRAMA")
print("=" * 60)

# Ler a aba CRONOGRAMA
df_cronograma = pd.read_excel(file_path, sheet_name="CRONOGRAMA", header=12)

print(f"\nColunas identificadas: {list(df_cronograma.columns)}\n")

# Analisar os primeiros grupos de data
current_date = None
date_groups = {}

for idx, row in df_cronograma.iterrows():
    # Verificar se tem data na linha
    if pd.notna(row['DATA']):
        current_date = row['DATA']
        date_groups[current_date] = []

    # Se tem descrição de serviço, adicionar ao grupo da data atual
    if pd.notna(row['DESCRIÇÃO SERVIÇO']) and current_date is not None:
        date_groups[current_date].append({
            'linha': idx + 14,  # Ajuste para número real da linha no Excel
            'servico': row['DESCRIÇÃO SERVIÇO'],
            'empresa': row.get('EMPRESA', ''),
            'status': row.get('STATUS', ''),
            'obs': row.get('OBSERVAÇÃO', '')
        })

# Mostrar primeiros 3 dias com múltiplas tarefas
print("EXEMPLO DE DIAS COM MÚLTIPLAS TAREFAS:")
print("-" * 60)

count = 0
for date, tasks in date_groups.items():
    if len(tasks) > 1:
        count += 1
        print(f"\n📅 Data: {date}")
        print(f"   Total de tarefas: {len(tasks)}")
        for i, task in enumerate(tasks, 1):
            print(f"   {i}. Linha {task['linha']}: {task['servico'][:50]}...")
            if task['empresa']:
                print(f"      Empresa: {task['empresa']}")

        if count >= 3:
            break

print("\n" + "=" * 60)
print("RESUMO DO PROBLEMA:")
print("-" * 60)

total_dates = len(date_groups)
single_task_days = sum(1 for tasks in date_groups.values() if len(tasks) == 1)
multi_task_days = sum(1 for tasks in date_groups.values() if len(tasks) > 1)
total_tasks = sum(len(tasks) for tasks in date_groups.values())

print(f"Total de dias com tarefas: {total_dates}")
print(f"Dias com apenas 1 tarefa: {single_task_days}")
print(f"Dias com múltiplas tarefas: {multi_task_days}")
print(f"Total de tarefas: {total_tasks}")
print(f"Média de tarefas por dia: {total_tasks/total_dates:.1f}")

print("\n⚠️  PROBLEMA IDENTIFICADO:")
print("O sistema atual está importando apenas a primeira tarefa de cada dia,")
print(f"perdendo {total_tasks - total_dates} tarefas no processo!")

print("\n" + "=" * 60)
print("ANÁLISE DA ABA SERVIÇOS (CAIXA DA OBRA)")
print("=" * 60)

# Ler a aba SERVIÇOS
df_servicos = pd.read_excel(file_path, sheet_name="SERVIÇOS", header=None)

# Procurar a linha do cabeçalho
header_row = -1
for idx, row in df_servicos.iterrows():
    row_text = ' '.join(str(cell).lower() for cell in row if pd.notna(cell))
    if 'descrição' in row_text or 'serviço' in row_text:
        header_row = idx
        break

if header_row >= 0:
    # Re-ler com o cabeçalho correto
    df_servicos = pd.read_excel(file_path, sheet_name="SERVIÇOS", header=header_row)
    print(f"\nColunas identificadas: {list(df_servicos.columns)}")

    # Contar itens válidos
    valid_items = 0
    for idx, row in df_servicos.iterrows():
        if pd.notna(row.get('DESCRIÇÃO MATERIAL', row.get('DESCRIÇÃO', ''))):
            valid_items += 1

    print(f"Total de itens de material/serviço: {valid_items}")
    print("\nPrimeiros 5 itens:")
    item_count = 0
    for idx, row in df_servicos.iterrows():
        desc = row.get('DESCRIÇÃO MATERIAL', row.get('DESCRIÇÃO', ''))
        if pd.notna(desc):
            item_count += 1
            qtde = row.get('QTDE', '')
            valor = row.get('VALOR UNIT.', '')
            print(f"  {item_count}. {desc[:40]}... | Qtde: {qtde} | Valor: {valor}")
            if item_count >= 5:
                break