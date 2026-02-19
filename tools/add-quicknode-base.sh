#!/bin/bash
# Adicionar QUICKNODE_BASE_RPC ao .env

ENV_FILE=".env"
BASE_RPC="https://fabled-prettiest-orb.base-mainnet.quiknode.pro/507a237542c4361a991aac9600dd66497fef4fe9/"

# Verificar se já existe
if grep -q "^QUICKNODE_BASE_RPC=" "$ENV_FILE"; then
    echo "⚠️  QUICKNODE_BASE_RPC já existe. Substituindo..."
    # Substituir linha existente
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^QUICKNODE_BASE_RPC=.*|QUICKNODE_BASE_RPC=$BASE_RPC|" "$ENV_FILE"
    else
        # Linux
        sed -i "s|^QUICKNODE_BASE_RPC=.*|QUICKNODE_BASE_RPC=$BASE_RPC|" "$ENV_FILE"
    fi
    echo "✅ QUICKNODE_BASE_RPC atualizada"
else
    echo "📝 Adicionando QUICKNODE_BASE_RPC..."
    # Adicionar na seção QuickNode ou criar seção
    if grep -q "# 🔗 QUICKNODE" "$ENV_FILE"; then
        # Adicionar após seção QuickNode
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "/# 🔗 QUICKNODE/a\\
QUICKNODE_BASE_RPC=$BASE_RPC
" "$ENV_FILE"
        else
            sed -i "/# 🔗 QUICKNODE/a QUICKNODE_BASE_RPC=$BASE_RPC" "$ENV_FILE"
        fi
    else
        # Adicionar no final
        echo "" >> "$ENV_FILE"
        echo "# ============================================" >> "$ENV_FILE"
        echo "# 🔗 QUICKNODE - Base (Proof Layer)" >> "$ENV_FILE"
        echo "# ============================================" >> "$ENV_FILE"
        echo "QUICKNODE_BASE_RPC=$BASE_RPC" >> "$ENV_FILE"
    fi
    echo "✅ QUICKNODE_BASE_RPC adicionada"
fi
