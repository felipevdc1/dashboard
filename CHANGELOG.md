# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não Lançado]

## [2.0.0] - 2025-11-12

### BREAKING CHANGE: Migração para Supabase PostgreSQL

**Esta é uma mudança arquitetural significativa que melhora a performance em ~100x.**

#### Adicionado
- **Integração Completa com Supabase PostgreSQL**
  - Banco de dados PostgreSQL como cache intermediário
  - Tabela `orders` com schema completo em `supabase/schema.sql`
  - Indexes otimizados: `created_at`, `financial_status`, GIN para JSONB
  - Cliente Supabase singleton em `lib/supabase.ts`
  - Types TypeScript em `lib/supabase/types.ts`
- **SQL Queries Otimizadas** (`lib/supabase/queries.ts`)
  - `fetchOrdersByDateRange()` - Busca com filtros de data
  - `calculateDashboardMetrics()` - Cálculo completo de métricas via SQL
  - Performance: 1.2-1.5s vs 136-169s antes (100x mais rápido!)
- **Scripts de Sincronização**
  - `scripts/direct-sync.ts` - Sync manual CartPanda → Supabase
  - Bypassa Next.js API para maior confiabilidade
  - UPSERT para evitar duplicatas (`ON CONFLICT (id) DO UPDATE`)
  - Suporte a valores default para campos nullable
  - Logs detalhados de progresso
- **API de Sync Automático** (`app/api/sync/route.ts`)
  - Endpoint para Vercel Cron Jobs
  - Sync incremental (últimas 24h)
  - Integrado com sistema de cache existente
- **Deploy Automatizado**
  - `setup-vercel.sh` - Setup COMPLETO via CLI
    - Instala Vercel CLI automaticamente
    - Login e link de projeto
    - Configura TODAS as variáveis de ambiente do `.env.local`
    - Sincroniza dados iniciais
    - Deploy para production
    - Configura Cron Jobs
  - `deploy.sh` - Script de deploy simples
  - `vercel.json` - Config de Cron Jobs (sync a cada 15min)
  - Comandos npm: `deploy`, `deploy:quick`, `sync`
- **Documentação Completa**
  - `SESSION_SUMMARY.md` - Resumo da sessão e estado atual
  - `ARQUITETURA.md` - Diagramas e fluxo de dados detalhado
  - `COMANDOS_UTEIS.md` - Cheat sheet de comandos
  - `CONTINUACAO.md` - Checklist para retomar após reiniciar
  - `DEPLOY_RAPIDO.md` - Guia rápido de deploy
  - `CHANGELOG.md` - Este arquivo atualizado

#### Modificado
- **API de Métricas Migrada** (`app/api/metrics/route.ts`)
  - Substituído paginação CartPanda por queries SQL no Supabase
  - Performance: 136-169s → 1.2-1.5s (~100x mais rápido)
  - Mantém mesma interface de API (backward compatible)
  - Usa `calculateDashboardMetrics()` do Supabase
- **Timeout Aumentado** (`lib/cartpanda/client.ts:14`)
  - `REQUEST_TIMEOUT` de 30s → 300s (5 minutos)
  - Necessário para sync inicial de 3000 pedidos
- **Package.json**
  - Adicionado `@supabase/supabase-js` ^2.81.1
  - Scripts: `sync`, `deploy`, `deploy:quick`
- **Gitignore**
  - Adicionado `.env*.local` para proteger credenciais
  - Adicionado `.vercel` para ignorar config local

#### Corrigido
- **Environment Variables Loading**
  - Problema: ES module imports hoisted antes de `dotenv.config()`
  - Solução: Script de sync carrega dotenv ANTES dos imports
  - Alternativa: Passar env vars inline no comando
- **Row Level Security (RLS)**
  - Problema: Supabase bloqueava inserts com anon key
  - Solução: RLS desabilitado manualmente no Dashboard
  - TODO: Implementar Service Role Key para produção
