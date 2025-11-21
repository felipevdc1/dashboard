# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

E-commerce analytics dashboard built with Next.js 15 that syncs orders from CartPanda API v3 to Supabase PostgreSQL for fast querying. Achieves 100x performance improvement (1.5s vs 2-3 minutes) through database caching.

**Key Architecture:** CartPanda API → Daily Sync → Supabase → Next.js API Routes → React Dashboard
### 🎯 Regras de Ouro do Desenvolvimento

#### Regra 1: "Think Twice, Code Once"
Antes de escrever qualquer linha, responda mentalmente:
- Por que estou fazendo isso?
- O que mais será afetado?
- Existe uma solução melhor?

#### Regra 2: "Agents First"
Você possui diversos agentes à sua disposição. Sempre use o máximo de agentes possíveis, com suas especialidades.

### ⚠️ REGRAS ABSOLUTAS DE RIGOR (NON-NEGOTIABLE)

Estas regras existem porque erros de precisão quebram a confiança. NUNCA as viole.

#### Regra Absoluta 1: "Never Trust CLI Output Blindly"
**Problema:** CLIs podem retornar URLs temporárias, paths relativos ou informações contextuais.
**Solução obrigatória:**
1. **SEMPRE** verificar documentação existente ANTES de reportar informações críticas
2. **SEMPRE** usar Grep para buscar referências no codebase
3. **NUNCA** assumir que output de comando = verdade absoluta
4. **NUNCA** reportar URLs de deployment como "produção" sem verificar

**Exemplo do erro:**
```bash
# ❌ ERRADO: Copiar cegamente
vercel --prod
> https://dashboard-abc123-project.vercel.app
# Reportar: "URL de produção: https://dashboard-abc123-..."

# ✅ CORRETO: Verificar primeiro
grep -r "vercel.app" docs/ config/
# Encontrar: https://dashboard-eight-alpha-74.vercel.app
# Confirmar em múltiplos arquivos ANTES de reportar
```

#### Regra Absoluta 2: "Double-Check Critical Information"
**Informações críticas que EXIGEM verificação:**
- ✅ URLs de produção (grep docs, configs, sessions)
- ✅ Comandos destrutivos (git push --force, rm -rf, etc)
- ✅ Valores de configuração (API keys, tokens, endpoints)
- ✅ Números reportados ao usuário (revenue, counts, etc)
- ✅ Status de deploys (success != accessible)

**Workflow obrigatório:**
1. Coletar informação de fonte primária (CLI, API, etc)
2. Buscar confirmação em documentação (`grep`, `read`)
3. Verificar consistência entre fontes
4. **SÓ ENTÃO** reportar ao usuário

#### Regra Absoluta 3: "Accuracy Over Speed"
**Princípio:** É melhor dizer "deixe-me verificar" do que dar informação errada.
- ❌ Responder rápido com informação imprecisa
- ✅ Pausar 30 segundos para grep/read e responder com certeza
- ❌ "Provavelmente é X"
- ✅ "Verificando... confirmado que é X (encontrado em Y e Z)"

**Frases proibidas sem verificação:**
- "A URL de produção é..."
- "O deploy foi bem-sucedido em..."
- "O valor atual é..."
- "Isso está configurado em..."

#### Regra Absoluta 4: "Production URLs Have Patterns"
**Red flags de URLs temporárias:**
- Hash aleatório no subdomínio: `project-abc123xyz-user.vercel.app` ❌
- Timestamp no nome: `deploy-20250611-...` ❌
- Output direto de `vercel --prod` sem confirmar ❌

**Características de URLs de produção:**
- Nome consistente: `dashboard-eight-alpha-74.vercel.app` ✅
- Documentada em múltiplos lugares ✅
- Referenciada em webhooks/configs ✅
- Domínio customizado (se aplicável) ✅

**Comando de verificação obrigatório:**
```bash
# SEMPRE executar antes de reportar URL de produção:
grep -r "vercel.app" docs/ config/ --include="*.md" --include="*.json"
```

## Production URLs

**Dashboard Principal:**
- Production: `https://dashboard-eight-alpha-74.vercel.app`
- Deployment URLs: `https://dashboard-{hash}-felipevdc1s-projects.vercel.app` (temporárias, NÃO usar)

