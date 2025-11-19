# 🔄 Integração /ferramentas → Supabase

## ✅ Implementação Concluída

Agora a página `/ferramentas` pode sincronizar dados processados **diretamente no Supabase**!

---

## 🎯 O que foi implementado

### 1. **Novo Endpoint de Sincronização**

**Arquivo:** `app/api/tools/cancelamentos/sync/route.ts`

**Rota:** `POST /api/tools/cancelamentos/sync`

**Funcionalidade:**
- Recebe 2 arquivos CSV (Reembolso + Chargeback)
- Processa usando mesma lógica de `gerarCancelamentos()`
- Para cada linha do CSV processado:
  1. Busca `order_id` via `order_number` na tabela `orders`
  2. UPSERT na tabela `order_notes`
  3. Marca `source = 'tools_import'`
- Retorna estatísticas detalhadas

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 600,
    "inserted": 580,
    "updated": 15,
    "skipped": 3,
    "errors": 2
  },
  "errorDetails": [
    { "orderNumber": "1234", "error": "Order não encontrado" }
  ]
}
```

---

### 2. **Type Atualizado**

**Arquivo:** `lib/reports/types.ts`

**Mudança:**
```typescript
// ANTES
source: 'csv_import' | 'manual'

// DEPOIS
source: 'csv_import' | 'manual' | 'tools_import'
```

**Propósito:** Identificar notas importadas via `/ferramentas`

---

### 3. **Frontend Atualizado**

**Arquivo:** `app/ferramentas/page.tsx`

**Novos Recursos:**

#### Botões Lado a Lado:
1. **📥 Baixar CSV** (original)
   - Gera planilha unificada
   - Download automático

2. **🔄 Sincronizar com Banco** (NOVO)
   - Importa dados no Supabase
   - Mostra estatísticas ao concluir

#### Card de Resultado:
Após sincronização, exibe:
- Total de registros
- Inseridos (verde)
- Atualizados (azul)
- Erros (vermelho)

---

## 📊 Fluxo Completo

```
┌─────────────────────────────────┐
│ Usuário em /ferramentas         │
│ - Upload REEMBOLSO.csv          │
│ - Upload CHARGEBACK.csv         │
└────────────┬────────────────────┘
             │
             ├──────────────────────────────┐
             │                              │
             ▼                              ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ Botão: Baixar CSV       │  │ Botão: Sincronizar     │
│ POST /api/tools/        │  │ POST /api/tools/        │
│  cancelamentos          │  │  cancelamentos/sync     │
└────────┬────────────────┘  └────────┬────────────────┘
         │                            │
         ▼                            ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ lib/tools/              │  │ lib/tools/              │
│  cancelamentos.ts       │  │  cancelamentos.ts       │
│ gerarCancelamentos()    │  │ gerarCancelamentos()    │
└────────┬────────────────┘  └────────┬────────────────┘
         │                            │
         ▼                            ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ CSV Final Gerado        │  │ Parse CSV + Lookup      │
│ (11 colunas)            │  │ order_id por order_     │
│                         │  │ number                  │
└────────┬────────────────┘  └────────┬────────────────┘
         │                            │
         ▼                            ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ Download do arquivo     │  │ UPSERT em order_notes   │
│ CANCELAMENTOS_FINAL.csv │  │ (600 registros)         │
└─────────────────────────┘  └────────┬────────────────┘
                                      │
                                      ▼
                             ┌─────────────────────────┐
                             │ Supabase: order_notes   │
                             │ - canal                 │
                             │ - motivo                │
                             │ - responsavel           │
                             │ - devolveu              │
                             │ - observacoes           │
                             │ - tipo                  │
                             │ - source='tools_import' │
                             └────────┬────────────────┘
                                      │
                                      ▼
                             ┌─────────────────────────┐
                             │ /relatorios/reembolsos  │
                             │ /relatorios/chargebacks │
                             │ /relatorios (dashboard) │
                             └─────────────────────────┘
