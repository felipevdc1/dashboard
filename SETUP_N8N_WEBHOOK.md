# Setup n8n Webhook para Sync Automático em Tempo Real

Este guia configura **sync instantâneo** via webhooks do CartPanda usando n8n.

## 🎯 Por que usar n8n em vez de GitHub Actions?

| Feature | GitHub Actions (6h) | n8n Webhook (tempo real) |
|---------|---------------------|--------------------------|
| Latência | 0-6 horas | < 5 segundos |
| Trigger | Cron schedule | Evento real |
| Custo | Grátis (limitado) | Grátis (self-hosted) |
| Controle | Limitado | Total |
| Retry | Manual | Automático |

**Resultado:** Dashboard **sempre atualizado** sem delay!

---

## 📋 Pré-requisitos

- ✅ n8n instalado e rodando
- ✅ URL pública do n8n (ex: `https://n8n.seudominio.com`)
- ✅ Dashboard deployado no Vercel
- ✅ Acesso ao painel CartPanda

---

## 🚀 Passo 1: Criar Workflow no n8n

### 1.1 Importar Workflow JSON

Cole este JSON no n8n (Menu → Import from clipboard):

```json
{
  "name": "CartPanda Sync Automático",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "cartpanda-webhook",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook-trigger",
      "name": "Webhook CartPanda",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300],
      "webhookId": "cartpanda-sync"
    },
    {
      "parameters": {
        "url": "https://dashboard-eight-alpha-74.vercel.app/api/sync/incremental",
        "authentication": "none",
        "requestMethod": "POST",
        "jsonParameters": false,
        "options": {
          "timeout": 180000
        }
      },
      "id": "call-sync-api",
      "name": "Disparar Sync Incremental",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [450, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.success }}",
              "value2": "true"
            }
          ]
        }
      },
      "id": "check-success",
      "name": "Sync OK?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [650, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { \"success\": true, \"message\": \"Sync triggered\", \"synced\": $json.stats.synced } }}"
      },
      "id": "response-success",
      "name": "Resposta Sucesso",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [850, 200]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { \"success\": false, \"error\": $json.error || 'Unknown error' } }}",
        "options": {
          "responseCode": 500
        }
      },
      "id": "response-error",
      "name": "Resposta Erro",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [850, 400]
    }
  ],
  "connections": {
    "Webhook CartPanda": {
      "main": [
        [
          {
            "node": "Disparar Sync Incremental",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Disparar Sync Incremental": {
      "main": [
        [
          {
            "node": "Sync OK?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Sync OK?": {
      "main": [
        [
          {
            "node": "Resposta Sucesso",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Resposta Erro",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {},
  "versionId": "1",
  "id": "1"
}
```

### 1.2 Ativar Workflow

1. Clique em **"Save"**
2. Clique em **"Active"** (toggle no canto superior direito)
3. Copie a **URL do Webhook** que aparecerá (algo como: `https://n8n.seudominio.com/webhook/cartpanda-webhook`)

---

## 🔗 Passo 2: Configurar Webhook no CartPanda

### 2.1 Acessar Painel CartPanda

1. Login em https://accounts.cartpanda.com/
2. Vá em **Configurações** → **Webhooks** → **Novo Webhook**

### 2.2 Configurar Webhook

Preencha os campos:

| Campo | Valor |
|-------|-------|
| **Nome** | Sync Dashboard (n8n) |
| **URL** | `https://n8n.seudominio.com/webhook/cartpanda-webhook` |
| **Método** | POST |
| **Eventos** | ✅ order.created<br>✅ order.updated<br>✅ order.paid<br>✅ order.refunded |
| **Formato** | JSON |
| **Ativo** | ✅ Sim |

**IMPORTANTE:** Marque TODOS os eventos de pedido para garantir sync completo!

### 2.3 Testar Webhook

Clique em **"Testar Webhook"** no painel CartPanda. Você deve ver:

```json
{
  "success": true,
  "message": "Sync triggered",
  "synced": 1
}
```

---

## 🎨 Passo 3: Adicionar Notificações (Opcional)

