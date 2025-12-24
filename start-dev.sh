#!/bin/bash

# 🚀 FLOWPay - Script de Desenvolvimento
# Inicia o servidor local com MIME types corretos

echo "🚀 FLOWPay - Iniciando servidor de desenvolvimento..."

# Verificar se Python 3 está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 não encontrado. Instale Python 3 e tente novamente."
    exit 1
fi

# Mudar para o diretório public
cd "$(dirname "$0")/public" || {
    echo "❌ Erro ao acessar diretório public"
    exit 1
}

# Verificar se o arquivo server.py existe
if [ ! -f "server.py" ]; then
    echo "❌ Arquivo server.py não encontrado em public/"
    exit 1
fi

# Definir porta (padrão: 8000)
PORT=${1:-8000}

echo "📁 Diretório: $(pwd)"
echo "🔧 MIME types configurados corretamente"
echo "🌐 URL: http://localhost:$PORT"
echo "📱 Checkout: http://localhost:$PORT/checkout.html"
echo "🏠 Início: http://localhost:$PORT/index.html"
echo "⏹️  Pressione Ctrl+C para parar"
echo "-" * 50

# Iniciar servidor
python3 server.py "$PORT"
