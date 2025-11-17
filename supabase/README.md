# Supabase Integration Setup

Este diretório contém os arquivos necessários para integrar o dashboard com Supabase.

## Pré-requisitos

1. Crie uma conta no [Supabase](https://supabase.com)
2. Crie um novo projeto

## Passos para Configuração

### 1. Configurar o Banco de Dados

1. Acesse o **SQL Editor** no dashboard do Supabase
2. Copie e cole o conteúdo de `schema.sql`
3. Execute o SQL para criar a tabela `orders` e seus índices

### 2. Obter Credenciais

No dashboard do Supabase, vá em **Project Settings** > **API**:

- `Project URL` → Copie para `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → Copie para `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configurar Variáveis de Ambiente

Adicione ao seu `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### 4. Sincronização Inicial

Após criar a tabela e configurar as credenciais, você precisa:

1. **Executar a sincronização inicial** para popular o banco com pedidos históricos
2. **Configurar o job periódico** para manter os dados atualizados

## Próximos Passos (Implementação)

Os próximos arquivos a serem criados:

- [ ] `/app/api/sync/route.ts` - API endpoint para sincronização
- [ ] `/scripts/initial-sync.ts` - Script para carga inicial de dados
- [ ] Modificar `/app/api/metrics/route.ts` para consultar Supabase em vez da API

## Estrutura da Tabela

A tabela `orders` armazena todos os pedidos da CartPanda com:

- **Colunas principais**: id, order_number, total_price, created_at
- **JSON columns**: customer, line_items, payment (dados flexíveis)
- **Índices**: created_at, financial_status, affiliate_email
- **Row Level Security**: Configurado para authenticated users

## Benefícios

✅ **Performance**: Consultas em <100ms vs 60+ segundos
✅ **Histórico completo**: Sem limite de páginas
✅ **Sem custos**: Plano gratuito do Supabase
✅ **Escalável**: Suporta milhões de registros
