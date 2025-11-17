# Dashboard Beliuim Caps

Dashboard analytics em tempo real integrado com CartPanda API v3 e Supabase para acompanhamento de vendas, pedidos, afiliados e performance de produtos.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3-cyan)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

## 📊 Features

- **⚡ Performance Ultra-Rápida com Supabase**
  - Queries SQL diretas ao invés de paginação de API
  - **100x mais rápido** que versão anterior (CartPanda API direta)
  - Primeira carga: ~1.5s | Com cache: ~20ms
  - Cache em memória de 2 minutos
  - Auto-refresh a cada 5 minutos
  - Indicadores visuais de cache (⚡/🌐)

- **📈 KPIs em Tempo Real**
  - Receita total líquida (BRL)
  - Número de pedidos
  - Ticket médio
  - Taxa de conversão

- **📅 Filtros de Data Avançados**
  - Hoje, Ontem
  - Esta Semana, Última Semana
  - Este Mês, Mês Passado
  - Seletor de período personalizado

- **📉 Gráficos e Trends**
  - Gráfico de receita ao longo do tempo
  - Sparklines de tendência para cada KPI
  - Comparação automática com período anterior

- **🏆 Rankings**
  - Top 5 produtos mais vendidos (por receita)
  - Top 5 afiliados por performance
  - Comissões calculadas automaticamente

- **⚠️ Tracking de Problemas**
  - Reembolsos (refunds) com percentual
  - Chargebacks com percentual
  - Cards separados com alertas visuais

- **📰 Feed de Atividades**
  - Novos pedidos aprovados
  - Reembolsos solicitados
  - Chargebacks recebidos
  - Timestamps relativos

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta CartPanda com acesso à API
- Conta Supabase (free tier funciona perfeitamente)

### Instalação

```bash
# Clone o repositório (se aplicável)
git clone <repo-url>
cd dashboard

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

### Configuração

#### 1. Crie o arquivo `.env.local` na raiz do projeto:

```env
# CartPanda API
NEXT_PUBLIC_CARTPANDA_API_URL=https://accounts.cartpanda.com/api/v3
CARTPANDA_API_TOKEN=seu_token_cartpanda
CARTPANDA_STORE_NAME=seu_store_name

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_supabase
```

#### 2. Configure o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Copie a URL e a Anon Key do projeto
3. Execute o SQL em **SQL Editor** do Supabase:

```bash
# O arquivo SQL está em:
cat supabase/schema.sql
```

Cole o conteúdo completo no SQL Editor e execute.

4. **Importante:** Desabilite Row Level Security (RLS) na tabela `orders`:
   - Vá em **Table Editor** → **orders**
   - Clique em **RLS disabled** (toggle)

#### 3. Sincronize os dados do CartPanda para o Supabase

Execute o script de sync inicial:

```bash
# Sync direto (recomendado)
NEXT_PUBLIC_CARTPANDA_API_URL="https://accounts.cartpanda.com/api/v3" \
CARTPANDA_API_TOKEN="seu_token" \
CARTPANDA_STORE_NAME="seu_store" \
NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua_chave" \
npx tsx scripts/direct-sync.ts
```

Esse comando vai:
- Buscar todos os pedidos da CartPanda (~3000 pedidos em ~5 minutos)
- Sincronizar com o Supabase (~3 segundos para inserir)
- Exibir progresso e estatísticas

**Recomendação:** Configure um cron job para executar o sync a cada 15-30 minutos e manter os dados atualizados.

### Desenvolvimento

```bash
# Rodar em modo desenvolvimento
npm run dev

# Abra http://localhost:3000
```

### Produção

```bash
# Build de produção
npm run build

