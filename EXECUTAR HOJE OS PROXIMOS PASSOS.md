# EXECUTAR HOJE - PRÓXIMOS PASSOS

## Sistema de Personalização de Plano de Fundo do Chat

### Objetivo
Criar um submenu de "Configurações do Chat" que permite personalizar o plano de fundo das conversas, similar ao WhatsApp.

---

## 1. ARQUITETURA E ESTRUTURA

### Arquivos a Criar:

#### 1.1 Types
- `types/chat-settings.ts` - Definições TypeScript para configurações do chat

#### 1.2 Components
- `components/chat/ChatSettingsDialog.tsx` - Modal principal de configurações
- `components/chat/WallpaperSelector.tsx` - Componente para seleção de wallpapers
- `components/chat/ColorSelector.tsx` - Componente para seleção de cores

#### 1.3 Library/Utils
- `lib/chat-wallpapers.ts` - Wallpapers pré-definidos e utilitários

#### 1.4 Hooks
- `hooks/useChatSettings.ts` - Hook para gerenciar configurações (localStorage + state)

#### 1.5 Database (Opcional)
- `supabase/chat-preferences.sql` - Tabela para salvar preferências no banco (opcional)

---

## 2. FUNCIONALIDADES DETALHADAS

### 2.1 Menu de Configurações
- **Localização**: Botão no header do chat (próximo aos botões de chamada)
- **Ícone**: Settings/Gear icon
- **Ação**: Abre dialog de configurações

### 2.2 Opções de Personalização

#### A) Cores Sólidas
Paleta pré-definida com cores suaves:
- Branco (padrão)
- Cinza Claro
- Bege
- Azul Claro
- Verde Menta
- Lavanda
- Rosa Suave
- Pêssego

#### B) Gradientes
Gradientes suaves e modernos:
- Amanhecer (laranja → rosa)
- Oceano (azul → turquesa)
- Floresta (verde → verde-azulado)
- Pôr do Sol (roxo → laranja)
- Névoa (cinza → branco)
- Sakura (rosa → roxo claro)

#### C) Padrões/Wallpapers (estilo WhatsApp)

**Categoria 1: Doodles**
- Doodles Coloridos
- Desenhos Minimalistas
- Rabiscos Abstratos

**Categoria 2: Geométricos**
- Triângulos Sutis
- Hexágonos
- Círculos Sobrepostos
- Linhas Cruzadas

**Categoria 3: Florais**
- Folhas Tropicais
- Flores Delicadas
- Galhos e Folhas

**Categoria 4: Abstratos**
- Formas Orgânicas
- Ondas Fluidas
- Partículas

**Categoria 5: Minimalistas**
- Pontos Espaçados
- Linhas Finas
- Grid Sutil

#### D) Upload Personalizado
- Upload de imagem do usuário
- Crop/ajuste da imagem
- Preview antes de aplicar

#### E) Tema Padrão
- Opção para voltar ao tema padrão do sistema

---

## 3. RECURSOS TÉCNICOS

### 3.1 Armazenamento
**Opção 1: localStorage (Mais Simples)**
```typescript
{
  userId: string
  backgroundType: 'color' | 'gradient' | 'pattern' | 'image' | 'default'
  backgroundValue: string // hex, gradient CSS, pattern ID, image URL
  opacity: number // 0-100
}
```

**Opção 2: Supabase (Sincronização Multi-Dispositivo)**
```sql
CREATE TABLE chat_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  background_type TEXT NOT NULL,
  background_value TEXT NOT NULL,
  opacity INTEGER DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
```

### 3.2 Aplicação do Background
- Background aplicado no componente `MessageArea.tsx`
- Div wrapper com background customizado
- Ajuste automático de contraste das mensagens
- Transição suave ao trocar backgrounds

### 3.3 Preview em Tempo Real
- Ao selecionar opção, aplicar imediatamente
- Botão "Aplicar" para confirmar
- Botão "Cancelar" para reverter

### 3.4 Contraste Automático
- Detecção de luminosidade do background
- Ajuste de opacidade das bolhas de mensagem
- Garantir legibilidade em qualquer fundo

---

## 4. INTERFACE DO USUÁRIO

### 4.1 Dialog de Configurações

```
┌─────────────────────────────────────┐
│  Configurações do Chat          [X] │
├─────────────────────────────────────┤
│                                     │
│  [Aba: Plano de Fundo]              │
│                                     │
│  ┌─ Cores Sólidas ─────────────┐   │
│  │ ⚪ ⚫ 🟤 🔵 🟢 🟣 🔴 🟠      │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌─ Gradientes ────────────────┐   │
│  │ [Preview] [Preview] [...]    │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌─ Padrões ────────────────────┐  │
│  │ 🎨 Doodles                    │  │
│  │ 📐 Geométricos                │  │
│  │ 🌸 Florais                    │  │
│  │ 🌊 Abstratos                  │  │
│  │ ⚪ Minimalistas                │  │
│  └──────────────────────────────┘   │
│                                     │
│  📤 Upload de Imagem                │
│                                     │
│  Opacidade: ━━━━━━━●──── 80%       │
│                                     │
│  [Tema Padrão] [Cancelar] [Aplicar]│
└─────────────────────────────────────┘
```

