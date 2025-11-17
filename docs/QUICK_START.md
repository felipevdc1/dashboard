# 🚀 Quick Start - Retomar Trabalho

Este guia permite que você retome o trabalho rapidamente de onde parou, com contexto completo do estado atual do projeto.

**Última Atualização:** 2025-11-11 12:00 BRT

---

## ✅ Estado Atual do Projeto

### Status Geral
- ✅ **Produção:** Dashboard funcional e estável
- ✅ **Performance:** Cache multi-camadas (7438x mais rápido!)
- ✅ **Moeda:** BRL (Reais) como base
- ✅ **Integração:** CartPanda API v3 completa
- ✅ **Filtros:** 7 opções de período + custom
- ✅ **Receita:** Cálculo líquido (subtrai refunds/chargebacks)

### Última Modificação Realizada

**Data:** 2025-11-11
**Feature:** Sistema de Cache Multi-Camadas

**Arquivos modificados:**
- `lib/cache.ts` - Cache in-memory com TTL e auto-cleanup (NOVO)
- `app/api/metrics/route.ts` - Integração de cache de pedidos
- `lib/cartpanda/client.ts` - Timeout de 30s + suporte a cache
- `app/page.tsx` - SWR para cache client-side
- `package.json` - Adicionado SWR

**Performance:**
- Cache MISS (primeira carga): ~7.4s
- Cache HIT (cargas seguintes): ~1ms
- **7438x mais rápido!**

**Motivo:** Dashboard levava 7-15s para carregar. Agora carrega instantaneamente (1ms) após primeira carga.

---

## 🎯 Funcionalidades Implementadas

### Dashboard Principal
- [x] KPIs em tempo real (Receita, Pedidos, Ticket Médio, Conversão)
- [x] Gráfico de receita ao longo do tempo
- [x] Comparação automática com período anterior
- [x] Sparklines de tendência

### Filtros
- [x] Hoje
- [x] Ontem
- [x] Esta Semana
- [x] Última Semana
- [x] Este Mês
- [x] Mês Passado
- [x] Período personalizado (date picker)

### Analytics
- [x] Top 5 produtos por receita
- [x] Top 5 afiliados por performance
- [x] Tracking de refunds com %
- [x] Tracking de chargebacks com %
- [x] Feed de atividades recentes (4 últimas)

### Integrações
- [x] CartPanda API v3
- [x] Paginação automática
- [x] Filtro client-side de datas
- [x] Cache in-memory no servidor (5 min)
- [x] Cache client-side com SWR (auto-refresh)
- [x] Timeout de requests (30 segundos)

---

## 🔧 Como Rodar

### 1. Abrir o Projeto

```bash
cd "/Users/felipevdc1/Documents/projetos claude code/dashboard escala independente/dashboard"
```

### 2. Verificar Variáveis de Ambiente

```bash
cat .env.local
```

Deve conter:
```env
CARTPANDA_API_TOKEN=seu_token
CARTPANDA_STORE_NAME=seu_store
NEXT_PUBLIC_CARTPANDA_API_URL=https://api.cartpanda.com/v3
```

### 3. Rodar em Desenvolvimento

```bash
npm run dev
```

Dashboard disponível em: **http://localhost:3000**

### 4. Verificar Logs

Console do navegador mostrará:

**Primeira carga (Cache MISS):**
```
🌐 CartPanda API: https://api.cartpanda.com/v3/...
📅 Cache MISS - Fetching orders...
📦 Total orders fetched: 50
💾 Cache set: orders:start=2025-08-13&end=2025-11-11 (TTL: 300s)
⏱️ Request completed in 7438ms
```

**Cargas seguintes (Cache HIT):**
```
⚡ Cache HIT - Using cached orders: 50
✅ Orders in current period: 10
⏱️ Request completed in 1ms
```

---

## 📊 Métricas Atuais (Exemplo de Hoje)

```
Receita Total: R$ 75.218,34
Pedidos: 49
Ticket Médio: R$ 1.535,08
Taxa Conversão: 3.8% (mock)

Refunds: 1 (R$ 948,43) - 1.26%
Chargebacks: 1 (R$ 2.816,72) - 3.74%
```

---

## 🗂️ Estrutura de Arquivos Importantes

```
dashboard/
├── app/
│   ├── api/metrics/route.ts      ⭐ Lógica principal de dados
│   └── page.tsx                  ⭐ UI do dashboard
│
├── lib/
│   ├── cartpanda/
│   │   ├── client.ts             ⭐ Cliente HTTP API (com timeout)
│   │   ├── types.ts              ⭐ TypeScript types
│   │   └── utils.ts              ⭐ Cálculos e formatação
│   ├── cache.ts                  ⭐ Cache in-memory (NOVO)
│   └── dateUtils.ts              ⭐ Utilitários de data
│
├── components/
│   ├── DateRangePicker.tsx       Filtro de período
│   ├── StatCard.tsx              Card de KPI
│   ├── RevenueChart.tsx          Gráfico principal
│   ├── TopProducts.tsx           Lista de produtos
│   ├── AffiliatesTable.tsx       Tabela afiliados
│   ├── RefundChargebackCards.tsx Cards de problemas
│   └── ActivityFeed.tsx          Feed de atividades
│
└── docs/
    ├── API.md                    📖 Doc da API CartPanda
    └── QUICK_START.md            📖 Este arquivo
```

