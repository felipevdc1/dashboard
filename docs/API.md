# CartPanda API v3 - Documentação de Integração

Este documento detalha a integração com a API CartPanda v3, incluindo endpoints utilizados, estrutura de dados, campos importantes e limitações conhecidas.

## 📌 Informações Básicas

- **Base URL:** `https://api.cartpanda.com/v3`
- **Autenticação:** Bearer Token
- **Formato:** JSON
- **Rate Limit:** Não documentado oficialmente

## 🔐 Autenticação

```typescript
headers: {
  'Authorization': 'Bearer YOUR_TOKEN_HERE',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

## 📍 Endpoints Utilizados

### GET `/[store_name]/orders`

Retorna lista de pedidos da loja.

**URL Completa:** `https://api.cartpanda.com/v3/[store_name]/orders`

**Query Parameters:**

| Parâmetro | Tipo | Descrição | Funciona? |
|-----------|------|-----------|-----------|
| `page` | number | Número da página | ✅ Sim |
| `per_page` | number | Items por página (max: 100) | ✅ Sim |
| `status` | string | Filtro por status | ⚠️ Parcial |
| `start_date` | string | Data início (YYYY-MM-DD) | ❌ Não |
| `end_date` | string | Data fim (YYYY-MM-DD) | ❌ Não |

**⚠️ IMPORTANTE:** API ignora `start_date` e `end_date`. Sempre retorna os mesmos pedidos recentes.

**Resposta:**

```json
{
  "orders": [
    {
      "id": 123456,
      "order_number": "10001",
      "status_id": "Fulfilled",
      "financial_status": 3,
      "payment_status": 3,
      "currency": "USD",
      "total_price": "1707.31",
      "local_currency_amount": "322.67",
      "exchange_rate_USD": "0.18899300",
      "customer": {
        "id": 789,
        "email": "cliente@exemplo.com",
        "first_name": "João",
        "last_name": "Silva"
      },
      "line_items": [...],
      "affiliate_name": "Afiliado Exemplo",
      "affiliate_email": "afiliado@exemplo.com",
      "affiliate_amount": "32.27",
      "refunds": [],
      "chargeback_received": 0,
      "created_at": "2025-11-09T23:28:16-03:00",
      "updated_at": "2025-11-09T23:30:00-03:00"
    }
  ],
  "meta": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 450,
    "per_page": 100
  }
}
```

### GET `/[store_name]/orders/[order_id]`

Retorna detalhes de um pedido específico.

**URL:** `https://api.cartpanda.com/v3/[store_name]/orders/123456`

**Resposta:** Objeto `CartPandaOrder` completo.

### GET `/[store_name]/products`

Retorna lista de produtos (não utilizado atualmente).

---

## 📊 Estrutura de Dados

### CartPandaOrder

```typescript
interface CartPandaOrder {
  id: number;                        // ID único do pedido
  order_number: string;              // Número do pedido (ex: "10001")
  status_id: string;                 // "New" | "Fulfilled" | "Refunded" | "Chargeback"
  financial_status: number;          // 3 = pago
  payment_status: number;            // 3 = pago

  // Valores Monetários
  currency: string;                  // Sempre "USD"
  total_price: string;               // ⭐ BRL - "1707.31"
  subtotal_price: string;            // BRL
  current_total_discounts: string;   // BRL
  local_currency_amount: string;     // ⚠️ USD - "322.67" (tem anomalias)
  exchange_rate_USD: string;         // "0.18899300"

  // Cliente
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };

  // Items do Pedido
  line_items: OrderItem[];

  // Pagamento
  payment: {
    id: number;
    gateway: string;
    type: string;
    payment_type: string;
    status_id: number;
    amount: number;
  };

  // Afiliado (campos flat)
  affiliate_name: string | null;
  affiliate_email: string | null;
  affiliate_slug: string;
  affiliate_amount: string;          // Comissão

  // Refund/Chargeback
  refunds?: any[];                   // Array de refunds
  chargeback_received: number;       // 0 ou 1
  chargeback_at: string | null;

  // Timestamps
  created_at: string;                // ISO 8601 com timezone
  updated_at: string;
}
```

### OrderItem