### 4.2 Preview
- Área de preview mostrando como ficará o chat
- Mensagens de exemplo (enviadas e recebidas)

---

## 5. IMPLEMENTAÇÃO PASSO A PASSO

### PASSO 1: Criar Types
```bash
touch types/chat-settings.ts
```

### PASSO 2: Criar Wallpapers Library
```bash
touch lib/chat-wallpapers.ts
```

### PASSO 3: Criar Hook
```bash
touch hooks/useChatSettings.ts
```

### PASSO 4: Criar Components
```bash
touch components/chat/ChatSettingsDialog.tsx
touch components/chat/WallpaperSelector.tsx
touch components/chat/ColorSelector.tsx
```

### PASSO 5: Atualizar MessageArea
- Adicionar wrapper com background customizado
- Integrar com hook de configurações

### PASSO 6: Adicionar Botão no Header
- Modificar `app/dashboard/chat/page.tsx`
- Adicionar botão de configurações ao lado dos botões de chamada

### PASSO 7: (Opcional) Criar Tabela no Supabase
```bash
touch supabase/chat-preferences.sql
```

### PASSO 8: Testar
- Testar todas as opções de background
- Verificar contraste e legibilidade
- Testar persistência (localStorage ou DB)

---

## 6. WALLPAPERS PRÉ-DEFINIDOS

### Implementação via CSS/SVG

Os wallpapers podem ser implementados como:
- **Padrões CSS** (usando `background-image` com gradientes e repeats)
- **SVG inline** (melhor qualidade e controle)
- **Base64 images** (pequenas texturas)

Exemplo de padrão CSS:
```css
.wallpaper-dots {
  background-image: radial-gradient(circle, #00000010 1px, transparent 1px);
  background-size: 20px 20px;
}
```

---

## 7. EXTRAS/MELHORIAS FUTURAS

- [ ] Tema escuro adaptativo
- [ ] Blur/desfoque no background
- [ ] Animações sutis no background
- [ ] Compartilhar tema com outros usuários
- [ ] Temas sazonais (Natal, Halloween, etc.)
- [ ] Background diferente por conversa
- [ ] Modo "Bolhas" vs "Flat"

---

## 8. PRIORIDADE DE EXECUÇÃO

### ALTA PRIORIDADE (Fazer Hoje):
1. ✅ Criar types (chat-settings.ts)
2. ✅ Criar wallpapers library com padrões básicos
3. ✅ Criar hook useChatSettings (localStorage)
4. ✅ Criar ChatSettingsDialog (cores + gradientes)
5. ✅ Adicionar botão no header do chat
6. ✅ Aplicar background no MessageArea

### MÉDIA PRIORIDADE (Próximos dias):
7. ⏳ Adicionar wallpapers/padrões completos
8. ⏳ Sistema de upload de imagem
9. ⏳ Tabela no Supabase (sincronização)

### BAIXA PRIORIDADE (Futuro):
10. ⏳ Temas avançados e animações
11. ⏳ Background por conversa

---

## 9. REFERÊNCIAS VISUAIS

### Inspiração WhatsApp:
- Wallpapers com opacidade ajustável
- Cores suaves e agradáveis aos olhos
- Padrões repetitivos sutis
- Sempre garantir legibilidade das mensagens

### Cores Sugeridas (Hex):
- Branco: `#FFFFFF`
- Cinza Claro: `#F0F0F0`
- Bege: `#F5F1E8`
- Azul Claro: `#E3F2FD`
- Verde Menta: `#E0F2F1`
- Lavanda: `#F3E5F5`
- Rosa Suave: `#FCE4EC`
- Pêssego: `#FFF3E0`

---

## 10. NOTAS IMPORTANTES

⚠️ **Contraste**: Sempre garantir que as mensagens sejam legíveis
⚠️ **Performance**: Usar backgrounds leves (CSS > SVG > Images)
⚠️ **Acessibilidade**: Opção de desabilitar backgrounds decorativos
⚠️ **Mobile**: Testar em diferentes tamanhos de tela

---

**Data de Criação**: 2026-02-01
**Última Atualização**: 2026-02-01
**Status**: 📋 PLANEJAMENTO COMPLETO - PRONTO PARA EXECUÇÃO