---

## 🔑 Decisões Importantes

### 1. Sistema de Cache Multi-Camadas

**Problema:** Dashboard levava 7-15 segundos para carregar a cada request.

**Solução:** Cache em 3 camadas:
- **Servidor (in-memory):** TTL de 5 minutos para pedidos
- **Cliente (SWR):** Deduplicação de 30 segundos + auto-refresh
- **HTTP Headers:** s-maxage de 300 segundos para CDN

**Resultado:**
```
Cache MISS: 7438ms (primeira carga)
Cache HIT:  1ms     (cargas seguintes)
Melhoria:   7438x mais rápido! 🚀
```

**Onde ler mais:** [DECISIONS.md - ADR 008](../DECISIONS.md#adr-008-sistema-de-cache-multi-camadas)

---

### 2. Por que BRL ao invés de USD?

**Problema:** Campo `local_currency_amount` (USD) tem valores errados em alguns pedidos.

**Exemplo:**
```
Pedido #10921:
  local_currency_amount: $490.00  ❌
  actual_price_paid: $196.00      ✅
  Diferença: $294!
```

**Solução:** Usar `total_price` (BRL) - sem anomalias.

**Onde ler mais:** [DECISIONS.md - ADR 001](../DECISIONS.md#adr-001-uso-de-brl-ao-invés-de-usd-como-moeda-base)

---

### 3. Por que filtro client-side?

**Problema:** API CartPanda ignora `start_date` e `end_date`.

```bash
# Sempre retorna os mesmos pedidos
curl "api/orders?start_date=2025-11-10" # => 50 pedidos
curl "api/orders?start_date=2025-11-09" # => 50 MESMOS pedidos
```

**Solução:** Buscar 90 dias e filtrar no servidor.

**Onde ler mais:** [DECISIONS.md - ADR 002](../DECISIONS.md#adr-002-filtro-de-datas-client-side-no-servidor)

---

### 4. Como evitar timezone shift?

**Problema:** Pedidos de Nov 9 apareciam como Nov 10.

```typescript
// ❌ Errado
new Date("2025-11-09T23:28:16-03:00").toISOString()
// => "2025-11-10T02:28:16.000Z" (mudou de dia!)

// ✅ Correto
extractLocalDate("2025-11-09T23:28:16-03:00")
// => "2025-11-09"
```

**Onde ler mais:** [DECISIONS.md - ADR 003](../DECISIONS.md#adr-003-extração-de-data-local-sem-conversão-utc)

---

## 🐛 Problemas Conhecidos

### ⚠️ Taxa de Conversão é Mock

```typescript
// lib/cartpanda/utils.ts linha 54
const conversionRate = 3.8;  // ⚠️ Valor fixo
const conversionChange = -1.2;
```

**Por que:** API não fornece dados de visitas/analytics.

**Como resolver:** Integrar com Google Analytics ou adicionar tracking manual.

---

### ⚠️ Variação % de Produtos é Zero

```typescript
// lib/cartpanda/utils.ts linha 166
change: 0, // ⚠️ Precisa dados históricos
```

**Por que:** Não temos snapshot de vendas anteriores.

**Como resolver:** Armazenar dados históricos em banco ou calcular comparando com período anterior.

---

### ⚠️ Limitado a 90 Dias

```typescript
// app/api/metrics/route.ts linha 39
start_date: getDateString(90), // Máximo 90 dias
```

**Por que:** Balancear performance vs completude de dados.

**Como resolver:** Aumentar período ou implementar paginação inteligente.

---

## 📝 Próximos Passos Sugeridos

### Alta Prioridade

- [ ] **Cálculo real de taxa de conversão**
  - Integrar com Google Analytics
  - Ou adicionar tracking de visitas

### Média Prioridade

- [ ] **Variação histórica de produtos**
  - Armazenar snapshot diário
  - Ou comparar com período anterior

- [ ] **Exportação de dados**
  - CSV de pedidos
  - PDF de relatórios
  - Excel com análises

- [ ] **Monitoramento de Cache**
  - Métricas de hit/miss rate
  - Alertas se cache rate < 80%
  - Dashboard de performance

### Baixa Prioridade

- [ ] Dark mode
- [ ] Notificações push
- [ ] Autenticação multi-usuário
- [ ] Filtros avançados
- [ ] Considerar Redis para produção multi-instância

---

## 🔍 Como Investigar Problemas

### Dashboard não carrega

1. **Verifique dev server:**
   ```bash
   # Terminal deve mostrar
   ✓ Ready in 2.3s
   ○ Local: http://localhost:3000
   ```

2. **Verifique console do navegador:**
   - Abra DevTools (F12)
   - Aba Console
   - Procure erros em vermelho

3. **Verifique .env.local:**
   ```bash
   cat .env.local
   # Confirme que token e store_name estão corretos
   ```

4. **Teste API diretamente:**
   ```bash
   curl -H "Authorization: Bearer SEU_TOKEN" \
     "https://api.cartpanda.com/v3/SEU_STORE/orders?per_page=1"
   ```

---

### Valores não batem com CartPanda

1. **Verifique período selecionado:**
   - Dashboard mostra período no header
   - CartPanda oficial usa que período?

2. **Compare logs do servidor:**
   ```
   Console mostra:
   📦 Total orders fetched: 50
   ✅ Orders in current period: 10
   ```

3. **Calcule manualmente:**
   - Baixe CSV da CartPanda
   - Some valores em Excel
   - Compare com dashboard

4. **Verifique refunds/chargebacks:**
   - Dashboard subtrai automaticamente
   - CartPanda oficial também subtrai

---

### Datas aparecem erradas

1. **Verifique timezone do sistema:**
   ```bash
   date
   # Deve mostrar horário de Brasília (-03:00)
   ```

2. **Confirme que usa extractLocalDate:**
   ```typescript
   // lib/cartpanda/utils.ts
   const orderDate = extractLocalDate(order.created_at);
   ```

3. **Teste com pedido específico:**
   ```typescript
   console.log(order.created_at);  // "2025-11-09T23:28:16-03:00"
   console.log(extractLocalDate(order.created_at));  // "2025-11-09"
   ```

---

## 📚 Onde Encontrar Informação

| Dúvida | Arquivo | Seção |
|--------|---------|-------|
| Como funciona a API? | `docs/API.md` | Estrutura de Dados |
| Por que essa decisão? | `DECISIONS.md` | ADR específico |
| O que mudou? | `CHANGELOG.md` | Data específica |
| Problemas resolvidos? | `DEVELOPMENT_LOG.md` | Sessão 2 |
| Como rodar? | `README.md` | Quick Start |
| Retomar trabalho? | `docs/QUICK_START.md` | Este arquivo |

---

## 💡 Dicas de Desenvolvimento

### Debug de Cálculos

Adicione logs temporários:

```typescript
// lib/cartpanda/utils.ts
function calculateRevenue(orders: CartPandaOrder[]): number {
  console.log('📊 Calculating revenue for', orders.length, 'orders');

  const totalRevenue = orders.reduce(...);
  console.log('💰 Total revenue:', totalRevenue);

  const refundedAmount = orders.reduce(...);
  console.log('💸 Refunded:', refundedAmount);

  const chargebackAmount = orders.reduce(...);
  console.log('⚠️ Chargebacks:', chargebackAmount);

  return totalRevenue - refundedAmount - chargebackAmount;
}
```

### Testar com Dados Mock

```typescript
// app/api/metrics/route.ts
// Descomentar para testar sem API
const mockOrders: CartPandaOrder[] = [...];
const currentOrders = mockOrders;
```

### Ver Requisições da API

```typescript
// lib/cartpanda/client.ts linha 36
console.log('🌐 CartPanda API:', url);
// Copia URL do console e testa no navegador
```

---

## 🎬 Próxima Sessão - Checklist

Quando voltar a trabalhar:

- [ ] Ler este arquivo (`docs/QUICK_START.md`)
- [ ] Ler última entrada do `DEVELOPMENT_LOG.md`
- [ ] Rodar `npm run dev`
- [ ] Abrir http://localhost:3000
- [ ] Verificar se dashboard carrega
- [ ] Checar console por erros
- [ ] Escolher próxima feature da lista
- [ ] Atualizar documentação após implementar

---

## 📞 Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Produção
npm start

# Type check
npx tsc --noEmit

# Ver estrutura de arquivos
tree -L 3 -I 'node_modules|.next'

# Ver logs em tempo real
# Console do navegador + terminal do servidor
```

---

## ✨ Lembre-se

1. **Cache é automático** - Primeira carga leva ~7s, seguintes ~1ms
2. **Sempre use BRL** (`total_price`) para cálculos monetários
3. **Filtros de data** são aplicados client-side no servidor
4. **Timezone** use `extractLocalDate()` para evitar shift
5. **Receita** é líquida (subtrai refunds/chargebacks)
6. **Documentação** atualize após cada mudança significativa
7. **Indicadores de cache** aparecem no header do dashboard (⚡/🌐)

---

**Bom trabalho! 🚀**

Se tiver dúvidas, consulte os arquivos de documentação listados acima.

---

**Última Sessão:** 2025-11-11 12:00 BRT
**Status:** ✅ Pronto para continuar
**Performance:** Cache implementado - 7438x mais rápido!
**Próxima Tarefa Sugerida:** Implementar cálculo real de taxa de conversão