```typescript
interface OrderItem {
  id: number;
  product_id: number;
  name: string;
  title: string;
  quantity: number;
  price: number;
  total_price: string;                          // ⭐ BRL - "1555.61"
  local_currency_item_price: string;            // USD unitário
  local_currency_item_total_price: string;      // USD total
}
```

---

## 💰 Campos Monetários

### Qual campo usar?

| Campo | Moeda | Confiável? | Usar? |
|-------|-------|------------|-------|
| `total_price` | BRL | ✅ Sim | ⭐ **USE ESTE** |
| `local_currency_amount` | USD | ⚠️ Anomalias | ❌ Não |
| `transactions[0].actual_price_paid` | USD | ✅ Sim | ⚠️ Complexo |

**Recomendação:** Use `total_price` (BRL) como fonte da verdade.

**Problema com USD:**
```typescript
// Exemplo de anomalia encontrada
order.local_currency_amount = "490.00"  // ❌ Errado
order.transactions[0].actual_price_paid = "196.00"  // ✅ Correto
// Diferença de $294!
```

### Parsing de Valores

CartPanda retorna valores como strings com vírgulas:

```typescript
// ❌ Errado
parseFloat("1,707.31")  // => 1

// ✅ Correto
function parsePrice(price: string | number): number {
  if (typeof price === 'number') return price;
  return parseFloat(price.replace(/,/g, ''));
}

parsePrice("1,707.31")  // => 1707.31
```

---

## 📅 Datas e Timezone

### Formato Retornado

```
"2025-11-09T23:28:16-03:00"
```

- Formato: ISO 8601
- Timezone: Incluído (ex: `-03:00` para Brasília)

### ⚠️ CUIDADO: Conversão UTC

```typescript
// ❌ ERRADO - Causa shift de data
const date = new Date("2025-11-09T23:28:16-03:00");
date.toISOString();  // => "2025-11-10T02:28:16.000Z" (dia mudou!)

// ✅ CORRETO - Extrai data local
function extractLocalDate(dateString: string): string {
  return dateString.split('T')[0];  // => "2025-11-09"
}
```

---

## 🔄 Status de Pedidos

### Status Possíveis

| status_id | Descrição | Incluir na Receita? |
|-----------|-----------|---------------------|
| "New" | Pedido novo | ✅ Se pago |
| "Fulfilled" | Pedido entregue | ✅ Se pago |
| "Refunded" | Reembolsado | ❌ Subtrair |
| "Chargeback" | Chargeback | ❌ Subtrair |
| "Cancelled" | Cancelado | ❌ Ignorar |

### Verificação de Pagamento

```typescript
function isOrderPaid(order: CartPandaOrder): boolean {
  return order.financial_status === 3 || order.payment_status === 3;
}
```

**Valores:**
- `3` = Pago
- Outros = Pendente/Cancelado

---

## 🏷️ Afiliados

### Estrutura

Afiliados não são objeto separado, são campos flat no pedido:

```typescript
{
  affiliate_name: "Nome do Afiliado",
  affiliate_email: "email@afiliado.com",
  affiliate_slug: "slug-afiliado",
  affiliate_amount: "32.27"  // Comissão em BRL
}
```

### Identificação

Use `affiliate_slug` como ID único (ou `affiliate_email` se slug não existir).

---

## 💸 Refunds e Chargebacks

### Refunds

**Identificação:**
```typescript
// Opção 1: Array de refunds
order.refunds && order.refunds.length > 0

// Opção 2: Status
order.status_id === "Refunded"
```

**Valor:** Use `order.total_price` (mesmo do pedido original)

### Chargebacks

**Identificação:**
```typescript
// Opção 1: Flag
order.chargeback_received === 1

// Opção 2: Status
order.status_id === "Chargeback"
```

**Data:** `order.chargeback_at` (pode ser null)

---

## ⚠️ Limitações Conhecidas

### 1. Filtros de Data Não Funcionam

**Problema:**
```bash
curl "api.cartpanda.com/v3/store/orders?start_date=2025-11-10&end_date=2025-11-10"
# Retorna os mesmos 50 pedidos independente das datas
```

