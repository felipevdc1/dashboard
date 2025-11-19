# ⚠️ MIGRATION 007 - INSTRUÇÕES MANUAIS

## Por que manual?
A chave `NEXT_PUBLIC_SUPABASE_ANON_KEY` não tem permissões para executar DDL (CREATE TABLE, etc.) por segurança. Migrations precisam ser executadas via Supabase Dashboard.

## Passos para aplicar:

### 1. Acesse o SQL Editor do Supabase
🔗 **Link direto:** https://supabase.com/dashboard/project/swogockrnapyymcuorgs/editor/sql/new

### 2. Copie o SQL abaixo

```sql
-- Migration 007: Order Notes Table
--
-- Tabela para armazenar as "Notas do pedido" dos CSVs da CartPanda
-- IMPORTANTE: Estas são notas INTERNAS (Canal, Motivo, Responsável, etc)
-- Diferentes das notas da API (refunds.note que são notas do agente de suporte)

-- Create order_notes table
CREATE TABLE IF NOT EXISTS public.order_notes (
  order_id BIGINT PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,

  -- Campos estruturados das notas (formato do CSV)
  canal VARCHAR(100),              -- Ex: "Manifestsuccess", "Badboys", "Interna"
  motivo VARCHAR(255),             -- Ex: "Desistência", "Desconfiança", "Compra duplicada"
  responsavel VARCHAR(100),        -- Ex: "Sem contato", "Cartpanda", "Cartpanda call"
  devolveu BOOLEAN,                -- Ex: true (Sim), false (Não)
  observacoes TEXT,                -- Texto livre com observações adicionais

  -- Tipo de nota (refund ou chargeback)
  tipo VARCHAR(20) CHECK (tipo IN ('refund', 'chargeback')),

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indicador de origem dos dados
  source VARCHAR(50) DEFAULT 'csv_import'  -- 'csv_import' ou 'manual'
);

-- Create index on order_id for faster joins
CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON public.order_notes(order_id);

-- Create index on canal for filtering
CREATE INDEX IF NOT EXISTS idx_order_notes_canal ON public.order_notes(canal);

-- Create index on motivo for filtering
CREATE INDEX IF NOT EXISTS idx_order_notes_motivo ON public.order_notes(motivo);

-- Create index on tipo for filtering (refund vs chargeback)
CREATE INDEX IF NOT EXISTS idx_order_notes_tipo ON public.order_notes(tipo);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_order_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_order_notes_timestamp
  BEFORE UPDATE ON public.order_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_notes_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.order_notes IS 'Notas internas dos pedidos extraídas dos CSVs da CartPanda (Canal, Motivo, Responsável, etc). Diferentes das notas do agente em refunds.note da API.';
COMMENT ON COLUMN public.order_notes.canal IS 'Canal de afiliado (ex: Manifestsuccess, Badboys, Interna)';
COMMENT ON COLUMN public.order_notes.motivo IS 'Motivo do refund/chargeback (ex: Desistência, Desconfiança)';
COMMENT ON COLUMN public.order_notes.responsavel IS 'Responsável pelo contato (ex: Sem contato, Cartpanda)';
COMMENT ON COLUMN public.order_notes.devolveu IS 'Indica se houve devolução do produto (Sim/Não)';
COMMENT ON COLUMN public.order_notes.tipo IS 'Tipo de nota: refund ou chargeback';
COMMENT ON COLUMN public.order_notes.source IS 'Origem dos dados: csv_import (importação do CSV) ou manual (inserido via interface)';
```

### 3. Cole no SQL Editor e clique em "Run"

### 4. Após executar com sucesso, rode o import:

```bash
npx tsx scripts/import-cartpanda-notes.ts
```

## Resultado esperado:
- ✅ Tabela `order_notes` criada
- ✅ 4 índices criados
- ✅ Trigger de updated_at criado
- ✅ Pronto para receber os dados dos CSVs (50 refunds + 550 chargebacks)

---

**Fonte:** `supabase/migrations/007_order_notes.sql`
