#!/bin/bash

# Script de deploy automatizado para Vercel
# Uso: ./deploy.sh

set -e  # Para na primeira falha

echo "🚀 Iniciando deploy automatizado no Vercel..."
echo ""

# 1. Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "📦 Instalando Vercel CLI..."
    npm install -g vercel
else
    echo "✅ Vercel CLI já instalado"
fi
echo ""

# 2. Verificar se .env.local existe
if [ ! -f .env.local ]; then
    echo "❌ Arquivo .env.local não encontrado!"
    echo "   Crie o arquivo com as credenciais antes de fazer deploy."
    exit 1
fi
echo "✅ Arquivo .env.local encontrado"
echo ""

# 3. Fazer sync inicial dos dados
echo "📊 Sincronizando dados iniciais com Supabase..."
echo "   (Isso pode levar ~5 minutos...)"
npm run sync

if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Sync falhou, mas vou continuar o deploy."
    echo "   Você pode rodar 'npm run sync' depois."
else
    echo "✅ Dados sincronizados com sucesso!"
fi
echo ""

# 4. Deploy no Vercel (primeiro deploy ou atualização)
echo "🌐 Fazendo deploy no Vercel..."
echo ""

# Deploy em production
vercel --prod

echo ""
echo "✅ Deploy concluído!"
echo ""

# 5. Instruções para configurar variáveis de ambiente
echo "📝 PRÓXIMOS PASSOS:"
echo ""
echo "1. Configure as variáveis de ambiente no Vercel:"
echo "   https://vercel.com/dashboard → Seu projeto → Settings → Environment Variables"
echo ""
echo "   Adicione estas 5 variáveis (copie do .env.local):"
echo "   - NEXT_PUBLIC_CARTPANDA_API_URL"
echo "   - CARTPANDA_API_TOKEN"
echo "   - CARTPANDA_STORE_NAME"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo ""
echo "2. Após configurar, faça redeploy:"
echo "   vercel --prod"
echo ""
echo "3. Verifique os Cron Jobs:"
echo "   https://vercel.com/dashboard → Seu projeto → Cron Jobs"
echo ""
echo "🎉 Deploy completo! Acesse seu dashboard em produção."
