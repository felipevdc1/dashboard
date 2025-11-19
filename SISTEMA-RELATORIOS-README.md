# 📊 Sistema de Relatórios CartPanda - Guia Completo

Sistema completo de relatórios para análise de Reembolsos e Chargebacks com notas estruturadas importadas dos CSVs da CartPanda.

## 🎯 O que foi implementado

### ✅ FASE 2: Importação de Notas (CSV)

**2.1 Database Migration**
- Arquivo: `supabase/migrations/007_order_notes.sql`
- Tabela: `order_notes` com campos estruturados
- **STATUS:** ⚠️ REQUER AÇÃO MANUAL (ver instruções abaixo)

**2.2 Script de Importação**
- Arquivo: `scripts/import-cartpanda-notes.ts`
- Comando: `npm run import:notes`
- Parser de regex para extrair: Canal, Motivo, Responsável, Devolveu, Obs
- Batch insert (100 registros por vez)
- **STATUS:** ✅ PRONTO

**2.3 Query Helpers**
- Arquivo: `lib/reports/queries.ts`
- Funções:
  - `getOrdersWithNotes()` - Busca com filtros
  - `getReportSummary()` - Agregações
  - `getFilterOptions()` - Valores únicos para dropdowns
  - `getOrderNote()` - Nota individual
- **STATUS:** ✅ PRONTO

### ✅ FASE 3: APIs de Relatórios

**3.1 GET /api/reports/refunds**
- Lista refunds com notas
- Filtros: canal, motivo, responsável, devolveu, período, afiliado
- Paginação (50 por página)
- Cache: 2 minutos
- **STATUS:** ✅ PRONTO

**3.2 GET /api/reports/chargebacks**
- Lista chargebacks com notas
- Mesmos filtros e paginação de refunds
- Cache: 2 minutos
- **STATUS:** ✅ PRONTO

**3.3 GET /api/reports/summary**
- Agregações por Canal, Motivo, Responsável
- Taxa de devolução
- Totais de count e amount
- Cache: 2 minutos
- **STATUS:** ✅ PRONTO

### ✅ FASE 4: Interface Web

**4.1 Página /relatorios/reembolsos**
- Tabela de refunds com todas as colunas
- Filtros interativos
- Paginação
- Stats cards (total, página, registros)
- **STATUS:** ✅ PRONTO

**4.2 Página /relatorios/chargebacks**
- Tabela de chargebacks com todas as colunas
- Filtros interativos
- Paginação
- Stats cards
- **STATUS:** ✅ PRONTO

**4.3 Dashboard Analítico /relatorios**
- Seletor de tipo (Refund/Chargeback)
- 3 cards de resumo: Total, Valor, Taxa Devolução
- 2 gráficos: Canal (Bar), Motivos (Pie)
- 3 listas detalhadas: Top 5 por Canal, Motivo, Responsável
- Links rápidos para relatórios detalhados
- **STATUS:** ✅ PRONTO

### ✅ Componentes Criados

**components/reports/ReportFilters.tsx**
- Filtros reutilizáveis
- 6 campos: Canal, Motivo, Responsável, Devolveu, Data Início, Data Fim
- Botões: Aplicar, Limpar

**components/reports/ReportTable.tsx**
- Tabela reutilizável
- 8 colunas: Pedido, Data, Cliente, Canal, Motivo, Responsável, Devolveu, Valor
- Loading state
- Empty state

## 📋 Instruções para Ativar o Sistema

### Passo 1: Aplicar Migration (OBRIGATÓRIO)

O sistema **NÃO FUNCIONARÁ** até você criar a tabela `order_notes` no Supabase.

