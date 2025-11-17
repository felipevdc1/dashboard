# Setup: Validação Diária Automática (FASE 2)

Este guia explica como ativar a validação automática diária.

---

## ✅ O que já está pronto:

1. **API de Validação** `/api/validate`
   - ✅ Deployed em produção
   - ✅ Compara API vs Supabase
   - ✅ Auto-fix opcional

2. **GitHub Actions Workflow**
   - ✅ Configurado para rodar diariamente às 6h AM Brasília
   - ✅ Trigger automático de full sync se validação falhar

3. **Migration SQL**
   - ✅ Arquivo criado: `supabase/migrations/003_validation_logs.sql`
   - ⏳ **PENDENTE**: Executar no Supabase

---

## 🔧 Próximos passos:

### 1. Criar tabela `validation_logs` no Supabase

**Opção A: Via Supabase Dashboard (Recomendado)**

1. Acesse: https://supabase.com/dashboard/project/swogockrnapyymcuorgs
2. Va para **SQL Editor**
3. Clique em **New Query**
4. Cole o conteúdo do arquivo: `supabase/migrations/003_validation_logs.sql`
5. Clique em **Run**
6. Verifique se a tabela foi criada em **Table Editor**

**Opção B: Via Supabase CLI**

```bash
# Instalar Supabase CLI (se não tiver)
npm install -g supabase

# Login
supabase login

# Linkar projeto
supabase link --project-ref swogockrnapyymcuorgs

# Rodar migration
supabase db push
```

---

### 2. Testar API de Validação

```bash
# Teste simples
curl https://dashboard-rj3q39qfa-felipevdc1s-projects.vercel.app/api/validate

# Com auto-fix
curl https://dashboard-rj3q39qfa-felipevdc1s-projects.vercel.app/api/validate?autofix=true
```

**Resposta esperada:**
```json
{
  "timestamp": "2025-11-13T...",
  "counts": {
    "api": 9999,
    "database": 9999,
    "difference": 0
  },
  "inconsistencies": {
    "missing": 0,
    "outdated": 0
  },
  "accuracy": 100.0,
  "status": "OK",
  "fixed": false,
  "duration": 5234
}
```

---

### 3. Verificar GitHub Actions

1. Acesse: https://github.com/[seu-user]/[seu-repo]/actions
2. O workflow "Daily Data Validation" deve aparecer
3. Primeiro run será amanhã às 6h AM
4. Para testar agora: clique em **Run workflow** manualmente

---

## 📊 Como funciona:

### Fluxo automático diário:

```
06:00 AM (Brasília)
   ↓
GitHub Actions
   ↓
GET /api/validate?autofix=true
   ↓
Compara API vs Supabase
   ↓
Se OK (≥99% accuracy)
   → Log no Supabase
   → Workflow termina ✅

Se WARNING (95-99%)
   → Auto-fix inconsistências
   → Log no Supabase
   → Workflow termina ⚠️

Se CRITICAL (<95%)
   → Auto-fix inconsistências
   → Trigger full sync completo
   → Log no Supabase
   → Workflow termina ❌
```

---

## 🔍 Queries úteis

**Ver logs de validação:**
```sql
SELECT * FROM validation_logs
ORDER BY timestamp DESC
LIMIT 10;
```

**Ver resumo diário:**
```sql
SELECT * FROM validation_summary
ORDER BY date DESC;
```

**Ver últimas validações com problemas:**
```sql
SELECT *
FROM validation_logs
WHERE status != 'OK'
ORDER BY timestamp DESC;
```

---

## ⚡ Próximas fases:

- **FASE 3**: Webhook real-time CartPanda (sync instantâneo)
- **FASE 4**: Monitoramento e alertas (dashboard + notificações)

---

**Status**: ⏳ Aguardando criação da tabela no Supabase
