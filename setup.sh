#!/bin/bash

# Script de Setup e Inicializacao - SAEV Backend
# Execute este script para configurar e iniciar o backend automaticamente

set -e

echo "=========================================="
echo "   SAEV Backend - Setup e Inicializacao"
echo "=========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Verificar Node.js
print_info "Verificando Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js não encontrado. Instale Node.js 22.x LTS"
    exit 1
fi

NODE_VERSION=$(node -v)
NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')

if [ "$NODE_MAJOR" -lt 22 ]; then
    print_error "Node.js $NODE_VERSION encontrado, mas é necessário Node.js 22 ou superior"
    echo "  Instale Node.js 22.x LTS: https://nodejs.org/"
    exit 1
fi

print_success "Node.js $NODE_VERSION encontrado"
echo ""

# Verificar Yarn
print_info "Verificando Yarn..."
if ! command -v yarn &> /dev/null; then
    print_info "Yarn não encontrado. Instalando..."
    npm install -g yarn
fi
print_success "Yarn $(yarn -v) encontrado"
echo ""

# Verificar Docker
print_info "Verificando Docker..."
if ! command -v docker &> /dev/null; then
    print_error "Docker não encontrado"
    echo "  Instale Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker ps &> /dev/null; then
    print_error "Docker não está rodando"
    echo "  Inicie o Docker Desktop e execute este script novamente"
    exit 1
fi

print_success "Docker rodando"
echo ""

echo "=========================================="
echo "   Instalando Dependências"
echo "=========================================="
echo ""

yarn install
print_success "Dependências instaladas"
echo ""

echo "=========================================="
echo "   Configurando Ambiente"
echo "=========================================="
echo ""

if [ -f .env ]; then
    print_success "Arquivo .env já existe"
else
    if [ -f .env.example ]; then
        print_info "Criando arquivo .env..."
        cp .env.example .env
        print_success "Arquivo .env criado"
    else
        print_error "Arquivo .env.example não encontrado"
        exit 1
    fi
fi
echo ""

echo "=========================================="
echo "   Iniciando MySQL"
echo "=========================================="
echo ""

docker-compose up -d
print_success "Container MySQL iniciado"
echo ""

print_info "Aguardando MySQL ficar pronto..."
RETRY_COUNT=0
MAX_RETRIES=60

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec db mysqladmin ping -h localhost -u root -papp --silent &> /dev/null; then
        print_success "MySQL está pronto!"
        break
    fi
    echo -n "."
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "Timeout aguardando MySQL"
    exit 1
fi
echo ""
echo ""

echo "=========================================="
echo "   Executando Scripts SQL"
echo "=========================================="
echo ""

for sql_file in sql/*.sql; do
    if [ -f "$sql_file" ]; then
        print_info "Executando: $(basename $sql_file)"
        docker exec -i db mysql -uroot -papp abc_saev < "$sql_file" 2>/dev/null || true
    fi
done
print_success "Scripts SQL executados"
echo ""

echo "=========================================="
echo "   Iniciando Backend"
echo "=========================================="
echo ""
print_info "O servidor será iniciado em modo desenvolvimento..."
print_info "Acesse a documentação Swagger em: http://localhost:3003/api"
echo ""

# Iniciar o servidor
yarn start:dev