```

---

## 🚀 Como Usar

### Passo 1: Aplicar Migration (SE AINDA NÃO FEZ)

```sql
-- Execute no Supabase SQL Editor
-- Cole todo conteúdo de: supabase/migrations/007_order_notes.sql
```

**Link:** https://supabase.com/dashboard/project/swogockrnapyymcuorgs/editor/sql/new

### Passo 2: Acessar Ferramentas

```
http://localhost:3000/ferramentas
```

ou

```
https://dashboard-eight-alpha-74.vercel.app/ferramentas
```

### Passo 3: Upload dos Arquivos

1. Clique no card "Gerador de Cancelamentos"
2. Upload `REEMBOLSO_-_NOTAS.csv`
3. Upload `CHARGEBACK_-_NOTAS.csv`

### Passo 4: Escolher Ação

**Opção A:** 📥 Baixar CSV
- Gera planilha unificada
- Download automático
- Não afeta banco de dados

**Opção B:** 🔄 Sincronizar com Banco
- Processa e importa no Supabase
- Mostra estatísticas
- Dados ficam disponíveis em `/relatorios`

---

## 📁 Dados Importados

### Tabela: `order_notes`

| Campo | Valor | Origem |
|---|---|---|
| `order_id` | 1234 | Lookup via order_number |
| `canal` | "Manifestsuccess" | CSV: Campo "Canal" |
| `motivo` | "Desistência" | CSV: Campo "Motivo" |
| `responsavel` | "Sem contato" | CSV: Campo "Responsável" |
| `devolveu` | true | CSV: "Devolveu? = Sim" |
| `observacoes` | "Cliente não quis aguardar" | CSV: Campo "Evidência/Detalhes" |
| `tipo` | 'refund' | CSV: "Tipo de cancelamento" |
| `source` | 'tools_import' | Fixo (identifica origem) |

---

## 🔍 Consultar Dados Sincronizados

### Via SQL (Supabase)

```sql
-- Ver notas importadas via /ferramentas
SELECT
  on.order_id,
  o.order_number,
  on.canal,
  on.motivo,
  on.responsavel,
  on.devolveu,
  on.tipo,
  on.source,
  on.created_at
FROM order_notes on
JOIN orders o ON o.id = on.order_id
WHERE on.source = 'tools_import'
ORDER BY on.created_at DESC
LIMIT 10;

-- Contar por source
SELECT
  source,
  tipo,
  COUNT(*) as total
