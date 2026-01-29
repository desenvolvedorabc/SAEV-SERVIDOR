# SAEV Backend (Servidor)

Backend do Sistema de Avaliação Educar pra Valer, desenvolvido com NestJS, TypeORM e MySQL.

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js22 ou superior** (OBRIGATÓRIO)
- Yarn
- Docker Desktop (rodando)

### Instalação e Execução Automática

**Windows:**
```bash
./setup.bat
```

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

O script irá:
1. Verificar pré-requisitos
2. Instalar dependências
3. Criar arquivo `.env`
4. Subir MySQL via Docker
5. Executar scripts SQL (usuário admin, áreas, etc)
6. **Iniciar o servidor automaticamente** em modo desenvolvimento

## 📋 Instalação Manual

Se preferir fazer manualmente:

### 1. Instalar Dependências
```bash
yarn install
```

### 2. Configurar Ambiente
```bash
cp .env.example .env
```

Edite o `.env` se necessário (valores padrão já funcionam).

### 3. Subir MySQL
```bash
docker-compose up -d
```

### 4. Aguardar MySQL Ficar Pronto
```bash
# Aguardar ~30 segundos ou verificar:
docker-compose ps  # Status deve ser "healthy"
```

### 5. Executar Scripts SQL
```bash
docker exec -i db mysql -uroot -papp abc_saev < sql/1-insertBasePerfil.sql
docker exec -i db mysql -uroot -papp abc_saev < sql/2-insertSubPerfil.sql
docker exec -i db mysql -uroot -papp abc_saev < sql/3-insertArea.sql
docker exec -i db mysql -uroot -papp abc_saev < sql/4-insertSkin.sql
docker exec -i db mysql -uroot -papp abc_saev < sql/5-insertGender.sql
docker exec -i db mysql -uroot -papp abc_saev < sql/6-insertFormation.sql
docker exec -i db mysql -uroot -papp abc_saev < sql/7-insertSeries.sql
docker exec -i db mysql -uroot -papp abc_saev < sql/8-insertSubjects.sql
docker exec -i db mysql -uroot -papp abc_saev < sql/9-insertPCD.sql
docker exec -i db mysql -uroot -papp abc_saev < sql/10-insertSubPerfilArea.sql
docker exec -i db mysql -uroot -papp abc_saev < sql/11-insertAdminUser.sql
```

### 6. Iniciar Servidor
```bash
yarn start:dev
```

## 🌐 Acessar

