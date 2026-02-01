# Sistema de Notificações e Chamadas - SARKE

## Funcionalidades Implementadas

### 1. Notificações de Mensagens de Chat ✅

**Localização**: `hooks/useChat.ts` (linhas 264-323)

**O que faz**:
- Quando um usuário envia uma mensagem direta, o destinatário recebe uma notificação
- Quando um usuário envia mensagem em grupo, todos os membros (exceto o remetente) recebem notificação
- A notificação aparece no sino de notificações com preview da mensagem
- Toast de notificação em tempo real via Supabase Realtime

**Como funciona**:
```typescript
// Mensagem Direta
if (data.recipient_id && data.recipient_id !== currentUserId) {
  await supabase.from('notifications').insert({
    user_id: data.recipient_id,
    type: 'message',
    title: `Nova mensagem de ${senderName}`,
    description: data.content.length > 100
      ? data.content.substring(0, 100) + '...'
      : data.content,
    reference_type: 'message',
    reference_id: newMessage.id,
  })
}

// Mensagem em Grupo
if (data.group_id) {
  // Busca membros do grupo (exceto sender)
  // Cria notificação para cada membro
}
```

---

### 2. Histórico de Chamadas Perdidas ✅

**Localização**: `supabase/webrtc-calls.sql` (linhas 130-173)

**O que faz**:
- Detecta automaticamente quando uma chamada é marcada como "missed"
- Cria uma mensagem automática no chat do destinatário
- A mensagem mostra: tipo de chamada, nome do caller e horário

**Trigger SQL**:
```sql
CREATE OR REPLACE FUNCTION check_missed_call()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_name TEXT;
  v_time_text TEXT;
BEGIN
  IF NEW.status = 'missed' THEN
    SELECT name INTO v_caller_name FROM profiles WHERE id = NEW.caller_id;
    v_time_text := to_char(NEW.created_at, 'HH24:MI');

    INSERT INTO messages (sender_id, recipient_id, content, group_id)
    VALUES (
      NEW.caller_id,
      NEW.receiver_id,
      '📞 Chamada perdida de ' || COALESCE(v_caller_name, 'Desconhecido') ||
      ' às ' || v_time_text || ' (' || [tipo] || ')',
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_check_missed_call
  AFTER UPDATE ON calls
  FOR EACH ROW
  WHEN (NEW.status = 'missed' AND OLD.status != 'missed')
  EXECUTE FUNCTION check_missed_call();
```

**Timeout automático**:
- Após 30 segundos sem resposta, a chamada é automaticamente marcada como "missed"
- Implementado em `hooks/useWebRTC.ts` (linhas 215-233)

---

### 3. Som de Chamada para Quem Está Ligando (Ringback) ✅

**Localização**: `hooks/useWebRTC.ts`

**O que faz**:
- Quando alguém inicia uma chamada, ouve um tom de "chamando..." (ringback)
- O som toca em loop até que:
  - A chamada seja atendida
  - A chamada seja recusada
  - Timeout de 30 segundos seja atingido
  - A chamada seja cancelada manualmente

**Implementação**:
```typescript
// Audio de ringback (linhas 49-51)
const ringbackRef = useRef<HTMLAudioElement | null>(null)

// Inicialização (linhas 72-76)
const ringback = new Audio('data:audio/wav;base64,UklGRn...')
ringback.loop = true
ringbackRef.current = ringback

// Tocar ao iniciar chamada (linhas 208-213)
if (ringbackRef.current) {
  ringbackRef.current.play().catch((err) => {
    console.log('Não foi possível tocar o ringback:', err)
  })
}

// Parar quando aceitar/rejeitar/finalizar (linhas 257-260, 335-338, 374-377)
if (ringbackRef.current) {
  ringbackRef.current.pause()
  ringbackRef.current.currentTime = 0
}
```

---

### 4. Som de Chamada Recebida (Ringtone) com Identificação ✅

**Localização**: `hooks/useWebRTC.ts` + `components/call/IncomingCallDialog.tsx`

**O que faz**:
- Quando alguém recebe uma chamada, ouve um toque (ringtone)
- Modal aparece mostrando:
  - Avatar do caller
  - Nome do caller
  - Tipo de chamada (áudio/vídeo/tela)
  - Ícone animado pulsando
  - Botões para aceitar ou recusar

**Implementação**:

**Som** (`hooks/useWebRTC.ts`):
```typescript
// Audio de ringtone (linhas 46-48)
const ringtoneRef = useRef<HTMLAudioElement | null>(null)

// Inicialização (linhas 66-70)
const ringtone = new Audio('data:audio/wav;base64,UklGRn...')
ringtone.loop = true
ringtoneRef.current = ringtone

// Tocar ao receber chamada (linhas 447-452)
if (ringtoneRef.current) {
  ringtoneRef.current.play().catch((err) => {
    console.log('Não foi possível tocar o ringtone:', err)
  })
}
```