- **NOT NULL Constraint Violations**
  - Problema: CartPanda retorna `null` em alguns campos
  - Solução: Valores default adicionados no sync:
    - `exchange_rate_usd: order.exchange_rate_usd || '1.00'`
    - `currency: order.currency || 'USD'`
    - `total_price: order.total_price || '0'`
    - E outros campos similares
  - CRÍTICO: Este fix permitiu sync de 3000 pedidos com sucesso
- **Timeout em Múltiplas Camadas**
  - Problema: Timeouts em fetch, API, e database
  - Solução: Script direto bypassa Next.js API inteiramente

#### Performance

##### Antes da Migração (CartPanda API Direta)
```
Dashboard Load: 136-169 segundos
Método: Paginação de 60 páginas (50-100 pedidos/página)
API Calls: ~60 requests por carga de dashboard
Rate Limit: Alto consumo
Escalabilidade: Ruim (linear com quantidade de pedidos)
```

##### Depois da Migração (Supabase Cache)
```
Dashboard Load: 1.2-1.5 segundos
Método: SQL queries diretas com indexes
API Calls: 0 por carga (dados já no DB)
Rate Limit: Mínimo (sync a cada 15min)
Escalabilidade: Excelente (SQL otimizado)
```

**Melhoria: ~100x mais rápido** (de 2-3 minutos para 1.5 segundos)

##### Sync Performance
```
Sync Inicial (3000 pedidos):
  - Fetch CartPanda: ~333s (5.5 minutos)
  - Transform data: ~2s
  - UPSERT Supabase: ~3s
  - Total: ~338s

Sync Incremental (24h, ~50 pedidos):
  - Fetch CartPanda: ~10s
  - Transform data: ~1s
  - UPSERT Supabase: ~1s
  - Total: ~12s
```

#### Infraestrutura
- **Supabase Free Tier**
  - 500MB storage
  - 2GB bandwidth/mês
  - Unlimited API requests
  - Região: us-east-1
- **Vercel Cron Jobs**
  - Sync automático: `*/15 * * * *` (a cada 15 minutos)
  - Grátis no Hobby plan
  - Timeout: 10s (Hobby), 60s (Pro)
- **Deployment Automatizado**
  - Push para main → Auto-deploy no Vercel
  - Preview deploys para outras branches
  - Build cache habilitado

#### Decisões Técnicas

##### Supabase como Cache Intermediário
**Data:** 2025-11-12
**Decisão:** Usar Supabase PostgreSQL ao invés de queries diretas à API CartPanda
**Motivo:**
- Performance 100x melhor (SQL vs paginação)
- Reduz drasticamente calls à API CartPanda
- Permite queries complexas e agregações eficientes
- Free tier generoso (500MB storage)
- Sync automático mantém dados atualizados

##### UPSERT Pattern para Sync
**Data:** 2025-11-12
**Decisão:** Usar `INSERT ... ON CONFLICT UPDATE` ao invés de verificar existência
**Motivo:**
- Atomic operation (thread-safe)
- Mais eficiente que SELECT + INSERT/UPDATE
- Atualiza pedidos modificados automaticamente
- Previne duplicatas

##### Valores Default para NULL
**Data:** 2025-11-12
**Decisão:** Adicionar fallback `|| 'default'` para campos que podem ser null
**Motivo:**
- CartPanda API retorna null inconsistentemente
- NOT NULL constraints precisam de valores
- Melhor ter valor default que falhar o sync
- `exchange_rate_usd: '1.00'` é safe default

##### RLS Desabilitado
**Data:** 2025-11-12
**Decisão:** Desabilitar Row Level Security temporariamente
**Motivo:**
- Permite sync com anon key (mais simples)
- TODO: Implementar Service Role Key depois
- Dashboard não tem autenticação ainda
- Segurança via obscurity (URL não é pública)

