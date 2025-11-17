# Session Log - Dashboard Escala Independente

Este arquivo preserva o histórico de desenvolvimento entre sessões do Claude Code.
**Última atualização**: 2025-11-13 15:00 UTC-3

---

## Sessão 2025-11-13 (Atual)

### Contexto da sessão
Continuação do desenvolvimento após deploy em produção. Dashboard funcionando mas com inconsistências de contagem.

### Problemas identificados

#### 1. Dashboard vazio no Vercel (RESOLVIDO ✅)
**Causa**: React 19 (Beta) incompatível com Next.js 15 + SWR
**Solução**: Downgrade React 19 → React 18.3.1
**Commit**: 8e46fea1
**Status**: Deployado e funcionando

#### 2. Contagem de pedidos inconsistente (EM ANDAMENTO 🔄)
**Problema**: Dashboard mostra 24 pedidos, CartPanda mostra 21
**Causas identificadas**:
- Não filtramos por status (contamos todos vs apenas Paid)
- Timezone pode estar incorreto (UTC vs UTC-3)
- CartPanda filtra apenas pedidos Paid

**Decisões tomadas**:
- Usar timezone de Brasília (UTC-3) para todas as datas
- Filtrar apenas pedidos com status "Paid" (financial_status = 3)
- Adicionar visualização de status no dashboard

**Arquivos a modificar**:
- `lib/dateUtils.ts` - Adicionar timezone UTC-3
- `lib/supabase/queries.ts` - Filtrar apenas Paid
- `components/ActivityFeed.tsx` - Adicionar badge de status

---

### Tarefas em progresso

#### FASE 1: Full Sync (últimos 12 meses)
**Status**: Rodando em background (bash 0ba57d)
**Progresso**: Iniciado às 14:23 UTC, ~30min esperado
**Arquivos criados**:
- `scripts/full-sync.ts` (350 linhas)
- `scripts/validate-sync.ts` (300 linhas)
- Modificado `lib/cartpanda/client.ts` (MAX_PAGES: 60 → 200)

#### FASE 2-4: Pendentes
- FASE 2: Validação diária automática (GitHub Actions + Cron)
- FASE 3: Webhook real-time CartPanda
- FASE 4: Monitoramento e alertas

---

### Histórico de commits (ordem cronológica)

```
09bb06d8 - feat: Implementa full sync e validação (FASE 1)
8e46fea1 - fix: Downgrade React 19 → 18 (corrige dashboard)
[próximo] - fix: Alinhar contagem com CartPanda (filtro status + timezone)
```

---

### Comandos úteis desta sessão

```bash
# Full sync rodando em background
NEXT_PUBLIC_CARTPANDA_API_URL="..." npm run sync:full

# Deploy Vercel
vercel --prod

# Validação de dados
npm run validate
npm run validate --autofix

# Build local
npm run build
npm run dev
```

---

### Notas técnicas importantes

**Timezone handling**:
- CartPanda API retorna: `"2025-11-09T23:28:16-03:00"` (Brasília)
- Postgres armazena como: `TIMESTAMP WITH TIME ZONE` (converte para UTC)
- Queries devem usar: `'YYYY-MM-DDT00:00:00-03:00'` para filtrar corretamente

**Status de pedidos**:
- `financial_status = 3` → Paid
- `payment_status = 3` → Paid
- Função helper: `isOrderPaid()` em `lib/shared/utils.ts`

**Paginação API**:
- MAX_PAGES = 200 (~10.000 orders = 12 meses)
- Detecta duplicados após 3 páginas consecutivas
- Safety limit em 300 páginas

---

## Como usar este log

1. **Antes de crashar/desligar**: Commit com mensagem descritiva
2. **Após retomar**: Ler este arquivo para contexto completo
3. **Atualizar após mudanças importantes**: Registrar decisões e problemas

---

## Próximos passos (quando retomar)

1. ✅ Verificar se full sync completou
2. ✅ Aplicar correção de filtro de status
3. ✅ Aplicar correção de timezone
4. ✅ Testar localmente que conta 21 pedidos
5. ✅ Deploy e verificar em produção
6. → Iniciar FASE 2 (validação automática)