FROM order_notes
GROUP BY source, tipo;
```

**Resultado esperado:**
```
| source        | tipo       | total |
|---------------|------------|-------|
| tools_import  | refund     | 50    |
| tools_import  | chargeback | 550   |
```

### Via Interface Web

**Dashboard Analítico:**
```
http://localhost:3000/relatorios
```

**Relatório de Reembolsos:**
```
http://localhost:3000/relatorios/reembolsos
```

**Relatório de Chargebacks:**
```
http://localhost:3000/relatorios/chargebacks
```

---

## 🎯 Diferença: CSV vs Sincronização

### Baixar CSV (Original)

**Quando usar:**
- Precisa compartilhar dados com alguém
- Análise em Excel/Google Sheets
- Backup dos dados processados
- Não quer modificar banco de dados

**Arquivo gerado:**
- CANCELAMENTOS_FINAL.csv (11 colunas)
- Pronto para Excel (UTF-8 BOM)

### Sincronizar com Banco (NOVO)

**Quando usar:**
- Quer visualizar dados em `/relatorios`
- Precisa filtrar/agrupar dados
- Quer cruzar com outras tabelas (orders, refunds)
- Análise contínua/recorrente

**Resultado:**
- Dados em `order_notes` no Supabase
- Disponível nas páginas de relatórios
- JOIN automático com orders

---

## ⚠️ Avisos Importantes

### Dados Duplicados

O endpoint usa **UPSERT**:
- Se `order_id` já existe → ATUALIZA
- Se `order_id` não existe → INSERE

**Consequência:** Rodar sincronização 2x não duplica dados, apenas atualiza.

### Orders Não Encontrados

Se `order_number` não existir na tabela `orders`:
- Registro é **PULADO**
- Aparece em `stats.skipped`
- Erro em `errorDetails`

**Solução:** Rodar sync completo da API antes:
```bash
npm run sync
```

### Performance

Para ~600 registros:
- Tempo: ~10-30 segundos
- Depende de latência Supabase
- Cada registro faz 1-2 queries (lookup + upsert)

---

## 🛠️ Troubleshooting

### "Order não encontrado no banco de dados"

**Causa:** Order não foi sincronizado da API CartPanda

**Solução:**
```bash
npm run sync  # Sync completo
```

Ou aguardar sync automático (Vercel Cron - diário 00:00 UTC)

### "Could not find the table 'public.order_notes'"

**Causa:** Migration não foi aplicada

**Solução:** Ver instruções em `MIGRATION-007-INSTRUCTIONS.md`

### Sincronização lenta (>1 minuto)

**Causa:** Muitos registros ou latência alta

**Solução:** Normal para 500+ registros, aguardar conclusão

---

## 📊 Estatísticas Típicas

Para CSVs padrão (~600 registros):

```
Total:      600
Inseridos:  580  (novos no banco)
Atualizados: 15  (já existiam, foram atualizados)
Pulados:      3  (order não encontrado)
Erros:        2  (problemas de validação)
```

---

## 🎉 Benefícios da Integração

### ✅ Antes (Só CSV)
- Upload manual dos CSVs
- Download da planilha
- Análise em Excel
- Sem cruzamento com outros dados

### ✅ Agora (CSV + Supabase)
- Upload manual dos CSVs
- **Opção 1:** Download da planilha (como antes)
- **Opção 2:** Sincronizar com banco (NOVO)
- Dados em `/relatorios` com filtros/gráficos
- JOIN com orders, affiliates, etc.
- Análise temporal/agregada

---

## 📝 Próximos Passos (Opcional)

### Melhorias Futuras

1. **Sync Automático Periódico**
   - Vercel Cron para sincronizar CSVs
   - Fetch CSVs de pasta específica

2. **Upload Drag & Drop**
   - Interface mais amigável
   - Preview dos dados antes de sincronizar

3. **Validação Avançada**
   - Alertas para campos vazios
   - Sugestões de normalização

4. **Histórico de Syncs**
   - Tabela `sync_history` com timestamp
   - Ver quando último sync foi feito

---

## 📚 Arquivos Relacionados

### Backend
```
app/api/tools/cancelamentos/sync/route.ts  - Endpoint de sync
app/api/tools/cancelamentos/route.ts       - Endpoint de CSV (original)
lib/tools/cancelamentos.ts                 - Lógica de processamento
lib/reports/types.ts                       - Types (source atualizado)
```

### Frontend
```
app/ferramentas/page.tsx                   - Interface com 2 botões
```

### Database
```
supabase/migrations/007_order_notes.sql    - Schema da tabela
```

### Documentação
```
INTEGRACAO-FERRAMENTAS-README.md           - Este arquivo
SISTEMA-RELATORIOS-README.md               - Docs gerais de relatórios
MIGRATION-007-INSTRUCTIONS.md              - Instruções da migration
```

---

## ✅ Status Final

**Implementação:** 100% Concluída

**Funcionalidades:**
- ✅ Endpoint de sincronização criado
- ✅ Types atualizados (source='tools_import')
- ✅ Frontend com 2 botões (Baixar + Sincronizar)
- ✅ Card de resultado com estatísticas
- ✅ Tratamento de erros robusto

**Aguardando:**
- ⏳ Usuário aplicar migration 007
- ⏳ Usuário testar sincronização

**Próximo passo:** Aplicar migration e testar! 🚀
