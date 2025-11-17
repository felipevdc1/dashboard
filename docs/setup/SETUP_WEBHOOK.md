# Setup: Webhook Real-Time + Sync Incremental (FASE 3)

Este guia explica como ativar a sincronização em tempo real com webhooks do CartPanda e o backup incremental.

---

## ✅ O que já está pronto:

### 1. Infraestrutura de Webhook
- ✅ **Endpoint**: `/api/webhook/cartpanda` (POST + GET)
- ✅ **Validação HMAC-SHA256**: Segurança contra requisições falsas
- ✅ **Logging**: Tabela `webhook_events` para debug
- ✅ **View de Monitoramento**: `webhook_stats` (estatísticas por tipo de evento)

### 2. Sync Incremental
- ✅ **Script**: `scripts/incremental-sync.ts`
- ✅ **GitHub Actions**: `.github/workflows/hourly-sync.yml`
- ✅ **Comando NPM**: `npm run sync:incremental`

### 3. Arquitetura de 3 Camadas
```
CAMADA 1: Webhook Real-Time ⚡
  └─ Latência: < 1 minuto
  └─ Eventos: order.created, order.updated, order.paid, order.refunded, order.chargeback
  └─ Sem autenticação (CartPanda não usa HMAC)

CAMADA 2: Sync Incremental 🔄
  └─ Frequência: A cada 6 horas (00:00, 06:00, 12:00, 18:00 UTC)
  └─ Janela: Últimas 24 horas
  └─ Duração: ~30-60 segundos

CAMADA 3: Validação Completa ✅ (já implementada)
  └─ Frequência: Diária às 6h AM (Brasília)
  └─ Auto-fix: Sim
  └─ GitHub Actions: daily-validation.yml
```

---

## 🔧 Próximos passos:

### 1. Criar tabela `webhook_events` no Supabase

**Opção A: Via Supabase Dashboard (Recomendado)**

1. Acesse: https://supabase.com/dashboard/project/swogockrnapyymcuorgs
2. Vá para **SQL Editor**
3. Clique em **New Query**
4. Cole o conteúdo do arquivo: `supabase/migrations/004_webhook_events.sql`
5. Clique em **Run**
6. Verifique se a tabela foi criada em **Table Editor**

**Opção B: Via Supabase CLI**

```bash
# Instalar Supabase CLI (se não tiver)
npm install -g supabase

# Login
supabase login

# Linkar projeto
supabase link --project-ref swogockrnapyymcuorgs

# Rodar migration
supabase db push
```

---

### 2. Configurar Webhook no CartPanda

**URL do Webhook (Domínio Permanente):**
```
https://dashboard-eight-alpha-74.vercel.app/api/webhook/cartpanda
```

**Importante:** Este é o domínio de produção permanente do Vercel. Esta URL não muda entre deploys e sempre aponta para a versão mais recente do código.

**Eventos para assinar:**
- ✅ `order.created` - Quando um novo pedido é criado
- ✅ `order.updated` - Quando um pedido é atualizado
- ✅ `order.paid` - Quando um pedido é pago
- ✅ `order.refunded` - Quando um pedido é reembolsado
- ✅ `order.chargeback` - Quando um pedido sofre chargeback

**Configuração no Dashboard CartPanda:**

1. Acesse: https://accounts.cartpanda.com/settings/webhooks
2. Clique em **Add Webhook**
3. **URL**: Cole a URL acima
4. **Events**: Selecione os 5 eventos listados
5. **Status**: Ative o webhook
6. Clique em **Save**

**Nota sobre autenticação:** O CartPanda atualmente não usa autenticação HMAC para webhooks. O endpoint funciona sem validação de signature. Se no futuro o CartPanda adicionar suporte a HMAC, o código já está preparado para validar automaticamente quando a variável `CARTPANDA_WEBHOOK_SECRET` for definida.

---

### 3. Testar Webhook

**Health Check (GET):**

```bash
curl https://dashboard-eight-alpha-74.vercel.app/api/webhook/cartpanda
```

**Resposta esperada:**
```json
{
  "status": "ready",
  "webhook_url": "/api/webhook/cartpanda",
  "supported_events": [
    "order.created",
    "order.updated",
    "order.paid",
    "order.refunded",
    "order.chargeback"
  ]
}
```

**Teste com Pedido Real:**

