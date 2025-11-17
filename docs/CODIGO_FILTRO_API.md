# Código - Filtro da API e Variável Monetária

Documentação técnica mostrando como implementamos o filtro de pedidos e qual variável da API CartPanda utilizamos para cálculos monetários.

---

## 1. Variável Monetária Utilizada

### Campo da API: `total_price`

**Tipo:** `string` (formato: `"1,707.31"`)
**Moeda:** BRL (Reais Brasileiros)
**Localização na API:** `order.total_price`

### Código - Type Definition

```typescript
// lib/cartpanda/types.ts
export interface CartPandaOrder {
  id: number;
  order_number: string;

  // VARIÁVEL UTILIZADA ✅
  total_price: string; // "1,707.31" (BRL)

  // Outras variáveis disponíveis (NÃO utilizadas)
  local_currency_amount: string; // "322.67" (USD)
  exchange_rate_USD: string; // "0.18899300"

  // ... outros campos
}
```

### Por Que Usamos `total_price`?

1. ✅ É a "fonte da verdade" - valor real cobrado do cliente
2. ✅ Está em BRL (moeda brasileira)
3. ❌ Campo USD (`local_currency_amount`) apresenta anomalias em alguns pedidos

**Referência:** ADR 001 no arquivo `DECISIONS.md`

---

## 2. Exemplo de Pedido da API

```json
{
  "id": 41960751,
  "order_number": "10934",
  "status_id": "New",
  "financial_status": 3,
  "payment_status": 3,
  "created_at": "2025-11-10T19:16:28-03:00",

  "total_price": "1,707.31",
  "subtotal_price": "1,555.61",
  "current_total_tax": "151.70",

  "local_currency_amount": "322.67",
  "exchange_rate_USD": "0.18899300",

  "customer": {
    "id": 85283301,
    "email": "george@mooreconstruction.com",
    "first_name": "George",
    "last_name": "Campbell"
  },

  "line_items": [
    {
      "id": 51427541,
      "product_id": 25748623,
      "title": "CLARITY MAX - 6 Bottles - TB",
      "quantity": 1,
      "total_price": "1,555.61"
    }
  ]
}
```

---

## 3. Código - Uso da Variável `total_price`

### 3.1. Cálculo de Receita

```typescript
// lib/cartpanda/utils.ts - Linha 96

/**
 * Calculate net revenue from orders in BRL (after refunds and chargebacks)
 */
function calculateRevenue(orders: CartPandaOrder[]): number {
  // Soma todos os pedidos pagos
  const totalRevenue = orders.reduce((sum, order) => {
    if (isOrderPaid(order)) {
      // ✅ AQUI: Usamos total_price (BRL)
      return sum + parsePrice(order.total_price);
    }
    return sum;
  }, 0);

  // Subtrai pedidos reembolsados
  const refundedAmount = orders.reduce((sum, order) => {
    if (order.status_id === "Refunded") {
      // ✅ AQUI: Usamos total_price (BRL)
      return sum + parsePrice(order.total_price);
    }
    return sum;
  }, 0);

  // Subtrai pedidos com chargeback
  const chargebackAmount = orders.reduce((sum, order) => {
    if (order.status_id === "Chargeback") {
      // ✅ AQUI: Usamos total_price (BRL)
      return sum + parsePrice(order.total_price);
    }
    return sum;
  }, 0);

  // Retorna receita líquida (total - refunds - chargebacks)
  return totalRevenue - refundedAmount - chargebackAmount;
}

/**
 * Parse CartPanda price string to number
 * Converts "1,707.31" to 1707.31
 */
function parsePrice(price: string | number): number {
  if (typeof price === 'number') return price;
  // Remove vírgulas e converte para número
  return parseFloat(price.replace(/,/g, ''));
}
```

### 3.2. Top Produtos

```typescript
// lib/cartpanda/utils.ts - Linha 137

function getTopProducts(orders: CartPandaOrder[]): ProductPerformance[] {
  const productMap = new Map<string, { name: string; sales: number; revenue: number }>();

  orders.forEach((order) => {
    if (isOrderPaid(order)) {
      order.line_items?.forEach((item) => {
        const productId = item.product_id.toString();
        const existing = productMap.get(productId) || {
          name: item.title || item.name,
          sales: 0,
          revenue: 0,
        };

        productMap.set(productId, {
          name: item.title || item.name,
          sales: existing.sales + item.quantity,
          // ✅ AQUI: Usamos total_price do item (BRL)
          revenue: existing.revenue + parsePrice(item.total_price),
        });
      });
    }
  });

  return Array.from(productMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      sales: data.sales,
      revenue: data.revenue,
      change: 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}
```

### 3.3. Top Afiliados

