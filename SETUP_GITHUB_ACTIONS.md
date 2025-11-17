# Setup GitHub Actions - Sync Automático 100%

Este guia configura sincronização automática **100% funcional** via GitHub Actions (GRATUITO).

## 🎯 O Que Você Terá Depois da Configuração

- ✅ Sync automático **4x por dia** (sem fazer NADA!)
- ✅ Validação diária automática
- ✅ Dashboard sempre atualizado (máximo 6h de delay)
- ✅ Zero custo adicional
- ✅ Zero manutenção

## 🚀 Setup Rápido (5 minutos)

### Opção 1: Script Automático (RECOMENDADO)

```bash
# Execute o script de setup
./scripts/setup-github-secrets.sh
```

O script vai:
1. Mostrar os 5 secrets necessários
2. Oferecer configuração automática via GitHub CLI (se disponível)
3. Fornecer instruções passo-a-passo se preferir configurar manualmente

### Opção 2: Configuração Manual via GitHub Web

1. **Acesse a página de Secrets do repositório:**
   ```
   https://github.com/SEU_USUARIO/dashboard/settings/secrets/actions
   ```

2. **Clique em "New repository secret"**

3. **Adicione os 5 secrets abaixo** (um por vez):

   | Nome | Valor | Onde Encontrar |
   |------|-------|----------------|
   | `NEXT_PUBLIC_CARTPANDA_API_URL` | `https://accounts.cartpanda.com/api/v3` | URL padrão da API |
   | `CARTPANDA_API_TOKEN` | `4QypzWuXZ8LRFlDI1InfE5c0oHvGz9ws6T4AMnqEVEx7VUBkiCF8sDP2j28e` | Painel CartPanda → API |
   | `CARTPANDA_STORE_NAME` | `beliuimcaps` | Nome da sua loja |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://swogockrnapyymcuorgs.supabase.co` | Painel Supabase → Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Painel Supabase → Settings → API |

   **Para cada secret:**
   - Clique em "New repository secret"
   - Cole o **Nome** exatamente como está na tabela
   - Cole o **Valor** correspondente
   - Clique em "Add secret"
   - Repita para os 5 secrets

### Opção 3: Via GitHub CLI (Para Usuários Avançados)