##### Sync a Cada 15 Minutos
**Data:** 2025-11-12
**Decisão:** Cron job rodando a cada 15 minutos
**Motivo:**
- Balance entre dados frescos e consumo de API
- 96 syncs/dia (dentro do limite grátis)
- Máximo 15min de atraso nos dados
- Sync incremental é rápido (~12s)

#### Breaking Changes
1. **Database Requirement**
   - Agora REQUER Supabase configurado
   - Variáveis obrigatórias: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. **Initial Sync Necessário**
   - Antes do primeiro uso, rodar `npm run sync`
   - Demora ~5 minutos na primeira vez
3. **API Response Structure**
   - Mantém mesma estrutura (backward compatible)
   - Mas dados vêm do Supabase ao invés de CartPanda

#### Migration Guide

Para migrar de v1.x para v2.0.0:

1. **Setup Supabase**
   ```bash
   # 1. Criar projeto no Supabase (grátis)
   # 2. Copiar credenciais para .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

2. **Criar Schema**
   ```bash
   # Copiar SQL de supabase/schema.sql
   # Colar no Supabase SQL Editor
   # Executar
   ```

3. **Desabilitar RLS**
   ```sql
   -- No Supabase SQL Editor
   ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
   ```

4. **Sync Inicial**
   ```bash
   npm run sync
   # Aguardar ~5 minutos
   ```

5. **Deploy**
   ```bash
   npm run deploy
   # Aguardar ~7-10 minutos
   ```

6. **Verificar**
   ```bash
   curl https://seu-projeto.vercel.app/api/metrics
   # Deve responder em ~1.5s
   ```

#### Known Issues
- RLS desabilitado (sem autenticação no banco)
- Service Role Key não implementado ainda
- Sync inicial lento (~5 minutos para 3000 pedidos)
- Requer Supabase configurado (não funciona sem)

#### TODO (Futuro)
- [ ] Implementar Service Role Key para sync
- [ ] Habilitar RLS com policies corretas
- [ ] Webhooks CartPanda para sync instantâneo
- [ ] Real-time updates com Supabase Realtime
- [ ] Monitoring e alertas de falha no sync

---

### 2025-11-11

#### Corrigido
- **CRÍTICO: Feed de Atividades** - Corrigido bug que mostrava ID do afiliado ao invés do nome do cliente
  - Problema: Feed exibia `order.affiliate_name` onde deveria mostrar nome do comprador
  - Solução: Sempre exibir nome do cliente + indicador visual quando houver afiliado
  - Formato: "João Silva • via Felipe (afiliado)"
  - Arquivo: `lib/cartpanda/utils.ts:316-332`
  - **Impacto**: Esta descoberta revelou que os pedidos TÊM dados de afiliados na API!
- **CRÍTICO: Detecção Ampliada de Afiliados** - Expandida lógica para detectar TODOS os pedidos com afiliados
  - Problema: Só detectava se tivesse `afid` ou `affiliate_slug`, ignorando pedidos com apenas `affiliate_name`
  - Solução: Detecção em cascata com 4 níveis de fallback
  - Prioridade: `afid` → `affiliate_slug` → `affiliate_name` → `affiliate_email`
  - Arquivo: `lib/affiliates/utils.ts:129-148`
  - Arquivo: `app/api/affiliates/route.ts:104-122`
  - **Resultado**: Agora detecta afiliados independente do campo utilizado pela API
- **Logs de Debug Detalhados** - Adicionado rastreamento de campos de afiliados
  - Mostra quantos pedidos têm cada campo: `afid`, `affiliate_slug`, `affiliate_name`, `affiliate_email`
  - Ajuda a entender estrutura real dos dados da CartPanda
  - Arquivo: `app/api/affiliates/route.ts:104-112`
- **CRÍTICO: Busca de Afiliados** - Corrigida estrutura de dados da API CartPanda
  - Problema: Código procurava `order.affiliate` (objeto) mas API retorna campos flat
  - Solução: Atualizado para usar `affiliate_slug`, `affiliate_name`, `affiliate_email`, `affiliate_amount`
  - Adicionado suporte ao campo `afid` (Affiliate ID) da API CartPanda
  - Lógica de detecção: verifica `afid` primeiro, depois `affiliate_slug` como fallback
  - Arquivo: `lib/affiliates/utils.ts` - 10+ referências corrigidas
  - Arquivo: `lib/cartpanda/types.ts` - Adicionado campo `afid?: string | number`
  - Agora detecta corretamente pedidos com afiliados associados
- **UX de Busca** - Mudança de debounce automático para botão manual
  - Adicionado botão "Buscar" 🔍 ao lado do input
  - Adicionado botão "Limpar" ✕ quando há texto digitado
  - Suporte para Enter no teclado
  - Instrução visual: "Pressione Enter ou clique em Buscar"
  - Evita chamadas excessivas à API durante digitação
- **Compatibilidade de Campos** - Suporte a `line_items` e `items`
  - Adicionado alias `items` ao tipo `CartPandaOrder`
  - Código usa fallback: `order.line_items || order.items`
  - Garante compatibilidade com variações da API

#### Adicionado
- **Sidebar de Navegação** - Menu lateral permanente para navegação principal
  - Componente `Sidebar.tsx` com navegação entre Dashboard e Afiliados
  - Menu responsivo com botão hambúrguer no mobile
  - Indicação visual de página ativa com gradientes
  - Logo e versão da aplicação no rodapé
  - Integrado no layout principal (`app/layout.tsx`)

#### Modificado
- **Debouncing na Busca de Afiliados** - Otimização de performance
  - Implementado delay de 300ms no input de busca (`AffiliateFiltersBar.tsx`)
  - Evita chamadas excessivas à API a cada tecla digitada
  - Usa `useEffect` com cleanup de timers
  - Melhora significativa na experiência do usuário
- **Navegação Limpa** - Removido botão de navegação do header
  - Removido link "Afiliados" do header do dashboard principal
  - Removido link "Voltar ao Dashboard" da página de afiliados
  - Navegação agora é exclusiva via sidebar
  - Interface mais limpa e profissional

#### Adicionado
- **Módulo Completo de Análise de Afiliados** - Sistema abrangente para análise de performance de afiliados
  - Página dedicada em `/afiliados` com interface completa
  - 6 KPIs principais: Total de Afiliados, Afiliados Ativos, Receita Total, Comissões Pagas, Taxa Média de Comissão, Score Médio de Qualidade
  - Tabela de ranking com métricas detalhadas por afiliado
  - Modal de detalhes com timeline de atividades, breakdown de produtos, métricas temporais e padrões de atividade
  - Sistema de filtros avançados por status, qualidade, vendas, receita
  - Ordenação por receita, vendas, qualidade, comissão, ticket médio
  - Busca por nome, email ou slug do afiliado
- **APIs RESTful para Afiliados**
  - `GET /api/affiliates` - Lista paginada com filtros e ordenação
  - `GET /api/affiliates/[id]` - Detalhes completos de afiliado específico
  - Cache integrado com sistema existente (5min TTL)
  - Logs detalhados de performance
- **Cálculos Avançados de Métricas**
  - Score de Qualidade (0-100) baseado em aprovação, reembolso e chargeback
  - Notas de Qualidade (A, B, C, D, F)
  - Diversificação de Produtos usando entropia de Shannon
  - Ranking e percentil entre todos os afiliados
  - Análise temporal: primeira venda, última venda, dias ativos, média entre vendas
  - Padrões de atividade: dia/hora de pico, dias com vendas
- **Componentes React Reutilizáveis**
  - `AffiliateKPICards` - Cards de KPIs globais
  - `AffiliateRankingTable` - Tabela sortável com ranking
  - `AffiliateFiltersBar` - Barra de filtros e ordenação
  - `AffiliateDetailsModal` - Modal com detalhes completos
- **Navegação entre Dashboards**
  - Link "Afiliados" no dashboard principal
  - Link "Voltar ao Dashboard" na página de afiliados
- **Types TypeScript Completos**
  - Interfaces para todas as estruturas de dados
  - Tipos para filtros, métricas, detalhes, timeline, heatmap
  - Type safety em toda a aplicação
- **Documentação Técnica**
  - `docs/MODULO_AFILIADOS_SPEC.md` - Especificação completa do módulo
  - Roadmap de 4 fases (MVP, Avançado, Gestão, IA)
  - 19 seções cobrindo todos os aspectos

#### Corrigido
- **Botão Atualizar** - Agora força revalidação real ao invés de usar cache
  - `mutate()` agora usa opção `{ revalidate: true }` para bypass de deduplicação
  - Botão "Atualizar" sempre faz nova requisição à API
  - Mantém cache SWR funcionando normalmente para auto-refresh

#### Modificado
- **Filtro Padrão do Dashboard** - Mudado de "Este Mês" para "Hoje"
  - `app/page.tsx` agora usa `getTodayRange()` ao invés de `getThisMonthRange()`
  - Dashboard abre mostrando dados do dia atual por padrão
  - Melhora UX ao focar em métricas mais recentes

#### Adicionado
- **Sistema de Cache Completo** - Melhoria de performance dramática
  - Cache in-memory no servidor (`lib/cache.ts`)
  - TTL configurável de 5 minutos
  - Auto-cleanup de entradas expiradas
  - Logs detalhados de cache hits/misses
- **SWR para Cache Client-Side**
  - Instalado pacote `swr` para React
  - Cache automático no navegador
  - Revalidação em foco de janela
  - Auto-refresh a cada 5 minutos
  - Deduplicação de requests (30 segundos)
  - Retry automático (3 tentativas em erro)
- **Timeout em Requests**
  - Cliente CartPanda agora tem timeout de 30 segundos
  - AbortController para cancelar requests lentos
  - Tratamento de erro específico para timeouts
- **Métricas de Performance**
  - Objeto `_meta` na resposta da API com:
    - `cached`: booleano indicando se veio do cache
    - `duration`: tempo de processamento em ms
    - `ordersTotal`: total de pedidos buscados
    - `ordersFiltered`: pedidos no período filtrado
- **Indicadores Visuais de Cache**
  - Header do dashboard mostra "⚡ Cache" ou "🌐 API"
  - Exibe duração do request em ms
  - Mostra quantidade de pedidos filtrados

#### Modificado
- API Route otimizada (`app/api/metrics/route.ts`):
  - Removido `force-dynamic` para permitir caching
  - Adicionado cache de pedidos com chave única
  - Headers HTTP de cache para CDN (s-maxage=300)
  - Logs de performance com duração de requests
- Cliente CartPanda (`lib/cartpanda/client.ts`):
  - Parâmetros opcionais `useCache` e `cacheTTL`
  - Integração com sistema de cache in-memory
- Dashboard (`app/page.tsx`):
  - Substituído `useState` + `useEffect` por `useSWR`
  - Estado de loading otimizado
  - Tratamento de erro melhorado

#### Performance
- **Cache MISS (primeira carga)**: ~7.4 segundos (busca API)
- **Cache HIT (cargas subsequentes)**: ~1ms (7438x mais rápido!)
- **Redução de chamadas à API**: ~95% menos requests
- **Economia de banda**: Significativa
- **Escalabilidade**: Suporta muito mais usuários simultâneos

### 2025-11-10

#### Modificado
- **BREAKING CHANGE**: Mudança de USD para BRL como moeda base do dashboard
  - Todos os cálculos agora usam `total_price` (BRL) ao invés de `local_currency_amount` (USD)
  - `formatCurrency()` agora formata valores em Reais (R$) ao invés de Dólares ($)
  - Atividades recentes agora exibem valores com "R$" ao invés de "$"
  - Produtos e afiliados calculados em BRL
  - Reembolsos e chargebacks calculados em BRL

#### Corrigido
- Corrigido problema de timezone que causava shift de datas
  - Implementado `extractLocalDate()` para extrair data local sem conversão UTC
  - Pedidos de 2025-11-09 agora aparecem corretamente (antes apareciam como 2025-11-10)
- Corrigido discrepância de receita com dashboard oficial da CartPanda
  - Agora subtraímos pedidos com status "Refunded" e "Chargeback" do cálculo de receita
  - Receita líquida = Total de pedidos pagos - Reembolsos - Chargebacks
- Corrigido filtros de data que não atualizavam o dashboard
  - Implementado filtro client-side (API CartPanda não respeita parâmetros de data)
  - Buscamos últimos 90 dias e filtramos no servidor

#### Adicionado
- Filtros de data abrangentes:
  - Hoje
  - Ontem
  - Esta Semana
  - Última Semana
  - Este Mês
  - Mês Passado
  - Seletor de período personalizado
- Componente `DateRangePicker` para seleção de intervalos de data
- Utilitários de data em `lib/dateUtils.ts`:
  - `getComparisonPeriod()` - Calcula período de comparação
  - `formatDateString()` - Formata datas no padrão YYYY-MM-DD
  - Funções para cada preset de data
- Função `extractLocalDate()` em `lib/cartpanda/utils.ts`
- Tracking de refunds e chargebacks nas métricas

### 2025-11-09 (ou antes)

#### Adicionado
- Estrutura inicial do projeto Next.js 15
- Integração com CartPanda API v3
  - Cliente HTTP em `lib/cartpanda/client.ts`
  - Types em `lib/cartpanda/types.ts`
  - Utilitários de cálculo em `lib/cartpanda/utils.ts`
- Dashboard principal em `app/page.tsx`
- API Route `/api/metrics` para processamento de dados
- Componentes do dashboard:
  - `StatCard` - Cards de métricas KPI
  - `RevenueChart` - Gráfico de receita
  - `TopProducts` - Produtos mais vendidos
  - `AffiliatesTable` - Tabela de afiliados
  - `RefundChargebackCards` - Cards de reembolsos e chargebacks
  - `ActivityFeed` - Feed de atividades recentes
- Configuração Tailwind com glassmorphism
- Variáveis de ambiente para credenciais CartPanda

## Decisões Importantes

### Moeda Base: BRL
**Data:** 2025-11-10
**Decisão:** Usar BRL como moeda base ao invés de USD
**Motivo:** BRL é a "fonte da verdade" na API CartPanda. Campos USD apresentam anomalias em alguns pedidos.

### Filtro Client-Side
**Data:** 2025-11-10
**Decisão:** Implementar filtro de datas no servidor ao invés de confiar nos parâmetros da API
**Motivo:** API CartPanda não respeita parâmetros `start_date` e `end_date`, sempre retorna os mesmos pedidos.

### Extração de Data Local
**Data:** 2025-11-10
**Decisão:** Extrair data diretamente da string ISO sem conversão para UTC
**Motivo:** `.toISOString()` converte para UTC e muda a data. Pedido de 23h no Brasil vira dia seguinte.

### Receita Líquida
**Data:** 2025-11-10
**Decisão:** Subtrair refunds e chargebacks do cálculo de receita
**Motivo:** Para alinhar com o dashboard oficial da CartPanda que mostra receita líquida.

### Sistema de Cache
**Data:** 2025-11-11
**Decisão:** Implementar cache in-memory no servidor + SWR no cliente
**Motivo:** Performance dramática - reduz tempo de resposta de ~7.4s para ~1ms (7438x mais rápido) em cache hits.
