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

**⚠️ ATENÇÃO:** Configuração manual é MAIS CONFIÁVEL que importar JSON devido a diferenças de versão do n8n!

### 1.1 Configuração Manual (RECOMENDADO para n8n 1.119.2)

#### Criando Workflow do Zero

1. **Crie Novo Workflow**
   - Abra n8n
   - Clique em **"New Workflow"** ou **"+"**
   - Nomeie: "CartPanda Sync Automático"

2. **Adicione Webhook Trigger**
   - Clique no **"+"** no canvas
   - Procure e selecione: **"Webhook"**
   - Configure:
     - **HTTP Method:** POST
     - **Path:** `cartpanda-webhook`
     - **Respond:** Using 'Respond to Webhook' Node
   - Clique em **"Execute Node"** para gerar a URL do webhook
   - **COPIE** a URL gerada (algo como: `https://n8n.seudominio.com/webhook/cartpanda-webhook`)

3. **Adicione HTTP Request Node** ← CRÍTICO!
   - Clique no **"+"** → Arraste do **Webhook** node
   - Procure e selecione: **"HTTP Request"**
   - **IMPORTANTE:** Certifique-se de estar usando a versão mais recente (v4.1+)
   - Configure EXATAMENTE assim:
     - **Authentication:** None
     - **Request Method:** **POST** ← **VERIFIQUE DUAS VEZES!**
     - **URL:** `https://dashboard-eight-alpha-74.vercel.app/api/sync/incremental`
     - **Send Headers:** ✅ ON
       - Clique em **"Add Header"**
       - **Name:** `Content-Type`
       - **Value:** `application/json`
     - **Options:**
       - Clique em **"Add Option"** → **Timeout**
       - **Timeout:** `180000` (3 minutos)

4. **Adicione IF Node (Verificar Sucesso)**
   - Clique no **"+"** → Arraste do **HTTP Request**
   - Procure e selecione: **"IF"**
   - Configure:
     - **Condition Type:** String
     - **Value 1:** `={{ $json.success }}`
     - **Operation:** Equal
     - **Value 2:** `true`

5. **Adicione Respond to Webhook (Sucesso)**
   - Clique no **"+"** → Arraste da saída **TRUE** do IF
   - Procure e selecione: **"Respond to Webhook"**
   - Configure:
     - **Respond With:** JSON
     - **Response Body:**
       ```
       ={{ { "success": true, "message": "Sync triggered", "synced": $json.stats.synced } }}
       ```

6. **Adicione Respond to Webhook (Erro)**
   - Clique no **"+"** → Arraste da saída **FALSE** do IF
   - Procure e selecione: **"Respond to Webhook"**
   - Configure:
     - **Respond With:** JSON
     - **Response Body:**
       ```
       ={{ { "success": false, "error": $json.error || 'Unknown error' } }}
       ```
     - **Options:**
       - Clique em **"Add Option"** → **Response Code**
       - **Response Code:** `500`

7. **Salve e Ative**
   - Clique em **"Save"** (canto superior direito)
   - **ATIVE** o workflow (toggle verde)
   - Copie novamente a URL do Webhook se necessário

---

### 1.2 Importar Workflow JSON (Alternativa - Pode não funcionar em todas as versões)

**AVISO:** Se a importação não funcionar ou o método aparecer como GET, use a configuração manual acima!

O arquivo está em: `/config/webhook-n8n.json`

Ou cole este JSON no n8n (Menu → Import from clipboard):

```json
{
  "name": "CartPanda Sync Automático (CORRIGIDO)",
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
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "options": {
          "timeout": 180000,
          "redirect": {
            "redirect": {}
          }
        }
      },
      "id": "call-sync-api",
      "name": "Disparar Sync Incremental",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
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

**Mudanças da versão corrigida:**
- ✅ `typeVersion: 4.1` (versão mais recente do HTTP Request node)
- ✅ `sendHeaders: true` + `Content-Type: application/json` (header explícito)
- ✅ Configuração de redirect adicionada
- ✅ Resolve erro 405 "Method not allowed"

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

### Erro 405 "Method not allowed" (MUITO COMUM!)

**Sintoma:**
```json
{
  "errorMessage": "Method not allowed - please check you are using the right HTTP method",
  "httpCode": "405",
  "n8nDetails": {
    "nodeName": "Disparar Sync Incremental",
    "nodeType": "n8n-nodes-base.httpRequest",
    "nodeVersion": 4.1
  }
}
```

**Causa Raiz:** O nó HTTP Request está configurado com método **GET** em vez de **POST**!

Isso acontece quando:
1. O JSON foi importado mas o n8n não aplicou a configuração corretamente
2. A versão do n8n (1.119.2) tem incompatibilidades com o JSON exportado
3. Cache do navegador/n8n está interferindo

---

#### Solução Passo a Passo:

**OPÇÃO 1: Reconfigurar Manualmente (RECOMENDADO)**

1. **Verifique o método atual:**
   - Abra o workflow no n8n
   - Clique no nó **"Disparar Sync Incremental"** (HTTP Request)
   - **OLHE** o campo **"Request Method"**
   - Se estiver **GET** → está errado! ❌
   - Deve estar **POST** ✅

2. **Corrija o método:**
   - No mesmo nó, mude **Request Method** de **GET** para **POST**
   - Verifique **Send Headers** está **ON**
   - Verifique se tem header `Content-Type: application/json`
   - Clique em **"Save"**

3. **Limpe o cache do n8n:**
   - Feche e abra o workflow novamente
   - Ou faça **hard refresh** no navegador (Ctrl+Shift+R)

4. **Teste novamente:**
   ```bash
   curl -X POST https://n8n.seudominio.com/webhook/cartpanda-webhook \
     -H "Content-Type: application/json" \
     -d '{"event":"order.created","data":{"id":123}}'
   ```

**OPÇÃO 2: Deletar e Recriar do Zero**

Se a Opção 1 não funcionar:
1. **Delete o workflow** completamente
2. Siga a seção **1.1 Configuração Manual** acima
3. Configure CADA node manualmente, verificando **2x** o método POST

---

**Resultado Esperado (quando funcionar):**
```json
{
  "success": true,
  "message": "Sync triggered",
  "synced": 11
}
```

**Screenshot do n8n mostrando POST correto:**
```
┌─────────────────────────────────┐
│  HTTP Request Node              │
├─────────────────────────────────┤
│ Request Method: POST  ← CORRETO │
│ URL: https://dashboard...       │
│ Send Headers: ✓                 │
│   Content-Type: application/... │
└─────────────────────────────────┘
```

---

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
