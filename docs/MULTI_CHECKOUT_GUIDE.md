# Multi-Checkout Architecture Guide

Sistema preparado para suportar múltiplos checkouts (CartPanda + Digistore24) com adapter pattern.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Database Schema](#database-schema)
- [Adapters](#adapters)
- [Integração CartPanda](#integração-cartpanda)
- [Integração Digistore24](#integração-digistore24)
- [Próximos Passos](#próximos-passos)

---

## 🎯 Visão Geral

O sistema foi projetado com **Adapter Pattern** para abstrair a complexidade de integrar com múltiplos checkouts. Cada checkout tem seu próprio adapter que implementa uma interface comum.

### Benefícios

✅ **Extensível** - Adicionar novos checkouts sem modificar código existente
✅ **Isolado** - Mudanças em um checkout não afetam outros
✅ **Testável** - Cada adapter pode ser testado independentemente
✅ **Retrocompatível** - CartPanda continua funcionando 100%

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard App                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────┐         │
│  │      Adapter Factory (lib/checkout/)       │         │
│  │  - getAdapter(source)                      │         │
│  │  - getAllAdapters()                        │         │
│  │  - getEnabledAdapters()                    │         │
│  └────────────────────────────────────────────┘         │
│            ↓                        ↓                    │
│  ┌──────────────────┐    ┌──────────────────┐          │
│  │  CartPanda       │    │  Digistore24     │          │
│  │  Adapter         │    │  Adapter         │          │
│  │  ✅ Implementado │    │  🚧 Template     │          │
│  └──────────────────┘    └──────────────────┘          │
│            ↓                        ↓                    │
│  ┌──────────────────────────────────────────┐          │
│  │         Unified Order Interface          │          │
│  │   (lib/checkout/types.ts)                │          │
│  └──────────────────────────────────────────┘          │
│                        ↓                                 │
│  ┌──────────────────────────────────────────┐          │
│  │      Supabase (public.orders)            │          │
│  │  - source: 'cartpanda' | 'digistore24'   │          │
│  │  - source_order_id: original ID          │          │
│  │  - raw_payload: complete API response    │          │
│  └──────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Migration 006: Multi-Checkout Support

**Arquivo:** `supabase/migrations/006_multi_checkout_support.sql`

#### Novas Colunas

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `source` | VARCHAR(50) | Plataforma: 'cartpanda' ou 'digistore24' |
| `source_order_id` | VARCHAR(255) | ID original da plataforma |
| `raw_payload` | JSONB | Payload completo da API (para auditoria) |

#### Índices Criados

- `idx_orders_source_order_id` - UNIQUE (source + source_order_id)
- `idx_orders_source` - Para filtrar por plataforma
- `idx_orders_raw_payload_gin` - GIN index para buscar no payload

#### Views Criadas

```sql
-- CartPanda orders only
CREATE VIEW cartpanda_orders AS
SELECT * FROM orders WHERE source = 'cartpanda';

-- Digistore24 orders only
CREATE VIEW digistore24_orders AS
SELECT * FROM orders WHERE source = 'digistore24';
```

#### Executar Migration

```bash
# 1. Abra Supabase SQL Editor
# 2. Cole o conteúdo de: supabase/migrations/006_multi_checkout_support.sql
# 3. Execute

# Verificar:
SELECT source, COUNT(*)
FROM orders
GROUP BY source;
```

---

## 🔌 Adapters

### Interface Base (`CheckoutAdapter`)

Todos os adapters implementam esta interface:

```typescript
interface CheckoutAdapter {
  readonly source: CheckoutSource;

  getOrders(params): Promise<OrdersResponse>;
  getAllOrders(params): Promise<any[]>;
  transformOrder(order): UnifiedOrder;
  validateWebhook?(payload, signature): boolean;
  parseWebhook?(payload): UnifiedOrder | null;
}
```

### Uso do Factory

```typescript
import { getAdapter, getEnabledAdapters } from '@/lib/checkout';

// Obter adapter específico
const cartpanda = getAdapter('cartpanda');
const orders = await cartpanda.getAllOrders();

// Obter todos os adapters habilitados
const adapters = getEnabledAdapters();
for (const adapter of adapters) {
  const orders = await adapter.getAllOrders();
  // Processar orders...
}
```

---

## ✅ Integração CartPanda

### Status: 100% Implementado

**Adapter:** `lib/checkout/cartpanda-adapter.ts`

#### Configuração

```env
NEXT_PUBLIC_CARTPANDA_API_URL=https://accounts.cartpanda.com/api/v3
CARTPANDA_API_TOKEN=seu_token
CARTPANDA_STORE_NAME=seu_store
```

#### Uso

```typescript
import { cartPandaAdapter } from '@/lib/checkout';

// Buscar orders
const orders = await cartPandaAdapter.getAllOrders({
  start_date: '2025-01-01',
  end_date: '2025-01-31',
});

// Transformar order
const unified = cartPandaAdapter.transformOrder(cartpandaOrder);
// unified.source === 'cartpanda'
// unified.source_order_id === '12345'
// unified.raw_payload === { /* complete API response */ }
```

#### Webhook

```typescript
// app/api/webhook/cartpanda/route.ts
import { cartPandaAdapter } from '@/lib/checkout';

export async function POST(request: Request) {
  const payload = await request.json();
  const signature = request.headers.get('x-cartpanda-signature');

  // Validar
  const isValid = cartPandaAdapter.validateWebhook(payload, signature);

  // Parsear
  const order = cartPandaAdapter.parseWebhook(payload);

  // Salvar no Supabase
  await supabase.from('orders').upsert(order);
}
```

---

## 🚧 Integração Digistore24

### Status: Template Pronto (Aguardando Acesso à API)

**Adapter:** `lib/checkout/digistore24-adapter.ts`

#### Configuração Futura

```env
DIGISTORE24_API_URL=https://www.digistore24.com/api
DIGISTORE24_API_KEY=sua_api_key
DIGISTORE24_WEBHOOK_SECRET=seu_secret
```

#### Mapeamento de Campos

| Digistore24 Field | Unified Field | Notas |
|-------------------|---------------|-------|
| `order_id` | `source_order_id` | ID único |
| `transaction_id` | Fallback para `source_order_id` | - |
| `buyer_email` | `customer.email` | - |
| `payment_status` | `financial_status` | Mapear: paid→3, pending→1 |
| `order_total_value` | `total_price` | Em EUR |
| `affiliate_id` | `afid` | Sistema nativo de afiliados |
| `affiliate_earnings` | `affiliate_amount` | Comissão |

#### Webhook Validation

Digistore24 usa **SHA512 HMAC**:

```typescript
const hash = crypto
  .createHmac('sha512', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

return hash === signature;
```

#### IPN (Instant Payment Notification)

Referência: https://www.digistore24.com/en/api/ipn

Eventos principais:
- `payment` - Novo pagamento
- `refund` - Reembolso
- `chargeback` - Chargeback

#### TODO - Quando tiver acesso à API

1. **Obter credenciais** no painel Digistore24
2. **Testar API** com Postman
3. **Implementar** métodos em `digistore24-adapter.ts`:
   - `getOrders()`
   - `getAllOrders()`
   - Refinar `transformOrder()` com estrutura real
4. **Configurar webhook** no painel Digistore24
5. **Testar** endpoint `/api/webhook/digistore24`
6. **Sync inicial** para importar pedidos existentes

---

## 🚀 Próximos Passos

### 1. Executar Migration (AGORA)

```bash
# Abrir Supabase SQL Editor e executar:
# supabase/migrations/006_multi_checkout_support.sql
```

### 2. Quando tiver Acesso Digistore24

- [ ] Obter API Key e Webhook Secret
- [ ] Completar implementação do adapter
- [ ] Configurar webhook URL no painel
- [ ] Testar com pedido real
- [ ] Sync inicial de pedidos

### 3. Criar Script de Sync Multi-Checkout

```typescript
// scripts/sync-all-checkouts.ts
import { getEnabledAdapters } from '@/lib/checkout';
import { SyncMonitor } from '@/lib/monitoring';

for (const adapter of getEnabledAdapters()) {
  const monitor = new SyncMonitor();
  monitor.start(adapter.source);

  const orders = await adapter.getAllOrders();
  const unified = orders.map(o => adapter.transformOrder(o));

  await supabase.from('orders').upsert(unified);

  await monitor.complete(orders.length);
}
```

### 4. Atualizar Dashboard UI

- [ ] Filtro por `source` nos componentes
- [ ] Badge visual mostrando plataforma
- [ ] Separar métricas por checkout (opcional)

### 5. Monitoring

- [ ] Health check para cada adapter
- [ ] Alertas quando Digistore24 estiver indisponível
- [ ] Métricas separadas por plataforma

---

## 📚 Referências

- **CartPanda API**: https://accounts.cartpanda.com/api/v3/docs
- **Digistore24 API**: https://www.digistore24.com/en/api/order
- **Digistore24 IPN**: https://www.digistore24.com/en/api/ipn
- **Adapter Pattern**: https://refactoring.guru/design-patterns/adapter

---

## ❓ FAQ

**P: Os pedidos CartPanda existentes vão quebrar?**
R: Não! A migration adiciona valores default e backfill automático. Tudo é retrocompatível.

**P: Posso rodar sync de CartPanda e Digistore24 ao mesmo tempo?**
R: Sim! Os adapters são independentes e thread-safe.

**P: E se tiver um pedido com mesmo ID nas duas plataformas?**
R: Sem problemas! O UNIQUE constraint é `(source + source_order_id)`, permitindo IDs duplicados entre plataformas.

**P: Preciso modificar código existente?**
R: Não! Todo código CartPanda funciona como antes. Os adapters são opt-in.

**P: Como adicionar um terceiro checkout (ex: Stripe)?**
R: Criar `lib/checkout/stripe-adapter.ts` implementando `CheckoutAdapter`, adicionar no factory, rodar migration para adicionar 'stripe' no check constraint.

---

**Última Atualização:** 2025-11-17
**Status:** ✅ Arquitetura pronta | 🚧 Aguardando acesso Digistore24