**Por que isso importa:**
- Webhooks usam URL de produção permanente
- Documentação referencia URL estável
- Deployment URLs mudam a cada push
- Reportar URL errada = webhooks quebrados = sistema quebrado

## Essential Commands

```bash
# Development
npm run dev              # Start dev server on http://localhost:3000
npm run build            # Production build with TypeScript type checking
npm run sync             # Manual sync: CartPanda API → Supabase

# Deployment (Vercel)
npm run deploy:quick     # Deploy to Vercel production
./setup-vercel.sh        # Full setup with env vars + sync + deploy

# Logs and Debugging
vercel logs --follow     # Stream Vercel logs in real-time
vercel logs --filter="/api/sync"  # Filter logs by endpoint
```

## Core Architecture Patterns

### 1. Data Synchronization Flow

**Critical Pattern:** Paginated fetch with duplicate detection
```typescript
// lib/cartpanda/client.ts - getAllOrders()
// Fetches ~60 pages from CartPanda API
// Stops after 3 consecutive pages with only duplicates (MAX_DUPLICATE_PAGES)
// Safety limit: MAX_PAGES = 300
// Timeout: 300000ms (5 minutes)
```

**Transform & Upsert:**
```typescript
// app/api/sync/route.ts
// CartPandaOrder → Supabase schema transformation
// Uses UPSERT (ON CONFLICT id DO UPDATE)
// Records synced_at timestamp
// ~5 minutes for 3000 orders
```

### 2. Three-Layer Cache Strategy

1. **Memory Cache** (2 min TTL)
   - `lib/cache.ts` - LRU with 100 item limit
   - Shared across API routes
   - Keys: `generateCacheKey(prefix, params)`

2. **CDN Cache** (2 min TTL)
   - Cache-Control headers in API routes
   - `s-maxage=120, stale-while-revalidate=60`

3. **Database Cache** (Supabase)
   - Daily sync via Vercel Cron (00:00 UTC)
   - `synced_at` field tracks freshness
   - SQL indexes on: created_at, affiliate_slug, financial_status

### 3. Affiliate Metrics Calculation

**Complex algorithms in `/lib/affiliates/utils.ts`:**

- **Quality Score (0-100):**
  ```
  (approvalRate × 0.4) + ((100 - refundRate) × 0.3) + ((100 - chargebackRate) × 0.3)
  ```

- **Diversification Score:**
  Shannon entropy normalized to 0-100
  Measures product diversity per affiliate

- **Activity Heatmap:**
  2D matrix [weekday][hour] of sales distribution

- **Trend Calculation:**
  MoM growth > 5% = up, < -5% = down, else stable

### 4. Type System Critical Points

**Next.js 15 Async Route Params:**
```typescript
// app/api/affiliates/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // MUST be Promise
) {
  const { id } = await params;  // MUST await
  // ...
}
```

**CartPanda Order Schema:**
```typescript
// lib/cartpanda/types.ts
{
  exchange_rate_USD: string  // Case-sensitive! Not exchange_rate_usd
  afid?: string | number     // Flat on order object (not nested)
  affiliate_amount: string   // Commission field (not affiliate_commission)
  status?: string            // Optional: "Paid", "Refunded", "Chargeback"
}
```

**Supabase Type Issues:**
Fix with `as any` when type inference fails:
```typescript
await supabase.from('orders').upsert(ordersToSync as any, ...)
const data = (lastSyncData as any)?.synced_at
```

## File Structure Key Points

### Critical Files for Modifications

**Sync Logic:**
- `lib/cartpanda/client.ts` - API pagination, duplicate detection
- `app/api/sync/route.ts` - Transform & UPSERT to Supabase
- `scripts/direct-sync.ts` - Manual sync script

**Metrics Calculation:**
- `lib/supabase/queries.ts` - All SQL queries for dashboard
- `lib/affiliates/utils.ts` - Complex affiliate scoring algorithms
- `lib/cartpanda/utils.ts` - Price parsing, date extraction, status checks

**API Routes:**
- `app/api/metrics/route.ts` - Main dashboard metrics (with cache)
- `app/api/affiliates/route.ts` - Affiliate list
- `app/api/affiliates/[id]/route.ts` - Affiliate details
- `app/api/sync/route.ts` - Sync endpoint (POST = run, GET = status)

