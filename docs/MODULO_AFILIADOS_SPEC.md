# Especificação Técnica - Módulo de Análise de Afiliados

**Versão:** 1.0.0
**Data:** 2025-11-11
**Status:** Em Desenvolvimento

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Estrutura de Dados](#estrutura-de-dados)
4. [Componentes](#componentes)
5. [API Endpoints](#api-endpoints)
6. [Roadmap de Implementação](#roadmap-de-implementação)

---

## Visão Geral

Módulo dedicado para análise profunda da performance de afiliados, oferecendo visibilidade 360° de métricas, qualidade de tráfego, produtos vendidos e evolução temporal.

### Objetivos

- ✅ Visibilidade total da performance de afiliados
- ✅ Identificar top performers e oportunidades
- ✅ Monitorar qualidade do tráfego
- ✅ Gestão baseada em dados (data-driven)
- ✅ Insights acionáveis automáticos

### Faseamento

**Fase 1 (MVP):** Tabela de ranking, KPIs básicos, filtros, detalhes individuais
**Fase 2:** Análise avançada, matrizes, heatmaps
**Fase 3:** Gestão de metas, alertas, comunicação
**Fase 4:** IA, simulações, gamificação

---

## Arquitetura

### Estrutura de Arquivos

```
app/
├── afiliados/
│   ├── page.tsx                    # Página principal
│   └── [id]/
│       └── page.tsx                # Detalhes do afiliado

components/
├── affiliates/
│   ├── AffiliateKPICards.tsx       # Cards de KPIs gerais
│   ├── AffiliatePerformanceChart.tsx
│   ├── AffiliateRankingTable.tsx   # Tabela principal
│   ├── AffiliateDetailsModal.tsx   # Modal de detalhes
│   ├── AffiliateFiltersBar.tsx     # Barra de filtros
│   ├── AffiliateScorebadge.tsx    # Badge de score
│   ├── AffiliateTimeline.tsx       # Timeline de vendas
│   └── AffiliateExportButton.tsx   # Botão de exportação

lib/
├── affiliates/
│   ├── types.ts                    # Types do módulo
│   ├── utils.ts                    # Funções de cálculo
│   ├── filters.ts                  # Lógica de filtros
│   └── export.ts                   # Funções de exportação

app/api/
├── affiliates/
│   ├── route.ts                    # GET /api/affiliates
│   ├── [id]/
│   │   └── route.ts                # GET /api/affiliates/:id
│   ├── performance/
│   │   └── route.ts                # GET /api/affiliates/performance
│   └── quality/
│       └── route.ts                # GET /api/affiliates/quality
```

---

## Estrutura de Dados

### Types TypeScript

```typescript
// lib/affiliates/types.ts

/**
 * Métricas completas de um afiliado
 */
export interface AffiliateMetrics {
  // Identificação
  id: string;
  name: string;
  email: string;
  slug: string;
  status: 'active' | 'inactive' | 'new';

  // Performance de Vendas
  sales: {
    total: number;                  // Número total de vendas
    revenue: number;                // Receita total gerada (BRL)
    averageTicket: number;          // Ticket médio
    growth: number;                 // % crescimento vs período anterior
    trend: 'up' | 'down' | 'stable';
  };

  // Comissões
  commissions: {
    total: number;                  // Total de comissões (BRL)
    average: number;                // Comissão média por venda
    percentage: number;             // % médio de comissão
    highest: number;                // Maior comissão em um pedido
    lowest: number;                 // Menor comissão em um pedido
  };

  // Qualidade
  quality: {
    approvalRate: number;           // % de pedidos aprovados
    refundRate: number;             // % de refunds
    chargebackRate: number;         // % de chargebacks
    score: number;                  // Score calculado (0-100)
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
  };

  // Produtos
  products: {
    uniqueCount: number;            // Nº de produtos diferentes
    topProduct: {
      id: string;
      name: string;
      sales: number;
      revenue: number;
    };
    diversification: number;        // Score de diversificação (0-100)
  };

  // Temporal
  temporal: {
    firstSale: string;              // Data primeira venda (ISO)
    lastSale: string;               // Data última venda (ISO)
    activeDays: number;             // Dias com pelo menos 1 venda
    frequency: number;              // Vendas por dia (média)
  };

  // Ranking
  ranking: {
    position: number;               // Posição no ranking geral
    movement: number;               // Mudança de posição vs período anterior
    percentile: number;             // Percentil (0-100)
  };

  // Comparação
  comparison: {
    vsAverage: number;              // % acima/abaixo da média
    vsTop: number;                  // % em relação ao #1
    aboveMedian: boolean;
  };
}

/**
 * Filtros disponíveis
 */
export interface AffiliateFilters {
  // Período
  startDate: string;
  endDate: string;
  comparePeriod: boolean;

  // Busca
  search?: string;                  // Nome, email ou slug

  // Status
  status?: ('active' | 'inactive' | 'new')[];

  // Valores
  minRevenue?: number;
  maxRevenue?: number;
  minSales?: number;
  maxSales?: number;

  // Qualidade
  minScore?: number;
  maxRefundRate?: number;
  maxChargebackRate?: number;

  // Produtos
  productIds?: string[];

  // Ordenação
  sortBy: 'revenue' | 'sales' | 'score' | 'growth' | 'commissions';
  sortOrder: 'asc' | 'desc';

  // Paginação
  page: number;
  perPage: number;
}

/**
 * Resposta da API com lista de afiliados
 */
export interface AffiliatesResponse {
  affiliates: AffiliateMetrics[];
  summary: {
    totalAffiliates: number;
    activeAffiliates: number;
    totalRevenue: number;
    totalCommissions: number;
    averageScore: number;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    perPage: number;
  };
  _meta: {
    cached: boolean;
    duration: number;
    filters: AffiliateFilters;
  };
}

/**
 * Detalhes completos de um afiliado individual
 */
export interface AffiliateDetails extends AffiliateMetrics {
  // Timeline de vendas
  timeline: AffiliateOrder[];

  // Produtos vendidos (detalhado)
  productsSold: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
    commissions: number;
    percentage: number;
  }[];

  // Clientes
  customers: {
    total: number;
    new: number;
    returning: number;
    averageLTV: number;
  };

  // Performance temporal (últimos 30 dias)
  performanceTimeline: {
    date: string;
    sales: number;
    revenue: number;
    commissions: number;
  }[];

  // Heatmap (dia da semana × hora)
  activityHeatmap: {
    [dayOfWeek: string]: {
      [hour: string]: number;
    };
  };
}

/**
 * Pedido no contexto de afiliado
 */
export interface AffiliateOrder {
  orderId: number;
  orderNumber: string;
  createdAt: string;
  status: string;
  customer: {
    name: string;
    email: string;
  };
  product: {
    id: string;
    name: string;
  };
  revenue: number;
  commission: number;
  isRefund: boolean;
  isChargeback: boolean;
}

/**
 * KPIs globais do módulo
 */
export interface AffiliateKPIs {
  totalRevenue: {
    value: number;
    change: number;
    trend: number[];
  };
  totalCommissions: {
    value: number;
    percentage: number;           // % da receita total
    change: number;
  };
  activeAffiliates: {
    total: number;
    new: number;                  // Novos no período
    inactive: number;
    change: number;
  };
  averageTicket: {
    value: number;
    vsGeneral: number;            // Comparação com ticket médio geral
    change: number;
  };
  totalSales: {
    value: number;
    perAffiliate: number;
    change: number;
  };
  roi: {
    value: number;                // Receita / Comissões
    netMargin: number;            // Margem após comissões
    change: number;
  };
}
```

---

## Componentes

### 1. AffiliateKPICards

**Responsabilidade:** Exibe os 6 KPIs principais do módulo

**Props:**
```typescript
interface AffiliateKPICardsProps {
  kpis: AffiliateKPIs;
  loading?: boolean;
}
```

**Visual:**
- Grid de 6 cards (3 colunas em desktop, 2 em tablet, 1 em mobile)
- Cada card com valor principal, variação % e sparkline
- Cores temáticas (verde para positivo, vermelho para negativo)

---

### 2. AffiliatePerformanceChart

**Responsabilidade:** Gráfico temporal de performance

**Props:**
```typescript
interface AffiliatePerformanceChartProps {
  data: {
    date: string;
    revenue: number;
    commissions: number;
    sales: number;
  }[];
  period: 'daily' | 'weekly' | 'monthly';
  compareWith?: 'previous' | 'lastYear';
}
```

**Recursos:**
- Gráfico de linha multi-séries
- Toggle para mostrar/ocultar séries
- Tooltip com detalhes
- Zoom e pan

**Biblioteca:** Recharts

---

### 3. AffiliateRankingTable

**Responsabilidade:** Tabela principal com ranking de afiliados

**Props:**
```typescript
interface AffiliateRankingTableProps {
  affiliates: AffiliateMetrics[];
  filters: AffiliateFilters;
  onFilterChange: (filters: Partial<AffiliateFilters>) => void;
  onRowClick: (affiliateId: string) => void;
  loading?: boolean;
  pagination: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}
```

**Colunas:**
1. Ranking (com badge de movimento)
2. Nome do Afiliado
3. Email
4. Vendas
5. Receita
6. Ticket Médio
7. Comissões
8. Score
9. Status
10. Ações

**Recursos:**
- Ordenação por qualquer coluna
- Busca inline
- Filtros por coluna
- Paginação
- Loading skeletons
- Empty state
- Responsive (scroll horizontal em mobile)

---

### 4. AffiliateDetailsModal

**Responsabilidade:** Modal/Drawer com detalhes completos do afiliado

**Props:**
```typescript
interface AffiliateDetailsModalProps {
  affiliateId: string;
  isOpen: boolean;
  onClose: () => void;
}
```

**Seções:**
1. Header com info básica
2. KPIs do afiliado (mini cards)
3. Gráfico de performance individual
4. Tabela de produtos vendidos
5. Timeline de pedidos (últimos 10)
6. Análise de qualidade
7. Botões de ação (Exportar, Email, Editar)

**Abordagem:**
- Drawer lateral em desktop (800px)
- Full screen em mobile
- Lazy load de dados
- Tabs para organizar conteúdo

---

### 5. AffiliateFiltersBar

**Responsabilidade:** Barra de filtros global

**Props:**
```typescript
interface AffiliateFiltersBarProps {
  filters: AffiliateFilters;
  onChange: (filters: Partial<AffiliateFilters>) => void;
  onReset: () => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string) => void;
}
```

**Controles:**
- DateRangePicker (período)
- Input de busca
- Select múltiplo (status)
- Range sliders (receita, vendas)
- Dropdown de produtos
- Botão "Limpar Filtros"
- Botão "Salvar Filtro"

**Visual:**
- Sticky ao topo ao fazer scroll
- Animação de collapse/expand
- Badge com nº de filtros ativos

---

### 6. AffiliateScoreBadge

**Responsabilidade:** Badge visual do score de qualidade

**Props:**
```typescript
interface AffiliateScoreBadgeProps {
  score: number;                    // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}
```

**Visual:**
- Cor baseada no grade (A=verde, F=vermelho)
- Ícone opcional (estrela, troféu, etc)
- Tooltip com detalhes do cálculo
- Animação ao carregar

---

### 7. AffiliateTimeline

**Responsabilidade:** Lista cronológica de pedidos

**Props:**
```typescript
interface AffiliateTimelineProps {
  orders: AffiliateOrder[];
  limit?: number;
  showFilters?: boolean;
  onOrderClick?: (orderId: number) => void;
}
```

**Visual:**
- Linha vertical conectando items
- Card para cada pedido
- Ícones por tipo (venda, refund, chargeback)
- Cores por status
- Load more / paginação

---

### 8. AffiliateExportButton

**Responsabilidade:** Menu dropdown para exportação

**Props:**
```typescript
interface AffiliateExportButtonProps {
  affiliates: AffiliateMetrics[];
  filters: AffiliateFilters;
  formats: ('csv' | 'excel' | 'pdf' | 'json')[];
}
```

**Opções:**
- CSV (dados brutos)
- Excel (formatado, múltiplas abas)
- PDF (relatório visual)
- JSON (API)

**Funcionalidade:**
- Gera arquivo no client-side (client-side export)
- ou faz POST /api/affiliates/export (server-side)
- Loading state enquanto processa
- Toast de sucesso/erro

---

## API Endpoints

### GET /api/affiliates

**Descrição:** Retorna lista de afiliados com métricas

**Query Params:**
```typescript
{
  start_date: string;           // YYYY-MM-DD
  end_date: string;
  compare: boolean;             // Se true, calcula comparação
  search?: string;
  status?: string;              // 'active,inactive,new'
  min_revenue?: number;
  max_revenue?: number;
  min_sales?: number;
  max_sales?: number;
  min_score?: number;
  product_ids?: string;         // '123,456,789'
  sort_by?: string;             // 'revenue' | 'sales' | 'score'
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;            // Default: 25
}
```

**Response:** `AffiliatesResponse`

**Cache:** 5 minutos

**Implementação:**
1. Busca todos os pedidos do período (usando cache existente)
2. Filtra pedidos por afiliado
3. Calcula métricas para cada afiliado
4. Aplica filtros adicionais
5. Ordena e pagina
6. Retorna resposta

---

### GET /api/affiliates/:id

**Descrição:** Retorna detalhes completos de um afiliado

**Params:**
- `id`: ID/slug/email do afiliado

**Query Params:**
```typescript
{
  start_date: string;
  end_date: string;
}
```

**Response:** `AffiliateDetails`

**Cache:** 5 minutos

**Implementação:**
1. Busca pedidos do afiliado
2. Calcula todas as métricas
3. Gera timeline
4. Calcula heatmap
5. Retorna detalhes completos

---

### GET /api/affiliates/performance

**Descrição:** Retorna série temporal de performance

**Query Params:**
```typescript
{
  start_date: string;
  end_date: string;
  affiliate_ids?: string;       // 'id1,id2,id3' ou 'all'
  granularity: 'daily' | 'weekly' | 'monthly';
}
```

**Response:**
```typescript
{
  series: {
    date: string;
    affiliates: {
      [affiliateId: string]: {
        sales: number;
        revenue: number;
        commissions: number;
      };
    };
    total: {
      sales: number;
      revenue: number;
      commissions: number;
    };
  }[];
  _meta: {
    cached: boolean;
    duration: number;
  };
}
```

---

### GET /api/affiliates/quality

**Descrição:** Retorna análise de qualidade

**Query Params:**
```typescript
{
  start_date: string;
  end_date: string;
}
```

**Response:**
```typescript
{
  affiliates: {
    id: string;
    name: string;
    qualityMetrics: {
      approvalRate: number;
      refundRate: number;
      chargebackRate: number;
      score: number;
      grade: 'A' | 'B' | 'C' | 'D' | 'F';
    };
  }[];
  summary: {
    averageScore: number;
    highQuality: number;        // Count de afiliados com A ou B
    needsAttention: number;     // Count com D ou F
  };
}
```

---

### POST /api/affiliates/export

**Descrição:** Gera exportação em formato solicitado

**Body:**
```typescript
{
  format: 'csv' | 'excel' | 'pdf' | 'json';
  filters: AffiliateFilters;
  includeTimeline?: boolean;
  includeProducts?: boolean;
}
```

**Response:**
- Para CSV/Excel/PDF: Download do arquivo
- Para JSON: Dados estruturados

---

## Cálculos e Fórmulas

### Score de Qualidade

```typescript
function calculateQualityScore(metrics: {
  approvalRate: number;
  refundRate: number;
  chargebackRate: number;
}): number {
  const approvalWeight = 0.4;
  const refundWeight = 0.3;
  const chargebackWeight = 0.3;

  const approvalScore = metrics.approvalRate;
  const refundScore = 100 - metrics.refundRate;
  const chargebackScore = 100 - metrics.chargebackRate;

  const score =
    (approvalScore * approvalWeight) +
    (refundScore * refundWeight) +
    (chargebackScore * chargebackWeight);

  return Math.round(score);
}

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}
```

### Cálculo de Comissões

```typescript
function calculateCommissions(orders: CartPandaOrder[]): {
  total: number;
  average: number;
  percentage: number;
  highest: number;
  lowest: number;
} {
  const paidOrders = orders.filter(isOrderPaid);

  const commissions = paidOrders.map(o =>
    parseFloat(o.affiliate_amount || '0')
  );

  const total = commissions.reduce((sum, c) => sum + c, 0);
  const average = total / (paidOrders.length || 1);

  const revenue = paidOrders.reduce((sum, o) =>
    sum + parseFloat(o.total_price), 0
  );

  const percentage = revenue > 0 ? (total / revenue) * 100 : 0;

  return {
    total,
    average,
    percentage,
    highest: Math.max(...commissions, 0),
    lowest: Math.min(...commissions, 0),
  };
}
```

### Diversificação de Produtos

```typescript
function calculateProductDiversification(
  productsSold: { productId: string; quantity: number }[]
): number {
  if (productsSold.length === 0) return 0;
  if (productsSold.length === 1) return 0;

  const totalQuantity = productsSold.reduce((sum, p) => sum + p.quantity, 0);

  // Calcula índice de Shannon (entropia)
  const entropy = productsSold.reduce((sum, p) => {
    const proportion = p.quantity / totalQuantity;
    return sum - (proportion * Math.log2(proportion));
  }, 0);

  // Normaliza para 0-100
  const maxEntropy = Math.log2(productsSold.length);
  const diversification = (entropy / maxEntropy) * 100;

  return Math.round(diversification);
}
```

---

## Roadmap de Implementação

### Fase 1: MVP (Semana 1-2)

**Prioridade:** Alta
**Complexidade:** Média

#### Tasks:

- [ ] **API Backend**
  - [ ] Criar `lib/affiliates/types.ts` com todos os types
  - [ ] Criar `lib/affiliates/utils.ts` com funções de cálculo
  - [ ] Implementar `GET /api/affiliates`
  - [ ] Implementar `GET /api/affiliates/:id`
  - [ ] Testes das APIs

- [ ] **Componentes Base**
  - [ ] AffiliateKPICards
  - [ ] AffiliateRankingTable
  - [ ] AffiliateFiltersBar
  - [ ] AffiliateScoreBadge

- [ ] **Página Principal**
  - [ ] Criar `app/afiliados/page.tsx`
  - [ ] Integrar componentes
  - [ ] Implementar filtros
  - [ ] Estado de loading
  - [ ] Empty state

- [ ] **Detalhes**
  - [ ] AffiliateDetailsModal
  - [ ] Lazy load de dados
  - [ ] Timeline básica

- [ ] **Exportação**
  - [ ] AffiliateExportButton
  - [ ] Exportação CSV

**Entregável:** Página funcional com ranking, KPIs, filtros e detalhes básicos

---

### Fase 2: Análise Avançada (Semana 3-4)

**Prioridade:** Alta
**Complexidade:** Alta

#### Tasks:

- [ ] **Visualizações**
  - [ ] AffiliatePerformanceChart (temporal)
  - [ ] Gráfico de pizza (distribuição)
  - [ ] Heatmap de atividade

- [ ] **Análise de Qualidade**
  - [ ] Matriz de qualidade
  - [ ] Score detalhado
  - [ ] Alertas de qualidade

- [ ] **Produtos**
  - [ ] Matriz afiliado × produto
  - [ ] Top produtos por afiliado
  - [ ] Análise de diversificação

- [ ] **API Adicional**
  - [ ] GET /api/affiliates/performance
  - [ ] GET /api/affiliates/quality

**Entregável:** Visualizações avançadas e análise profunda

---

### Fase 3: Gestão (Semana 5-6)

**Prioridade:** Média
**Complexidade:** Média

#### Tasks:

- [ ] **Metas**
  - [ ] Model de metas no banco (se necessário)
  - [ ] CRUD de metas
  - [ ] Painel de acompanhamento
  - [ ] Progresso visual

- [ ] **Alertas**
  - [ ] Sistema de detecção de anomalias
  - [ ] Centro de notificações
  - [ ] Tipos de alerta (performance, qualidade)

- [ ] **Comunicação**
  - [ ] Integração com email
  - [ ] Templates
  - [ ] Histórico

**Entregável:** Gestão ativa com metas e alertas

---

### Fase 4: Avançado (Futuro)

**Prioridade:** Baixa
**Complexidade:** Alta

#### Tasks:

- [ ] **Inteligência**
  - [ ] Recomendações de produtos
  - [ ] Análise preditiva
  - [ ] Segmentação automática

- [ ] **Simulações**
  - [ ] Simulador de comissões
  - [ ] Cenários what-if

- [ ] **Gamificação**
  - [ ] Badges
  - [ ] Leaderboard público
  - [ ] Desafios

**Entregável:** Funcionalidades de IA e engajamento

---

## Considerações Técnicas

### Performance

- **Cache agressivo** nos endpoints (5 min)
- **Lazy load** de detalhes
- **Paginação** server-side
- **Virtual scrolling** para tabelas grandes
- **Web Workers** para cálculos pesados

### Responsividade

- **Mobile-first** design
- **Breakpoints:** 640px, 768px, 1024px, 1280px
- **Tabelas:** Scroll horizontal em mobile
- **Gráficos:** Adaptativos

### Acessibilidade

- **ARIA labels** em todos os componentes
- **Navegação por teclado**
- **Screen reader** friendly
- **Contraste** adequado (WCAG AA)

### SEO

- **Server-side rendering** (Next.js App Router)
- **Meta tags** apropriadas
- **Canonical URLs**

---

## Métricas de Sucesso

### Técnicas

- ✅ Tempo de carregamento < 3s
- ✅ Score Lighthouse > 90
- ✅ Sem erros de console
- ✅ Cobertura de testes > 80%

### Negócio

- ✅ Uso diário da página
- ✅ Identificação de problemas de qualidade
- ✅ Melhoria na gestão de afiliados
- ✅ Insights acionáveis gerados

---

## Referências

- **Documentação CartPanda:** docs/API.md
- **Decisões Arquiteturais:** DECISIONS.md
- **Changelog:** CHANGELOG.md
- **Código de Filtros:** docs/CODIGO_FILTRO_API.md

---

**Próximos Passos:** Começar implementação da Fase 1 (MVP)