**Como aplicar:**
1. Abra: [Supabase SQL Editor](https://supabase.com/dashboard/project/swogockrnapyymcuorgs/editor/sql/new)
2. Copie TODO o conteúdo de: `supabase/migrations/007_order_notes.sql`
3. Cole no SQL Editor
4. Clique em "Run"
5. Verifique se apareceu: "Success. No rows returned"

**Ou siga as instruções em:** `MIGRATION-007-INSTRUCTIONS.md`

### Passo 2: Importar Notas dos CSVs

Após aplicar a migration, rode:

```bash
npm run import:notes
```

**Resultado esperado:**
- REEMBOLSOS: ~50 notas importadas
- CHARGEBACKS: ~550 notas importadas
- Total: ~600 notas

### Passo 3: Acessar as Páginas

```bash
npm run dev
```

Acesse:
- **Dashboard:** http://localhost:3000/relatorios
- **Reembolsos:** http://localhost:3000/relatorios/reembolsos
- **Chargebacks:** http://localhost:3000/relatorios/chargebacks

## 🔄 Fluxo de Atualização dos Dados

### Dados da API (Automático)
- Orders, refunds, chargebacks
- Sync diário via Vercel Cron (00:00 UTC)
- Ou manual: `npm run sync`

### Dados do CSV (Manual)
- Notas estruturadas (Canal, Motivo, etc.)
- Quando receber novo CSV:
  1. Coloque em: `relatorios cartpanda/`
  2. Rode: `npm run import:notes`
  3. As notas serão upserted (atualiza se já existir)

## 📊 Estrutura de Dados

### Tabela `order_notes`

```sql
order_id        BIGINT PRIMARY KEY
canal           VARCHAR(100)    -- Ex: "Manifestsuccess", "Badboys"
motivo          VARCHAR(255)    -- Ex: "Desistência", "Desconfiança"
responsavel     VARCHAR(100)    -- Ex: "Sem contato", "Cartpanda"
devolveu        BOOLEAN         -- true/false
observacoes     TEXT            -- Texto livre
tipo            VARCHAR(20)     -- 'refund' ou 'chargeback'
source          VARCHAR(50)     -- 'csv_import' ou 'manual'
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### Join com Orders

As queries fazem `INNER JOIN` entre `orders` e `order_notes`:
- Só retorna orders que TÊM notas
- Filtra por `tipo` (refund ou chargeback)
- Combina dados da API + dados do CSV

## 🎨 Design System

### Cores por Tipo
- **Refunds:** Azul (`from-blue-900/20`)
- **Chargebacks:** Vermelho (`from-red-900/20`)
- **Dashboard:** Roxo (`from-purple-900/20`)

### Componentes Visuais
- Glass morphism (`.glass`)
- Gradientes escuros
- Badges coloridos para status
- Checkmarks para Devolveu (✓/✗)

## 🚀 Próximos Passos (Opcional)

### Melhorias Futuras
1. **Exportar para CSV/Excel**
   - Botão "Exportar" em cada relatório
   - Gera CSV com dados filtrados

2. **Observações Expandíveis**
   - Click em linha da tabela
   - Modal/drawer com campo `observacoes` completo

3. **Filtros Avançados**
   - Range de valores
   - Busca por texto nas observações

4. **Gráficos Temporais**
   - Tendência de refunds/chargebacks ao longo do tempo
   - Comparação mês a mês

5. **Alertas**
   - Notificação quando taxa de chargeback > threshold
   - Email semanal com resumo

## 📁 Arquivos Criados

### Backend
```
lib/reports/
├── types.ts                      # Interfaces TypeScript
└── queries.ts                    # Query helpers

app/api/reports/
├── refunds/route.ts             # API de refunds
├── chargebacks/route.ts         # API de chargebacks
└── summary/route.ts             # API de summary

scripts/
├── import-cartpanda-notes.ts    # Import das notas
└── investigate-refunds.ts       # Debug helper

supabase/migrations/
└── 007_order_notes.sql          # Database schema
```

### Frontend
```
app/relatorios/
├── page.tsx                     # Dashboard analítico
├── reembolsos/page.tsx         # Lista de refunds
└── chargebacks/page.tsx        # Lista de chargebacks

components/reports/
├── ReportFilters.tsx           # Filtros reutilizáveis
└── ReportTable.tsx             # Tabela reutilizável
```

### Documentação
```
MIGRATION-007-INSTRUCTIONS.md   # Instruções da migration
SISTEMA-RELATORIOS-README.md    # Este arquivo
package.json                     # Scripts adicionados
```

## 🔍 Troubleshooting

### "Could not find the table 'public.order_notes'"
- **Causa:** Migration não foi aplicada
- **Solução:** Siga Passo 1 acima

### "Nenhum registro encontrado"
- **Causa:** Import não foi rodado ou filtros muito restritivos
- **Solução:** Rode `npm run import:notes` e verifique filtros

### APIs retornam erro 500
- **Causa:** Problema de conexão com Supabase ou query inválida
- **Solução:** Verifique logs no terminal e credentials

### Gráficos não aparecem
- **Causa:** Chart.js não carregado ou dados vazios
- **Solução:** Verifique console do browser, selecione um tipo de relatório

## 📞 Suporte

Para questões técnicas:
1. Verifique os logs no terminal (`npm run dev`)
2. Verifique o console do browser (F12)
3. Confirme que migration foi aplicada
4. Confirme que import rodou com sucesso

---

**Status Final:** 🎉 **Sistema 100% Implementado e Pronto para Uso**

Requer apenas:
- ✅ Aplicar migration (você)
- ✅ Rodar import (você)
- ✅ Acessar as páginas