Se você tem [GitHub CLI](https://cli.github.com/) instalado:

```bash
gh secret set NEXT_PUBLIC_CARTPANDA_API_URL -b'https://accounts.cartpanda.com/api/v3'

gh secret set CARTPANDA_API_TOKEN -b'4QypzWuXZ8LRFlDI1InfE5c0oHvGz9ws6T4AMnqEVEx7VUBkiCF8sDP2j28e'

gh secret set CARTPANDA_STORE_NAME -b'beliuimcaps'

gh secret set NEXT_PUBLIC_SUPABASE_URL -b'https://swogockrnapyymcuorgs.supabase.co'

gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY -b'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3b2dvY2tybmFweXltY3VvcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDc1NjAsImV4cCI6MjA2MjYyMzU2MH0._Fo8MF9WTLiCPu112YZLJzszH1rGE3mimX_AaLFHeHQ'
```

## ✅ Verificar se Funcionou

### Teste Manual (Primeira Vez)

1. Acesse: https://github.com/SEU_USUARIO/dashboard/actions

2. Selecione "Hourly Incremental Sync" na lista da esquerda

3. Clique no botão **"Run workflow"** (canto direito superior)

4. Selecione a branch `main` (ou sua branch principal)

5. Clique em **"Run workflow"** novamente (botão verde)

6. Aguarde **~2-5 minutos**

7. Você deve ver:
   - ✅ Check verde se funcionou
   - ❌ X vermelho se algo deu errado

### Se Deu Erro (❌)

1. Clique no workflow que falhou

2. Clique em "incremental-sync" (job name)

3. Expanda "Run incremental sync"

4. Leia o erro e verifique:
   - Secrets foram configurados corretamente?
   - Credenciais CartPanda estão válidas?
   - URL Supabase está correto?

### Se Funcionou (✅)

**Parabéns!** O sync automático está configurado! 🎉

A partir de agora, o sistema vai rodar **automaticamente** nos seguintes horários:

| Horário (UTC) | Horário (Brasília) | Ação | Workflow |
|---------------|-------------------|------|----------|
| 00:00 | 21:00 (9 PM) | Sync Incremental | hourly-sync.yml |
| 06:00 | 03:00 (3 AM) | Sync Incremental | hourly-sync.yml |
| 09:00 | 06:00 (6 AM) | **Validação Diária** | daily-validation.yml |
| 12:00 | 09:00 (9 AM) | Sync Incremental | hourly-sync.yml |
| 18:00 | 15:00 (3 PM) | Sync Incremental | hourly-sync.yml |

## 📊 Monitorar Execuções

Acesse https://github.com/SEU_USUARIO/dashboard/actions para ver:
- ✅ Execuções bem-sucedidas (check verde)
- ❌ Execuções falhadas (X vermelho)
- 🔵 Execuções em andamento (círculo azul)
- ⏱️ Tempo de execução (~2-5 minutos)
- 📄 Logs detalhados de cada execução

## 🔧 Troubleshooting

### Erro: "Resource not accessible by integration"

**Problema:** GitHub Actions não tem permissão para acessar secrets.

**Solução:**
1. Vá em: `Settings` → `Actions` → `General`
2. Em "Workflow permissions", selecione:
   - ✅ "Read and write permissions"
3. Clique em "Save"
4. Execute o workflow novamente

### Erro: "secret not found"

**Problema:** Um ou mais secrets não foram configurados.

**Solução:**
1. Acesse: `Settings` → `Secrets and variables` → `Actions`
2. Verifique se TODOS os 5 secrets estão listados:
   - NEXT_PUBLIC_CARTPANDA_API_URL
   - CARTPANDA_API_TOKEN
   - CARTPANDA_STORE_NAME
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
3. Se algum estiver faltando, adicione-o

### Erro: "CartPanda API authentication failed"

**Problema:** Token CartPanda inválido ou expirado.

**Solução:**
1. Acesse o painel CartPanda
2. Gere um novo token de API
3. Atualize o secret `CARTPANDA_API_TOKEN`:
   - Vá em `Settings` → `Secrets` → `CARTPANDA_API_TOKEN`
   - Clique em "Update"
   - Cole o novo token
   - Clique em "Update secret"

### Erro: "Supabase connection failed"

**Problema:** URL ou chave Supabase incorretos.

**Solução:**
1. Acesse o painel Supabase
2. Vá em `Settings` → `API`
3. Copie:
   - Project URL → atualizar `NEXT_PUBLIC_SUPABASE_URL`
   - Project API keys → anon/public → atualizar `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Atualize os secrets no GitHub

### Workflow não está rodando automaticamente

**Problema:** Schedule do cron não está ativo.

**Solução:**
1. Verifique se o repositório não está arquivado
2. Verifique se há pelo menos 1 commit nos últimos 60 dias
   - GitHub desativa workflows em repos inativos
3. Faça um commit dummy para reativar:
   ```bash
   git commit --allow-empty -m "chore: trigger workflows"
   git push
   ```

## 🎉 Pronto!

Agora você tem:
- ✅ Sync automático 4x por dia
- ✅ Validação diária automática
- ✅ Full sync automático se houver problemas
- ✅ Dashboard sempre atualizado
- ✅ **Zero intervenção manual necessária!**

## 📚 Mais Informações

- **Workflows:** `.github/workflows/`
  - `hourly-sync.yml` - Sync incremental a cada 6h
  - `daily-validation.yml` - Validação diária + full sync se necessário

- **Scripts:**
  - `scripts/incremental-sync.ts` - Sync das últimas 24h
  - `scripts/setup-github-secrets.sh` - Setup automático de secrets

- **Documentação:**
  - `README.md` - Documentação geral do projeto
  - `SESSION_2025-11-16.md` - Histórico da implementação

## ❓ Dúvidas?

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [Cron Schedule Syntax](https://crontab.guru/)

---

**Última Atualização:** 2025-11-17
**Status:** ✅ 100% Funcional e Testado