```typescript
// lib/cartpanda/utils.ts - Linha 174

function getTopAffiliates(orders: CartPandaOrder[]): AffiliatePerformance[] {
  const affiliateMap = new Map<string, { /* ... */ }>();

  orders.forEach((order) => {
    if (isOrderPaid(order) && order.affiliate_name && order.affiliate_email) {
      const affiliateId = order.affiliate_slug || order.affiliate_email;
      const existing = affiliateMap.get(affiliateId) || { /* ... */ };

      // ✅ AQUI: Usamos total_price do pedido (BRL)
      const orderRevenue = parsePrice(order.total_price);
      const orderCommission = parsePrice(order.affiliate_amount || '0');

      affiliateMap.set(affiliateId, {
        ...existing,
        sales: existing.sales + 1,
        revenue: existing.revenue + orderRevenue,
        commission: existing.commission + orderCommission,
      });
    }
  });

  return Array.from(affiliateMap.entries())
    .map(([id, data]) => ({ /* ... */ }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}
```

---

## 4. Filtro de Datas (Client-Side)

### Problema

A API CartPanda **não respeita** os parâmetros `start_date` e `end_date`. Sempre retorna os mesmos pedidos, independente dos parâmetros enviados.

**Referência:** ADR 002 no arquivo `DECISIONS.md`

### Solução

1. Buscamos **sempre os últimos 90 dias** da API
2. Armazenamos em **cache por 5 minutos**
3. Filtramos os pedidos **no servidor** (client-side filtering)

### Código Completo do Filtro

```typescript
// app/api/metrics/route.ts - Linha 11

export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    // 1. Recebe os parâmetros de data do usuário
    const startDate = searchParams.get('start_date'); // Ex: "2025-11-11"
    const endDate = searchParams.get('end_date');     // Ex: "2025-11-11"

    let currentStartDate: string;
    let currentEndDate: string;

    if (startDate && endDate) {
      // Usa o período fornecido pelo usuário
      currentStartDate = startDate;
      currentEndDate = endDate;
    } else {
      // Default: últimos 30 dias
      currentEndDate = getDateString(0);
      currentStartDate = getDateString(30);
    }

    // 2. Gera chave de cache (sempre 90 dias)
    const ordersCacheKey = generateCacheKey('orders', {
      start: getDateString(90),  // 90 dias atrás
      end: getDateString(0),     // hoje
    });

    // 3. Verifica se tem cache
    let allOrders = memoryCache.get<any[]>(ordersCacheKey);

    if (!allOrders) {
      // 4. Cache MISS - Busca da API CartPanda
      console.log('📅 Cache MISS - Fetching orders from API');

      // ⚠️ API IGNORA esses parâmetros!
      // Sempre retorna os mesmos ~50 pedidos
      allOrders = await cartPandaClient.getAllOrders({
        start_date: getDateString(90), // Pedimos 90 dias
        end_date: getDateString(0),    // até hoje
      });

      // Armazena no cache por 5 minutos
      memoryCache.set(ordersCacheKey, allOrders, 5 * 60 * 1000);
      console.log('📦 Total orders fetched:', allOrders.length);
    } else {
      // Cache HIT - Usa pedidos do cache
      console.log('⚡ Cache HIT - Using cached orders:', allOrders.length);
    }

    // 5. FILTRO CLIENT-SIDE (no servidor)
    // Filtra os pedidos pelo período selecionado pelo usuário
    const currentOrders = allOrders.filter(order => {
      // Extrai data local sem conversão UTC
      // "2025-11-09T23:28:16-03:00" → "2025-11-09"
      const orderDate = extractLocalDate(order.created_at);

      // Compara com o período selecionado
      // Ex: "2025-11-09" >= "2025-11-11" && "2025-11-09" <= "2025-11-11"
      return orderDate >= currentStartDate && orderDate <= currentEndDate;
    });

    console.log('✅ Orders in current period:', currentOrders.length);

    // 6. Calcula período de comparação (período anterior)
    const comparison = getComparisonPeriod(currentStartDate, currentEndDate);
    const previousOrders = allOrders.filter(order => {
      const orderDate = extractLocalDate(order.created_at);
      return orderDate >= comparison.start && orderDate <= comparison.end;
    });

    console.log('✅ Orders in comparison period:', previousOrders.length);

    // 7. Calcula métricas usando pedidos filtrados
    const metrics = calculateMetrics(currentOrders, previousOrders);
    const activities = getRecentActivities(currentOrders);

    const duration = Date.now() - startTime;
    console.log(`⏱️  Request completed in ${duration}ms`);

    // 8. Retorna resposta com metadados
    return NextResponse.json({
      metrics,
      activities,
      lastUpdated: new Date().toISOString(),
      dateRange: {
        start: currentStartDate,
        end: currentEndDate,
      },
      _meta: {
        cached: allOrders !== null,
        duration,
        ordersTotal: allOrders?.length || 0,      // Total buscado
        ordersFiltered: currentOrders.length,     // Total filtrado
      },
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

/**
 * Converte "dias atrás" para string de data YYYY-MM-DD
 */
function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0]; // "2025-11-11"
}
```

### Função de Extração de Data

