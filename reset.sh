#!/bin/bash

# Script de Reset - SAEV Backend

echo "=========================================="
echo "   SAEV Backend - Reset"
echo "=========================================="
echo ""
echo "⚠ Este script irá:"
echo "  - Parar e remover container MySQL"
echo "  - Remover node_modules"
echo "  - Remover arquivo .env"
echo "  - Remover yarn.lock"
echo ""
read -p "Deseja continuar? (s/N): " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
    echo "Cancelado."
    exit 0
fi

echo ""
echo "→ Parando container MySQL..."
docker-compose down -v 2>/dev/null || true
echo "✓ Container parado"

echo ""
echo "→ Removendo dependências..."
rm -rf node_modules yarn.lock .env 2>/dev/null || true
echo "✓ Limpeza concluída"

echo ""
echo "✓ Reset concluído!"
echo ""
echo "Para reinstalar: ./setup.sh"
echo ""