### Environment Variables Required

```bash
NEXT_PUBLIC_CARTPANDA_API_URL=https://accounts.cartpanda.com/api/v3
CARTPANDA_API_TOKEN=<secret>
CARTPANDA_STORE_NAME=beliuimcaps
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<public_key>
```

## Common Development Patterns

### Adding a New Metric

1. Add calculation logic to `lib/supabase/queries.ts`
2. Update TypeScript types in `lib/cartpanda/types.ts`
3. Create/update component in `components/`
4. Wire up in `app/page.tsx` with SWR

### Modifying Sync Logic

1. Edit `lib/cartpanda/client.ts` for API changes
2. Update transformation in `app/api/sync/route.ts`
3. Test with: `npm run sync`
4. Verify in Supabase SQL Editor: `SELECT COUNT(*) FROM orders`

### Debugging Slow Queries

```sql
-- In Supabase SQL Editor
EXPLAIN ANALYZE
SELECT * FROM orders WHERE created_at >= '2025-01-01' ...;

-- Check if indexes are used
-- Look for "Index Scan" (good) vs "Seq Scan" (bad)
```

### Cache Invalidation

```typescript
// Clear memory cache
memoryCache.clear();

// Force CDN bypass (add query param)
fetch('/api/metrics?nocache=1')

// Re-sync from CartPanda
npm run sync
```

## Known Issues & Workarounds

### Issue: Vercel Cron Limited to Daily (Hobby Plan)
**File:** `vercel.json`
**Current:** `"schedule": "0 0 * * *"` (daily at 00:00 UTC)
**Workaround:** Use external cron service or upgrade to Pro

### Issue: Memory Cache No Size Limit
**File:** `lib/cache.ts`
**Risk:** Potential OOM with many cache entries
**Workaround:** LRU eviction at 100 items, but no memory size cap

### Issue: No Retry on Sync Failure
**Files:** `lib/cartpanda/client.ts`, `app/api/sync/route.ts`
**Current:** Fails silently, no automatic retry
**Workaround:** Monitor logs and re-run manually

### Issue: Type Errors with Supabase Auto-Generated Types
**Pattern:** Use `as any` for complex queries where type inference fails
**Reason:** Supabase codegen sometimes produces overly strict types

## Specialized Agents

This project has 5 specialized agents in `.claude/agents/`:

- **sync-guardian** - Sync integrity, performance, retry logic
- **performance-optimizer** - Query optimization, cache tuning
- **affiliate-analyst** - Metrics algorithms, fraud detection
- **test-engineer** - Test suite implementation (currently missing)
- **devops-orchestrator** - Monitoring, alerting, backups

Invoke with: `/agent <name>` in Claude Code

## Testing (Currently Not Implemented)

**Priority areas if implementing tests:**
1. `lib/affiliates/utils.ts` - Quality score, diversification algorithms
2. `lib/cartpanda/client.ts` - Pagination, duplicate detection
3. `lib/cache.ts` - LRU eviction, TTL expiration
4. `app/api/sync/route.ts` - Data transformation

**Recommended stack:** Jest + React Testing Library + Playwright

## Deployment Notes

**Vercel Configuration:**
- Build command: `next build`
- Output directory: `.next` (default)
- Install command: `npm install`
- Node version: 18.x+

**Vercel Cron:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/sync",
    "schedule": "0 0 * * *"  // Daily 00:00 UTC
  }]
}
```

**Environment Variables:**
Set all 5 env vars in Vercel dashboard or via CLI:
```bash
vercel env add NEXT_PUBLIC_CARTPANDA_API_URL production
# Repeat for all 5 variables
```

**Initial Sync After Deploy:**
```bash
# Run once to populate Supabase
npm run sync
# Or via Vercel function
curl -X POST https://your-app.vercel.app/api/sync
```

## Performance Targets

- First load: < 1.5s
- Cached load: < 50ms
- Sync time: < 5 min for 3000 orders
- Memory cache TTL: 2 min
- SQL query time: < 1.5s

## Additional Documentation

- `.claude/claude.md` - Extended project overview
- `README.md` - Setup instructions
- `CHANGELOG.md` - Version history
- `DECISIONS.md` - Architecture Decision Records
- `DEVELOPMENT_LOG.md` - Historical development notes