**Modal** (`components/call/IncomingCallDialog.tsx`):
```tsx
<Dialog open={!!call}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{getCallTypeText()}</DialogTitle>
      <DialogDescription>
        {callerName} está te ligando
      </DialogDescription>
    </DialogHeader>

    {/* Avatar com nome */}
    <Avatar className="h-24 w-24">
      <AvatarImage src={callerAvatar} />
      <AvatarFallback>{callerName.charAt(0)}</AvatarFallback>
    </Avatar>

    {/* Ícone animado */}
    <div className="animate-pulse">
      {getCallIcon()}
    </div>

    {/* Botões de Aceitar/Recusar */}
    <Button onClick={onAccept}>Aceitar</Button>
    <Button onClick={onReject}>Recusar</Button>
  </DialogContent>
</Dialog>
```

---

## Como Testar

### 1. Notificações de Mensagens

1. Abra dois navegadores com usuários diferentes
2. Envie uma mensagem de um usuário para outro
3. Verifique que o destinatário recebe:
   - Toast de notificação em tempo real
   - Badge no sino de notificações
   - Mensagem na lista de notificações

### 2. Chamadas Perdidas

1. Usuário A liga para Usuário B
2. Usuário B NÃO atende
3. Após 30 segundos:
   - Usuário A vê "Chamada não atendida"
   - Usuário B vê mensagem automática no chat: "📞 Chamada perdida de [Nome] às [HH:MM] (Áudio/Vídeo)"

### 3. Sons de Chamada

**Ringback (quem liga)**:
1. Usuário A inicia chamada para Usuário B
2. Usuário A ouve som de "chamando..." em loop
3. Som para quando:
   - B aceita
   - B recusa
   - 30 segundos passam
   - A cancela

**Ringtone (quem recebe)**:
1. Usuário B recebe chamada de Usuário A
2. Usuário B ouve toque em loop
3. Modal aparece mostrando:
   - Nome de A
   - Avatar de A
   - Tipo de chamada
4. Som para quando:
   - B aceita
   - B recusa
   - Timeout (30s)

---

## Configuração SQL Necessária

Execute o seguinte SQL no Supabase SQL Editor:

```bash
# 1. Sistema de Notificações
psql [connection-string] < supabase/access-requests.sql

# 2. Sistema de Chamadas com Trigger de Missed Calls
psql [connection-string] < supabase/webrtc-calls.sql
```

**Ou via CLI do Supabase**:
```bash
supabase db push
```

---

## Arquivos Modificados

### Criados:
- ✅ `supabase/access-requests.sql` - Tabelas e triggers de notificações
- ✅ `supabase/webrtc-calls.sql` - Tabelas, triggers e timeout de chamadas
- ✅ `types/notifications.ts` - Tipos TypeScript
- ✅ `hooks/useNotifications.ts` - Hook de notificações
- ✅ `components/notifications/NotificationBell.tsx` - Sino de notificações
- ✅ `components/notifications/AccessRequestsDialog.tsx` - Modal de aprovação
- ✅ `components/call/IncomingCallDialog.tsx` - Modal de chamada recebida
- ✅ `public/sounds/ringtone.mp3` - Placeholder (substituir)
- ✅ `public/sounds/ringback.mp3` - Placeholder (substituir)

### Modificados:
- ✅ `hooks/useChat.ts` - Adicionado criação de notificações ao enviar mensagens
- ✅ `hooks/useWebRTC.ts` - Adicionado sons e timeout de 30s
- ✅ `components/auth/ProtectedRoute.tsx` - Verificação de acesso aprovado
- ✅ `app/fora-horario/page.tsx` - Polling de aprovação
- ✅ `app/dashboard/chat/page.tsx` - Removido ProtectedRoute duplicado
- ✅ `components/dashboard/Sidebar.tsx` - Integrado NotificationBell

---

## Notas de Produção

### Áudios
Os arquivos de áudio atuais usam Data URLs com beeps simples. Para produção:

1. Substitua `/public/sounds/ringtone.mp3` por um toque real
2. Substitua `/public/sounds/ringback.mp3` por um tom de espera real

**Fontes de áudio grátis**:
- https://www.zapsplat.com
- https://freesound.org
- https://www.soundjay.com

### Performance
- Cache de `hasApprovedAccess()` configurado para 30 segundos
- Realtime Subscriptions otimizadas com unique channel names
- Cleanup adequado de timeouts e audio elements

### Segurança
- RLS policies aplicadas em todas as tabelas
- Triggers executam como SECURITY DEFINER
- Validação de permissões em todos os RPCs

---

## Troubleshooting

### Som não toca
- Navegadores bloqueiam autoplay de áudio
- Solução: Primeiro interação do usuário já habilita
- Chrome: chrome://flags/#autoplay-policy

### Chamada não marca como missed
- Verifique se o trigger está ativo: `\d+ calls` no psql
- Verifique logs do Supabase Functions

### Notificação não chega
- Verifique Supabase Realtime está habilitado
- Verifique tabela está em `supabase_realtime` publication
- Console do navegador mostrará erros de subscription

---

## Status da Implementação

- [x] Notificações de mensagens não lidas no chat
- [x] Adicionar histórico de chamadas perdidas como mensagem
- [x] Implementar som de chamada para quem está ligando
- [x] Implementar som de chamada recebida e mostrar quem está ligando
- [x] Criar arquivos de áudio para chamadas
- [ ] Substituir arquivos de áudio por MP3s reais (pendente)
- [ ] Testes de integração completos

---

**Última atualização**: Janeiro 2026
**Versão**: 1.0.0