Quer receber notificação quando sync completar? Adicione um nó ao workflow:

### Opção A: Telegram

```json
{
  "parameters": {
    "chatId": "SEU_CHAT_ID",
    "text": "🔄 Sync concluído!\n\n✅ {{ $json.stats.synced }} pedidos sincronizados\n⏱️ {{ $json.stats.durationSeconds }}s"
  },
  "name": "Enviar Telegram",
  "type": "n8n-nodes-base.telegram"
}
```

### Opção B: Discord

```json
{
  "parameters": {
    "webhookUrl": "https://discord.com/api/webhooks/...",
    "text": "🔄 **Sync Concluído**\n✅ {{ $json.stats.synced }} pedidos\n⏱️ {{ $json.stats.durationSeconds }}s"
  },
  "name": "Enviar Discord",
  "type": "n8n-nodes-base.discord"
}
```

Conecte após o nó **"Sync OK?"** (caminho TRUE).

---

## 🔧 Passo 4: Configuração Avançada (Opcional)

### Retry Automático em caso de Falha

Adicione um nó **"Error Trigger"** + **"Wait"** + **"Retry"**:

```json
{
  "parameters": {
    "amount": 300,
    "unit": "seconds"
  },
  "name": "Aguardar 5min",
  "type": "n8n-nodes-base.wait"
}
```

Conecte ao caminho FALSE do **"Sync OK?"**.

### Rate Limiting

Se CartPanda disparar muitos webhooks simultâneos, adicione **Queue**:

```json
{
  "parameters": {
    "mode": "queue",
    "intervalBetweenJobs": 60000
  },
  "name": "Fila (1 por minuto)",
  "type": "n8n-nodes-base.splitInBatches"
}
```

---

## ✅ Verificação Final

### Teste Completo

1. Crie um pedido de teste no CartPanda
2. Aguarde **< 5 segundos**
3. Verifique no n8n: **Executions** → última execução deve estar verde ✅
4. Abra o dashboard e veja o pedido já aparecendo!

### Monitoramento

**No n8n:**
- Vá em **Executions** para ver histórico
- Filtre por **Failed** para ver erros

**No Dashboard:**
- Verifique "Última Atualização" no header
- Deve mostrar timestamp recente (< 1 minuto)

---

## 🎉 Resultado Final

Agora você tem:

✅ **Sync automático em tempo real** (< 5 segundos)
✅ **Zero configuração manual** depois do setup
✅ **Retry automático** em caso de falha
✅ **Notificações** quando sync completa
✅ **Logs completos** no n8n
✅ **GitHub Actions como backup** (4x/dia)

**Melhor dos dois mundos:** Webhook instantâneo + Cron como fallback!

---

## 🆘 Troubleshooting

### Webhook não dispara

**Verificar:**
1. URL do webhook está correta no CartPanda?
2. Workflow está ATIVO (toggle verde) no n8n?
3. n8n está acessível publicamente? (teste: `curl https://n8n.seudominio.com/webhook/cartpanda-webhook`)

**Solução:**
```bash
# Teste manual do webhook
curl -X POST https://n8n.seudominio.com/webhook/cartpanda-webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"order.created","data":{"id":123}}'
```

### Sync demora muito

**Problema:** API do CartPanda está lenta ou muitos pedidos para sincronizar

**Solução:** Ajustar timeout no nó HTTP Request:
```json
{
  "options": {
    "timeout": 300000  // 5 minutos
  }
}
```

### Muitos webhooks simultâneos

**Problema:** CartPanda envia múltiplos webhooks ao mesmo tempo

**Solução:** Adicionar Queue Mode (ver "Configuração Avançada")

---

## 📚 Recursos Adicionais

- [n8n Documentation](https://docs.n8n.io/)
- [CartPanda API Webhooks](https://docs.cartpanda.com/webhooks)
- [Workflow JSON Completo](./n8n-workflows/cartpanda-sync.json)

---

**Última Atualização:** 2025-11-17
**Status:** ✅ Pronto para produção
**Testado com:** n8n v1.15.0, CartPanda API v3