- **API**: http://localhost:3003
- **Swagger**: http://localhost:3003/api
- **Endpoints**: Prefixo `/v1` (ex: http://localhost:3003/v1/auth/login)

## 🔧 Comandos Úteis

### Desenvolvimento
```bash
yarn start:dev      # Modo desenvolvimento (hot reload)
yarn start:debug    # Modo debug
yarn build          # Build para produção
yarn start:prod     # Rodar em produção
```

### Testes
```bash
yarn test           # Testes unitários
yarn test:watch     # Testes em modo watch
yarn test:cov       # Testes com cobertura
yarn test:e2e       # Testes end-to-end
```

### Database
```bash
yarn migration:generate   # Gerar migration
yarn migration:run        # Executar migrations
yarn migration:revert     # Reverter última migration
```

### Docker
```bash
docker-compose up -d      # Subir MySQL
docker-compose down       # Parar MySQL
docker-compose down -v    # Parar e remover volumes (APAGA DADOS!)
docker-compose logs -f    # Ver logs
docker exec -it db mysql -uroot -papp abc_saev  # Acessar MySQL
```

## 📁 Estrutura

```
SAEV-SERVIDOR/
├── src/
│   ├── config/              # Configurações
│   ├── database/
│   │   ├── migrations/      # Migrations TypeORM
│   │   └── seeds/           # Seeds
│   ├── modules/             # Módulos NestJS
│   │   ├── auth/            # Autenticação
│   │   ├── users/           # Usuários
│   │   └── ...
│   └── main.ts              # Entry point
├── sql/                     # Scripts SQL iniciais
├── test/                    # Testes E2E
├── docker-compose.yml       # MySQL container
├── .env.example             # Exemplo de variáveis
├── setup.bat / setup.sh     # Scripts de instalação
└── package.json
```

## ⚙️ Configuração (.env)

Principais variáveis:

```env
# Servidor
PORT=3003

# JWT
JWT_SECRET=saev_secret_key_local_dev
JWT_SECONDS_EXPIRE=28800

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=app
DB_NAME=abc_saev
DB_SYNC=true                    # Apenas desenvolvimento!
DB_MIGRATIONS_RUN=false

# URLs
FRONT_APP_URL=http://localhost:3000
HOST_APP_URL=http://localhost:3003
```

## 🐛 Troubleshooting

### Erro: "Node engine incompatible"
Você precisa de Node.js 22 ou superior. Atualize em https://nodejs.org/

### Erro: "Port 3003 already in use"
```bash
# Windows
netstat -ano | findstr :3003
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3003
kill -9 <PID>
```

### Erro: "Cannot connect to MySQL"
```bash
# Verificar se container está rodando
docker-compose ps

# Ver logs
docker-compose logs db

# Reiniciar
docker-compose restart db
```

### Erro: "Table already exists"
```bash
# Dropar e recriar banco
docker exec -it db mysql -uroot -papp -e "DROP DATABASE abc_saev; CREATE DATABASE abc_saev;"

# Re-executar scripts SQL
for sql_file in sql/*.sql; do docker exec -i db mysql -uroot -papp abc_saev < "$sql_file"; done
```

## 🔐 Usuário Padrão

Após executar os scripts SQL:

- **Email**: admin@saev.com
- **Senha**: admin123
- **Perfil**: SAEV Admin

## 🛠 Tecnologias

- [Node.js 22+](https://nodejs.org/en/) - Runtime JavaScript
- [TypeScript](https://www.typescriptlang.org/) - Superset JavaScript
- [NestJS](https://nestjs.com/) - Framework Node.js
- [TypeORM](https://typeorm.io/) - ORM para TypeScript
- [MySQL 8.0](https://www.mysql.com/) - Banco de dados
- [JWT](https://jwt.io/) - Autenticação
- [Swagger](https://swagger.io/) - Documentação API
- [Docker](https://www.docker.com/) - Containerização

## 📖 Documentação Adicional

- [README Principal](../README.md)
- [Guia Rápido](../QUICKSTART.md)
- [Documentação Completa](../SETUP.md)

---

**Versão Node.js necessária:** >= 22.x
**Porta padrão:** 3003
**Database:** MySQL 8.0
- [Nestjs](https://nestjs.com/)
- [Swagger](https://swagger.io/)

<h1>📱 Como usar? </h1> 

### Pré-requisitos

Primeiramente, você precisa ter instalado em sua máquina as seguintes ferramentas:
[Git](https://git-scm.com), e o instalador de pacotes [yarn](https://yarnpkg.com/) e o [Docker](https://www.docker.com/). 
E lógico é bom ter um editor para trabalhar com o código como [VSCode](https://code.visualstudio.com/).

### 🎲 Rodando a aplicação

```bash
# Clone este repositório
$ git clone <https://example.com>

# Após instalar o docker execute no terminal/cmd
$ docker run --name "nome-que-quiser" -e MYSQL_ROOT_PASSWORD=docker -p 3306:3306 mysql:latest

# Use qualquer gerenciar de banco de dados e crie uma database no mysql:
$ nome da database: saev
$ port: 3306

# Acesse a pasta do projeto 
$ cd saev

# Instale as dependências 
$ yarn

# Utilize a env.example e configure o projeto
$ env.example

# Execute a aplicação
$ yarn start:dev

## Prontinho você terá acesso a aplicação!!! 
```


### 👀  Acessando o Swagger

Para ter acesso as rotas da aplicação, utilize o swagger. Com a aplicação rodando, utilize a porta configurada nas variavéis de ambiente.

```bash
# Example
$ PORT=3333

# Acesse a URL
$ http://localhost:3003/v1/swagger

## Prontinho você terá acesso a rotas da aplicação.
```

### 📚 Dicionário de Dados

Para ter acesso ao Dicionário de Dados basta acessar o **data-dictionary.html** contido na raiz do projeto.

### 🧶 Modelo Entidade Relacionamento (MER)

![SAEV-MER](https://github.com/desenvolvedorabc/SAEV-SERVIDOR/blob/main/saev-mer.png)

### ⛓ Diagrama Entidade Relacionamento (DER)

![SAEV-DER](https://github.com/desenvolvedorabc/SAEV-SERVIDOR/blob/main/saev-der.png)


### 🗄️ Réplica do Banco de Dados 

A fim de aliviar a carga do banco de dados principal e proporcionar um ambiente propício para análises avançadas de dados, estabelecemos um banco de dados réplica neste projeto. Esta réplica não só melhora a performance geral do sistema, mas também fortalece a resiliência e a eficiência da nossa infraestrutura de dados.

🔗 Para um entendimento detalhado sobre a configuração, benefícios e características desta réplica, acesse: [Réplica do Banco de Dados - Documentação Detalhada](https://github.com/desenvolvedorabc/SAEV-SERVIDOR/blob/main/docs/README.md).