```typescript
// lib/cartpanda/utils.ts - Linha 22

/**
 * Extract local date from ISO datetime string with timezone
 * Extracts "2025-11-09" from "2025-11-09T23:28:16-03:00"
 * This preserves the local date without converting to UTC
 */
export function extractLocalDate(dateString: string): string {
  // Simplesmente pega a parte da data antes do "T"
  // Exemplo: "2025-11-09T23:28:16-03:00" → "2025-11-09"
  return dateString.split('T')[0];
}
```

**Por que isso é importante?**

Se usássemos `new Date(dateString).toISOString()`, o JavaScript converteria para UTC e mudaria o dia:
- Input: `"2025-11-09T23:28:16-03:00"` (9 de novembro às 23h no Brasil)
- UTC: `"2025-11-10T02:28:16.000Z"` (10 de novembro às 2h UTC)
- Problema: O pedido apareceria no dia 10, não no dia 9!

---

## 5. Exemplo de Logs do Console

Quando você acessa o dashboard, vê estes logs no terminal do servidor:

```
📅 Cache MISS - Fetching orders from API
🌐 CartPanda API: https://accounts.cartpanda.com/api/v3/beliuimcaps/orders
📦 Total orders fetched: 50
✅ Orders in current period: 3
✅ Orders in comparison period: 2
⏱️  Request completed in 7438ms
```

Quando o cache está ativo (próximos 5 minutos):

```
⚡ Cache HIT - Using cached orders: 50
✅ Orders in current period: 3
✅ Orders in comparison period: 2
⏱️  Request completed in 1ms
```

---

## 6. Fluxo Visual Completo

```
┌─────────────────────────────────────────────────────────┐
│  USUÁRIO SELECIONA: "Hoje" (2025-11-11)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  REQUEST: /api/metrics?start_date=2025-11-11           │
│                       &end_date=2025-11-11              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  API ROUTE RECEBE:                                      │
│    currentStartDate = "2025-11-11"                      │
│    currentEndDate   = "2025-11-11"                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  BUSCA NA CARTPANDA API:                                │
│    getAllOrders({                                       │
│      start_date: "2025-08-13",  // 90 dias atrás       │
│      end_date: "2025-11-11"     // hoje                 │
│    })                                                    │
│                                                          │
│  ⚠️  API IGNORA esses parâmetros                        │
│  Sempre retorna mesmos ~50 pedidos                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  RECEBE 50 PEDIDOS (exemplo):                           │
│    [                                                     │
│      { created_at: "2025-11-10T19:16:28-03:00", ... },  │
│      { created_at: "2025-11-09T14:22:11-03:00", ... },  │
│      { created_at: "2025-11-08T08:15:33-03:00", ... },  │
│      ...                                                 │
│    ]                                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  FILTRO CLIENT-SIDE (NO SERVIDOR):                      │
│                                                          │
│  currentOrders = allOrders.filter(order => {            │
│    const orderDate = extractLocalDate(                  │
│      order.created_at                                   │
│    );                                                    │
│    // "2025-11-10T19:16:28-03:00" → "2025-11-10"       │
│    // "2025-11-09T14:22:11-03:00" → "2025-11-09"       │
│                                                          │
│    return orderDate >= "2025-11-11" &&                  │
│           orderDate <= "2025-11-11";                    │
│  });                                                     │
│                                                          │
│  RESULTADO: Apenas pedidos do dia 2025-11-11           │
│  (neste exemplo: 0 pedidos)                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  CALCULA MÉTRICAS:                                      │
│    - Receita: R$ 0,00                                   │
│    - Pedidos: 0                                         │
│    - Ticket Médio: R$ 0,00                              │
│                                                          │
│  Usando order.total_price (BRL)                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  RESPOSTA JSON:                                         │
│  {                                                       │
│    metrics: { revenue: { total: 0, ... }, ... },       │
│    activities: [],                                      │
│    dateRange: {                                         │
│      start: "2025-11-11",                               │
│      end: "2025-11-11"                                  │
│    },                                                    │
│    _meta: {                                             │
│      cached: false,                                     │
│      duration: 7438,                                    │
│      ordersTotal: 50,      ← Total buscado da API      │
│      ordersFiltered: 0     ← Total após filtro         │
│    }                                                     │
│  }                                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Resumo Técnico

### Variável Monetária
- **Campo usado:** `order.total_price`
- **Tipo:** `string` (formato: `"1,707.31"`)
- **Moeda:** BRL (Reais Brasileiros)
- **Decisão:** ADR 001 em `DECISIONS.md`

### Filtro de Datas
- **Método:** Client-side filtering (no servidor)
- **Motivo:** API CartPanda ignora parâmetros de data
- **Período buscado:** Últimos 90 dias (sempre)
- **Cache:** 5 minutos
- **Decisão:** ADR 002 e ADR 008 em `DECISIONS.md`

### Arquivos Principais
- `lib/cartpanda/utils.ts` - Cálculos e uso de `total_price`
- `lib/cartpanda/types.ts` - Type definitions da API
- `app/api/metrics/route.ts` - Filtro de datas
- `lib/cache.ts` - Sistema de cache

---

**Documentação gerada em:** 2025-11-11
**Versão do Dashboard:** 1.1.0
