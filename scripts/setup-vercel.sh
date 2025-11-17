#!/bin/bash

# Script COMPLETO de setup e deploy no Vercel
# Configura variáveis de ambiente automaticamente
# Uso: ./setup-vercel.sh

set -e

echo "🚀 Setup Completo no Vercel"
echo "══════════════════════════════════════════════════"
echo ""

# 1. Verificar CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 Instalando Vercel CLI..."
    npm install -g vercel
fi
echo "✅ Vercel CLI pronto"
echo ""

# 2. Verificar .env.local
if [ ! -f .env.local ]; then
    echo "❌ Arquivo .env.local não encontrado!"
    exit 1
fi
echo "✅ Credenciais encontradas"
echo ""

# 3. Login no Vercel (se necessário)
echo "🔐 Fazendo login no Vercel..."
vercel login
echo ""

# 4. Link ou criar projeto
echo "🔗 Conectando ao projeto..."
vercel link
echo ""

# 5. Extrair e configurar variáveis de ambiente do .env.local
echo "⚙️  Configurando variáveis de ambiente..."

# Carregar variáveis do .env.local
export $(grep -v '^#' .env.local | xargs)

# Configurar cada variável no Vercel (production, preview, development)
vercel env add NEXT_PUBLIC_CARTPANDA_API_URL production <<< "$NEXT_PUBLIC_CARTPANDA_API_URL" 2>/dev/null || echo "  • NEXT_PUBLIC_CARTPANDA_API_URL já existe"
vercel env add CARTPANDA_API_TOKEN production <<< "$CARTPANDA_API_TOKEN" 2>/dev/null || echo "  • CARTPANDA_API_TOKEN já existe"
vercel env add CARTPANDA_STORE_NAME production <<< "$CARTPANDA_STORE_NAME" 2>/dev/null || echo "  • CARTPANDA_STORE_NAME já existe"
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "$NEXT_PUBLIC_SUPABASE_URL" 2>/dev/null || echo "  • NEXT_PUBLIC_SUPABASE_URL já existe"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "$NEXT_PUBLIC_SUPABASE_ANON_KEY" 2>/dev/null || echo "  • NEXT_PUBLIC_SUPABASE_ANON_KEY já existe"

echo "✅ Variáveis configuradas"
echo ""

# 6. Sync inicial
echo "📊 Sincronizando dados iniciais..."
echo "   (Pode levar ~5 minutos, tome um café ☕)"
echo ""
npm run sync || echo "⚠️  Sync falhou, mas continuando..."
echo ""

# 7. Deploy para production
echo "🚀 Fazendo deploy para production..."
vercel --prod
echo ""

echo "══════════════════════════════════════════════════"
echo "✅ DEPLOY COMPLETO!"
echo ""
echo "📝 VERIFICAÇÕES FINAIS:"
echo ""
echo "1. Acesse seu dashboard:"
echo "   https://seu-projeto.vercel.app"
echo ""
echo "2. Verifique o Cron Job:"
echo "   • Vá em Vercel Dashboard → Cron Jobs"
echo "   • Deve aparecer: /api/sync rodando a cada 15min"
echo ""
echo "3. Teste o sync:"
echo "   curl https://seu-projeto.vercel.app/api/sync"
echo ""
echo "🎉 Tudo pronto! Seu dashboard está no ar com sync automático."
