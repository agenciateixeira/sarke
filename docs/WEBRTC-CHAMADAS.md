# 📞 Sistema de Chamadas WebRTC - Sarke

## 🎯 O que foi implementado

Sistema completo de chamadas de **áudio** e **vídeo** usando **WebRTC**, totalmente integrado ao chat do Sarke.

---

## 🏗️ Arquitetura

```
┌─────────────────┐         ┌─────────────────┐
│   Usuário A     │         │   Usuário B     │
│  (Navegador)    │         │  (Navegador)    │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │  WebRTC Peer-to-Peer     │
         │  (áudio/vídeo direto)    │
         ├───────────────────────────┤
         │                           │
         │   Sinalização (WebSocket) │
         └─────────┬─────────────────┘
                   │
         ┌─────────▼──────────┐
         │   Supabase         │
         │  - Realtime        │
         │  - calls table     │
         │  - webrtc_signals  │
         └────────────────────┘
```

### Como funciona:

1. **Sinalização**: Supabase Realtime transmite ofertas/respostas WebRTC
2. **Mídia**: Áudio/vídeo trafega DIRETAMENTE entre navegadores (P2P)
3. **STUN**: Servidor público do Google para atravessar NAT
4. **TURN**: (Opcional) Para casos onde P2P não é possível

---

## 📁 Arquivos criados

### 1. SQL (Banco de Dados)
```
supabase/webrtc-calls.sql
```
- Tabela `calls` (histórico de chamadas)
- Tabela `webrtc_signals` (sinalizações WebRTC)
- Função `end_call()` (finalizar chamadas)
- RLS policies (segurança)
- Realtime habilitado

### 2. Types (TypeScript)
```
types/webrtc.ts
```
- `Call`, `CallStatus`, `CallType`
- `WebRTCSignal`, `SignalType`
- Interfaces para criar chamadas

### 3. Hook Principal
```
hooks/useWebRTC.ts
```
Gerencia toda a lógica WebRTC:
- Iniciar chamadas
- Aceitar/rejeitar chamadas
- Controles (mute, vídeo on/off)
- Realtime listeners
- Peer Connection

### 4. Componentes UI
```
components/call/IncomingCallDialog.tsx  → Notificação de chamada recebida
components/call/CallScreen.tsx          → Tela de chamada ativa
components/call/CallButton.tsx          → Botão dropdown (áudio/vídeo/tela)
```

### 5. Integração
```
app/dashboard/chat/page.tsx  → Botões Phone/Video conectados
```

---

## 🚀 Como usar

### 1️⃣ Executar SQL no Supabase

```bash
# No Supabase Dashboard → SQL Editor:
supabase/webrtc-calls.sql
```

### 2️⃣ Usar no Chat

1. Abra uma conversa direta (1 para 1)
2. Clique no ícone **📞 Phone** (chamada de áudio)
3. OU clique no ícone **📹 Video** (chamada de vídeo)

### 3️⃣ Receber chamada

Quando alguém te ligar:
- Um diálogo aparece automaticamente
- Você pode **Aceitar** ou **Recusar**

### 4️⃣ Durante a chamada

**Controles disponíveis:**
- 🎤 **Mute/Unmute** - Desligar/ligar microfone
- 📹 **Video On/Off** - Desligar/ligar câmera
- ☎️ **Encerrar** - Finalizar chamada

---

## 🔧 Tecnologias usadas

| Tecnologia | Uso |
|------------|-----|
| **WebRTC** | Transmissão P2P de áudio/vídeo |
| **Supabase Realtime** | Sinalização (ofertas/respostas) |
| **PostgreSQL** | Histórico de chamadas |
| **STUN (Google)** | Travessia de NAT |
| **Next.js 15** | UI e estado |

---

## ⚙️ Configuração de Produção

Para produção, você deve:

### 1. Adicionar servidor TURN próprio

Edite `hooks/useWebRTC.ts`:

```typescript
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Adicione seu TURN server
    {
      urls: 'turn:seu-servidor.com:3478',
      username: 'usuario',
      credential: 'senha'
    }
  ],
}
```

**Opções de TURN servers:**
- **Twilio** (pago, confiável)
- **Coturn** (open-source, self-hosted)
- **Xirsys** (freemium)

### 2. Configurar permissões de mídia

Certifique-se de que o site usa **HTTPS**. WebRTC exige HTTPS em produção!

---

## 🎯 Funcionalidades

✅ Chamadas de áudio 1-para-1
✅ Chamadas de vídeo 1-para-1
✅ Compartilhamento de tela
✅ Controles (mute, video on/off)
✅ Notificação de chamada recebida
✅ Histórico de chamadas no banco
✅ Realtime (chamadas instantâneas)
✅ Indicador de "digitando..." no chat
✅ Integração total com o chat existente

---

## 🐛 Troubleshooting

### Problema: "Erro ao acessar câmera/microfone"

**Solução:**
1. Verifique se está usando HTTPS (ou localhost)
2. Permita acesso à câmera/microfone no navegador
3. Teste em navegadores diferentes

### Problema: "Conexão perdida"

**Possível causa:** NAT muito restritivo

**Solução:** Configure um servidor TURN (veja seção de produção)

### Problema: "Áudio/vídeo não aparece"

**Debug:**
1. Abra o console do navegador
2. Verifique se há erros WebRTC
3. Teste em aba anônima (sem extensões)

---

## 📊 Banco de Dados

### Tabela `calls`
```sql
id              UUID
type            'audio' | 'video' | 'screen'
caller_id       UUID (quem ligou)
receiver_id     UUID (quem recebeu)
status          'calling' | 'accepted' | 'rejected' | 'ended'
started_at      TIMESTAMPTZ
ended_at        TIMESTAMPTZ
duration        INTEGER (segundos)
```

### Tabela `webrtc_signals`
```sql
id              UUID
call_id         UUID
from_user_id    UUID
to_user_id      UUID
signal_type     'offer' | 'answer' | 'ice-candidate'
signal_data     JSONB (SDP ou ICE candidate)
```

---

## 🔐 Segurança

✅ RLS habilitado em todas as tabelas
✅ Usuários só veem suas próprias chamadas
✅ WebRTC usa DTLS (criptografia)
✅ Sinalização via Supabase (autenticado)

---

## 🚀 Próximos passos (opcional)

- [ ] Chamadas em grupo (conferência)
- [ ] Gravação de chamadas
- [ ] Transferência de chamadas
- [ ] Histórico detalhado (com estatísticas)
- [ ] Notificações push (quando app está fechado)

---

## 📝 Notas importantes

1. **Grupos não suportam chamadas** (apenas conversas diretas 1-para-1)
2. **WebRTC requer HTTPS** em produção
3. **TURN server é recomendado** para produção (não obrigatório para testes)
4. **Supabase Realtime** já está configurado e funcionando

---

**Pronto para usar!** 🎉

Execute o SQL e teste as chamadas!