# Rodar produção
npm start
```

## 📁 Estrutura do Projeto

```
dashboard/
├── app/
│   ├── api/
│   │   └── metrics/
│   │       └── route.ts          # API Route para processar dados
│   ├── globals.css               # Estilos globais + Tailwind
│   ├── layout.tsx                # Layout raiz
│   └── page.tsx                  # Página principal do dashboard
│
├── components/
│   ├── ActivityFeed.tsx          # Feed de atividades recentes
│   ├── AffiliatesTable.tsx       # Tabela de afiliados
│   ├── DateRangePicker.tsx       # Seletor de período
│   ├── RefundChargebackCards.tsx # Cards de refunds/chargebacks
│   ├── RevenueChart.tsx          # Gráfico de receita
│   ├── StatCard.tsx              # Card de KPI
│   └── TopProducts.tsx           # Lista de top produtos
│
├── lib/
│   ├── cartpanda/
│   │   ├── client.ts             # Cliente HTTP CartPanda API
│   │   ├── types.ts              # TypeScript types da API
│   │   └── utils.ts              # Funções de cálculo e formatação
│   ├── cache.ts                  # Sistema de cache in-memory
│   └── dateUtils.ts              # Utilitários de data
│
├── docs/
│   ├── API.md                    # Documentação da API CartPanda
│   └── QUICK_START.md            # Guia rápido para retomar trabalho
│
├── CHANGELOG.md                  # Histórico de mudanças
├── DECISIONS.md                  # Decisões arquiteturais (ADR)
├── DEVELOPMENT_LOG.md            # Log de desenvolvimento
├── README.md                     # Este arquivo
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 🔧 Tecnologias Utilizadas

- **Framework:** Next.js 15 (App Router)
- **Linguagem:** TypeScript (strict mode)
- **Estilização:** Tailwind CSS
- **Design:** Glassmorphism
- **Database:** Supabase PostgreSQL (free tier)
- **API:** CartPanda v3 REST API
- **Charts:** Recharts (para gráficos)
- **Cache:** SWR (React Hooks) + In-Memory Cache
- **Performance:** SQL queries diretas (1-2s) + Cache (20ms)

## 📚 Documentação

- **[CHANGELOG.md](./CHANGELOG.md)** - Histórico de todas as alterações
- **[DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md)** - Log detalhado de desenvolvimento
- **[DECISIONS.md](./DECISIONS.md)** - Decisões arquiteturais (ADR)
- **[docs/API.md](./docs/API.md)** - Documentação da integração CartPanda
- **[docs/QUICK_START.md](./docs/QUICK_START.md)** - Guia para retomar trabalho

## 🎯 Decisões Técnicas Importantes

### Como funciona o sistema de cache?

Cache em 3 camadas para máxima performance:
- **Servidor (in-memory):** TTL de 5 minutos para pedidos
- **Cliente (SWR):** Deduplicação de 30 segundos + auto-refresh
- **HTTP Headers:** s-maxage de 300 segundos para CDN