**Solução:**
- Buscar últimos 90 dias
- Filtrar no servidor usando `extractLocalDate()`

### 2. Paginação Limitada

- Máximo 100 items por página
- Precisa fazer múltiplos requests para > 100 pedidos
- Nossa implementação usa `getAllOrders()` com loop

### 3. Anomalias em Valores USD

- Campo `local_currency_amount` tem valores errados em alguns pedidos
- Sempre usar `total_price` (BRL)

### 4. Rate Limiting

- Não documentado oficialmente
- Aparentemente sem limite rigoroso
- Recomendado: cache de 5 minutos

---

## 🔧 Implementação no Projeto

### Cliente HTTP

```typescript
// lib/cartpanda/client.ts
class CartPandaClient {
  async getOrders(params?: {
    page?: number;
    per_page?: number;
    start_date?: string;  // ⚠️ Ignorado pela API
    end_date?: string;    // ⚠️ Ignorado pela API
  }): Promise<OrdersListResponse>

  async getAllOrders(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<CartPandaOrder[]>  // Com paginação automática
}
```

### Cálculos

```typescript
// lib/cartpanda/utils.ts

// Receita líquida
calculateRevenue(orders) => number

// Top produtos
getTopProducts(orders) => ProductPerformance[]

// Top afiliados
getTopAffiliates(orders) => AffiliatePerformance[]

// Refunds e chargebacks
getRefundsAndChargebacks(orders) => { refunds, chargebacks }
```

### API Route

```typescript
// app/api/metrics/route.ts
export async function GET(request: Request) {
  // 1. Parse query params
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  // 2. Buscar últimos 90 dias (API ignora filtros)
  const allOrders = await cartPandaClient.getAllOrders({
    start_date: getDateString(90),
    end_date: getDateString(0),
  });

  // 3. Filtrar client-side
  const currentOrders = allOrders.filter(order => {
    const orderDate = extractLocalDate(order.created_at);
    return orderDate >= startDate && orderDate <= endDate;
  });

  // 4. Calcular métricas
  const metrics = calculateMetrics(currentOrders, previousOrders);

  return NextResponse.json({ metrics });
}
```

---

## 📝 Exemplos de Uso

### Buscar Pedidos do Mês

```typescript
const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

const orders = await cartPandaClient.getAllOrders({
  start_date: formatDateString(firstDay),
  end_date: formatDateString(today),
});

// ⚠️ Lembre-se: API ignora datas, precisa filtrar depois!
const filtered = orders.filter(order => {
  const date = extractLocalDate(order.created_at);
  return date >= startDate && date <= endDate;
});
```

### Calcular Receita Líquida

```typescript
const revenue = orders.reduce((sum, order) => {
  // Apenas pedidos pagos
  if (order.financial_status !== 3) return sum;

  // Pular refunds e chargebacks
  if (order.status_id === "Refunded") return sum;
  if (order.status_id === "Chargeback") return sum;

  // Somar valor em BRL
  return sum + parsePrice(order.total_price);
}, 0);
```

### Listar Top 5 Afiliados

```typescript
const affiliates = new Map();

orders.forEach(order => {
  if (!order.affiliate_email) return;

  const key = order.affiliate_slug || order.affiliate_email;
  const existing = affiliates.get(key) || { revenue: 0, sales: 0 };

  affiliates.set(key, {
    ...existing,
    revenue: existing.revenue + parsePrice(order.total_price),
    sales: existing.sales + 1,
  });
});

const top5 = Array.from(affiliates.entries())
  .sort((a, b) => b[1].revenue - a[1].revenue)
  .slice(0, 5);
```

---

## 🐛 Troubleshooting

### Erro 401 Unauthorized

- Verifique se token está correto
- Token deve incluir "Bearer " no header
- Verifique se store_name está correto

### Dados vazios

- Loja pode não ter pedidos no período
- Verifique se está usando filtro correto
- Teste direto com curl/Postman

### Valores errados

- Sempre use `total_price` (BRL)
- Não use `local_currency_amount` (USD tem bugs)
- Parse valores com `parsePrice()` (remove vírgulas)

---

**Última Atualização:** 2025-11-10
**API Version:** v3