1. Crie um pedido de teste no CartPanda
2. Verifique os logs do Vercel:
   ```bash
   vercel logs https://dashboard-eight-alpha-74.vercel.app --since 5m
   ```
3. Consulte a tabela de eventos:
   ```sql
   SELECT * FROM webhook_events
   ORDER BY created_at DESC
   LIMIT 10;
   ```

---

### 4. Configurar GitHub Actions Secrets

Para o sync incremental funcionar via GitHub Actions, adicione os secrets:

1. Acesse: https://github.com/[seu-user]/[seu-repo]/settings/secrets/actions
2. Clique em **New repository secret**
3. Adicione cada uma dessas variáveis:

```
NEXT_PUBLIC_CARTPANDA_API_URL=https://accounts.cartpanda.com/api/v3
CARTPANDA_API_TOKEN=<seu-token>
CARTPANDA_STORE_NAME=beliuimcaps
NEXT_PUBLIC_SUPABASE_URL=https://swogockrnapyymcuorgs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-key>
```

**Teste manual do workflow:**

1. Acesse: https://github.com/[seu-user]/[seu-repo]/actions
2. Selecione **Hourly Incremental Sync**
3. Clique em **Run workflow**
4. Aguarde ~2-3 minutos
5. Verifique se completou com sucesso

---

## 📊 Como funciona:

### Fluxo de Webhook Real-Time:

```
CartPanda Order Event
  ↓
Webhook POST /api/webhook/cartpanda
  ↓
Validar HMAC signature
  ↓
Parse payload
  ↓
Transform para formato Supabase
  ↓
UPSERT na tabela orders
  ↓
Log evento em webhook_events
  ↓
Retorna 200 OK
```

**Latência total:** < 1 minuto (geralmente < 10 segundos)

### Fluxo de Sync Incremental (Backup):

```
GitHub Actions (a cada 6h)
  ↓
Busca pedidos das últimas 24h da API
  ↓
Compara com Supabase (updated_at)
  ↓
Identifica novos/atualizados
  ↓
UPSERT apenas os diferentes
  ↓
Log resultado
```

**Duração:** 30-60 segundos (muito mais rápido que full sync)

---

## 🔍 Monitoramento

### Verificar webhooks recebidos:

```sql
-- Últimos 10 webhooks
SELECT
  event_type,
  order_number,
  processed,
  created_at,
  error
FROM webhook_events
ORDER BY created_at DESC
LIMIT 10;
```

### Estatísticas de webhooks:

```sql
-- View já criada automaticamente
SELECT * FROM webhook_stats;
```

**Resultado esperado:**
```
event_type      | total_events | successful | failed | last_event_at
----------------|--------------|------------|--------|------------------
order.created   | 245          | 245        | 0      | 2025-11-14 10:45:23
order.updated   | 89           | 89         | 0      | 2025-11-14 10:30:12
order.paid      | 198          | 198        | 0      | 2025-11-14 10:15:45
order.refunded  | 12           | 12         | 0      | 2025-11-13 14:22:10
```

### Verificar sync incremental:

```bash
# Rodar localmente para testar
npm run sync:incremental

# Com janela customizada (últimas 48h)
npm run sync:incremental -- --hours 48

# Dry run (só mostra o que seria sincronizado)
npm run sync:incremental -- --dry-run
```

---

## 🎯 Resultado Final

Com a FASE 3 completa, você terá:

### ⚡ **Atualizações em tempo real** (< 1 min)
- Webhooks capturam TODOS os eventos do CartPanda
- Dashboard atualiza automaticamente
- 5 eventos suportados (created, updated, paid, refunded, chargeback)

### 🔄 **Backup incremental** (a cada 6h)
- Pega qualquer evento que o webhook perdeu
- Muito mais rápido que full sync
- Sincroniza apenas novos/atualizados

### ✅ **Validação completa** (diária)
- Verifica 100% da base
- Auto-fix de inconsistências
- Trigger full sync se necessário

### 📊 **Visibilidade total**
- Logs de webhooks no Supabase
- Estatísticas em tempo real
- GitHub Actions logs

---

## ⚡ Próxima fase:

**FASE 4: Monitoramento e Alertas**
- Dashboard de saúde do sync
- Alertas de falhas (email/Slack)
- Métricas de latência
- Detecção de anomalias

---

**Status**: ⏳ Aguardando configuração do webhook no CartPanda