**Resultado:** 7438x mais rápido após primeira carga! Veja [ADR 008](./DECISIONS.md#adr-008-sistema-de-cache-multi-camadas).

### Por que BRL ao invés de USD?

Campo `total_price` (BRL) é a "fonte da verdade" na API CartPanda. Campo USD (`local_currency_amount`) apresenta anomalias em alguns pedidos. Veja [ADR 001](./DECISIONS.md#adr-001-uso-de-brl-ao-invés-de-usd-como-moeda-base).

### Por que filtro client-side?

API CartPanda não respeita parâmetros `start_date` e `end_date`. Solução: buscar últimos 90 dias e filtrar no servidor. Veja [ADR 002](./DECISIONS.md#adr-002-filtro-de-datas-client-side-no-servidor).

### Por que extrair data sem UTC?

Conversão para UTC causa shift de datas. Pedidos de 23h viram dia seguinte. Extraímos data local direto da string ISO. Veja [ADR 003](./DECISIONS.md#adr-003-extração-de-data-local-sem-conversão-utc).

### Como é calculada a receita?

Receita líquida = Pedidos pagos - Refunds - Chargebacks. Isso alinha com o dashboard oficial da CartPanda. Veja [ADR 004](./DECISIONS.md#adr-004-subtração-de-refunds-e-chargebacks-da-receita).

## 🔑 Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `CARTPANDA_API_TOKEN` | Token de autenticação da API CartPanda | `4QypzWuX...` |
| `CARTPANDA_STORE_NAME` | Nome da sua loja | `minhaloja` |
| `NEXT_PUBLIC_CARTPANDA_API_URL` | URL base da API CartPanda | `https://accounts.cartpanda.com/api/v3` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase | `eyJhbGc...` |

## ⚠️ Limitações Conhecidas

### Vercel Hobby Plan - Timeout em /api/sync

**Problema:** O endpoint `/api/sync` tem timeout de 10 segundos no Vercel Hobby plan, mas a sincronização completa leva ~15-20 minutos para 10,000 pedidos.

**Impacto:**
- ❌ Sync via API (`POST /api/sync`) sempre falha com HTTP 504
- ❌ Cron jobs do Vercel não funcionam para full sync
- ✅ Sync local via script funciona perfeitamente

**Workaround:**
```bash
# Execute sync LOCALMENTE via terminal:
npm run sync:full

# Ou configure cron job no seu servidor (não no Vercel):
*/30 * * * * cd /caminho/projeto && npm run sync:full >> sync.log 2>&1
```

**Solução permanente:** Upgrade para Vercel Pro ($20/mês) com timeout de 5 minutos, ou migrar sync para serverless function separada (AWS Lambda, Google Cloud Functions).

### Supabase Free Tier - Cloudflare 524 Timeouts

**Problema:** Batches grandes (500+ orders) podem exceder 100 segundos e causar timeout do Cloudflare (Error 524).

**Solução implementada:**
- ✅ Batch size reduzido de 500 → 100 orders
- ✅ Retry automático com exponential backoff (até 3 tentativas)
- ✅ Delay de 200ms entre batches
- ✅ Max retry de 10 segundos

**Performance esperada:**
- 10,000 pedidos em ~100 batches
- ~30-40 minutos para sync completo
- Taxa de sucesso > 99%

### Webhook Payload Format

**Status:** 🚧 Em investigação

O formato exato do payload do webhook CartPanda ainda não foi confirmado. Debug logging está ativo para capturar o próximo evento real.

**Localização dos logs:** Vercel → Deployment → Runtime Logs → `/api/webhook/cartpanda`

## 🐛 Troubleshooting

### Dashboard não carrega dados

1. Verifique se as variáveis de ambiente estão corretas
2. Confirme que o token CartPanda está válido
3. Verifique o console do navegador para erros
4. Veja logs do servidor: `npm run dev`

### Sync falhando com "Cloudflare 524"

Execute com batch size menor:
```bash
npm run sync:full -- --batch-size=50
```

### Datas aparecem erradas

O sistema usa `extractLocalDate()` para preservar timezone. Se ainda assim houver problemas, verifique o formato da data retornada pela API.

### Valores não batem com CartPanda

Dashboard calcula receita líquida (subtrai refunds e chargebacks). Se ainda houver discrepância > 1%, verifique se há pedidos com status diferentes.

### Vercel Timeout (HTTP 504)

Se estiver tentando usar `/api/sync` via HTTP:
```bash
# ❌ NÃO FUNCIONA no Vercel Hobby:
curl -X POST https://seu-app.vercel.app/api/sync

# ✅ USE sync local:
npm run sync:full
```

## 📊 Métricas e Performance

### Performance: CartPanda API vs Supabase

| Métrica | CartPanda API (v1) | Supabase (v2) | Melhoria |
|---------|-------------------|---------------|----------|
| Primeira carga | 136-169s | 1.2-1.5s | **~100x** |
| Com cache | 18-40ms | instantâneo | - |
| Queries SQL | N/A | 1.1-1.5s | ⚡ |
| Escalabilidade | Limitada (API timeout) | Alta (SQL direto) | ✅ |
| Sync necessário | Não | Sim (15-30min) | - |

### Configurações

- **Database:** Supabase PostgreSQL (3000 pedidos)
- **Cache TTL:** 2 minutos (servidor)
- **Auto-refresh:** 5 minutos (SWR)
- **Sync:** Script manual ou cron job (15-30 minutos)
- **Query:** SQL direto com filtros de data
- **HTTP Cache:** s-maxage=120s para CDN

## 🔄 Sincronização de Dados

### ⚡ Sync Automático via GitHub Actions (RECOMENDADO)

**100% AUTOMÁTICO e GRATUITO** - Configure uma vez e nunca mais se preocupe!

#### Como funciona:
- ✅ Sync automático **4x por dia** (00:00, 06:00, 12:00, 18:00 UTC)
- ✅ Validação automática diária às 06:00 AM (Brasília)
- ✅ Full sync automático se validação falhar
- ✅ Zero intervenção manual necessária
- ✅ 100% gratuito (GitHub Actions free tier)

#### Setup (5 minutos):

**Opção 1: Via Script Automático** (mais fácil)
```bash
# Execute o script de setup
./scripts/setup-github-secrets.sh
```

O script vai guiar você pelo processo de configurar os 5 secrets necessários.

**Opção 2: Manual via GitHub Web**
1. Acesse: `https://github.com/SEU_USUARIO/dashboard/settings/secrets/actions`
2. Clique em "New repository secret"
3. Adicione os 5 secrets:

| Nome do Secret | Valor |
|----------------|-------|
| `NEXT_PUBLIC_CARTPANDA_API_URL` | `https://accounts.cartpanda.com/api/v3` |
| `CARTPANDA_API_TOKEN` | Seu token CartPanda |
| `CARTPANDA_STORE_NAME` | Nome da sua loja |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima Supabase |

**Opção 3: Via GitHub CLI** (mais rápido)
```bash
gh secret set NEXT_PUBLIC_CARTPANDA_API_URL -b'https://accounts.cartpanda.com/api/v3'
gh secret set CARTPANDA_API_TOKEN -b'seu_token'
gh secret set CARTPANDA_STORE_NAME -b'seu_store'
gh secret set NEXT_PUBLIC_SUPABASE_URL -b'https://seu-projeto.supabase.co'
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY -b'sua_chave'
```

#### Verificar se está funcionando:
```bash
# 1. Acesse: https://github.com/SEU_USUARIO/dashboard/actions
# 2. Selecione "Hourly Incremental Sync"
# 3. Clique em "Run workflow" → "Run workflow"
# 4. Aguarde ~2-5 minutos
# 5. Deve aparecer ✅ verde se funcionou
```

#### Horários de execução automática:
| Horário (UTC) | Horário (Brasília) | Ação |
|---------------|-------------------|------|
| 00:00 | 21:00 (9 PM) | Sync Incremental |
| 06:00 | 03:00 (3 AM) | Sync Incremental |
| 09:00 | 06:00 (6 AM) | Validação Diária |
| 12:00 | 09:00 (9 AM) | Sync Incremental |
| 18:00 | 15:00 (3 PM) | Sync Incremental |

**Resultado:** Dashboard sempre atualizado (máximo 6h de delay) sem NENHUMA intervenção manual! 🎉

---

### 🖥️ Sync Manual (quando necessário)

Para atualizar os dados do Supabase manualmente:

```bash
# Sync completo (todos os pedidos)
npm run sync:full

# Ou com variáveis de ambiente inline:
NEXT_PUBLIC_CARTPANDA_API_URL="https://accounts.cartpanda.com/api/v3" \
CARTPANDA_API_TOKEN="seu_token" \
CARTPANDA_STORE_NAME="seu_store" \
NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua_chave" \
npx tsx scripts/direct-sync.ts
```

### 📅 Sync via Cron Job Local (alternativa)

Se preferir rodar no seu próprio servidor:

```bash
# Edite o crontab
crontab -e

# Adicione esta linha (ajuste o caminho):
*/15 * * * * cd /caminho/para/dashboard && /usr/local/bin/npx tsx scripts/direct-sync.ts >> /var/log/cartpanda-sync.log 2>&1
```

**Nota:** GitHub Actions é mais confiável e não requer servidor próprio!

### Status do Sync

Verifique o status da sincronização via API:

```bash
# GET /api/sync retorna status
curl http://localhost:3000/api/sync

# Resposta:
{
  "success": true,
  "status": {
    "totalOrders": 3000,
    "lastSyncAt": "2025-11-12T20:05:48.118Z"
  }
}
```

## 🔮 Próximos Passos

- [ ] Implementar cálculo real de taxa de conversão
- [ ] Adicionar variação histórica para produtos
- [ ] Exportação de dados (CSV, PDF)
- [ ] Dark mode
- [ ] Notificações em tempo real
- [ ] Autenticação multi-usuário

Veja lista completa em [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md#próximos-passos-sugeridos).

## 🤝 Contribuindo

1. Leia [DECISIONS.md](./DECISIONS.md) para entender decisões arquiteturais
2. Veja [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md) para contexto histórico
3. Atualize documentação ao fazer mudanças
4. Siga convenções TypeScript e Tailwind já estabelecidas

## 📝 Changelog

Veja [CHANGELOG.md](./CHANGELOG.md) para histórico detalhado de mudanças.

## 📄 Licença

[Adicionar licença se aplicável]

## 👤 Autor

Dashboard desenvolvido para operação Beliuim Caps com integração CartPanda.

---

**Última Atualização:** 2025-11-12
**Versão:** 2.0.0
**Status:** ✅ Produção
**Performance:** ⚡ Supabase + Cache (100x mais rápido que v1)
**Database:** 📊 3000 pedidos sincronizados
