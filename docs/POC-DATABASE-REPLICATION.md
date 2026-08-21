# POC: Separação de Banco de Dados - Leitura e Escrita

**Data:** Fevereiro 2026
**Projeto:** SAEV - Sistema de Avaliação Educacional
**Versão:** 1.0

---

## Sumário

1. [Objetivo](#1-objetivo)
2. [Arquitetura Proposta](#2-arquitetura-proposta)
3. [Implementação da POC](#3-implementação-da-poc)
4. [Guia de Execução e Validação](#4-guia-de-execução-e-validação)
5. [Separação de Camadas e Responsabilidades](#5-separação-de-camadas-e-responsabilidades)
6. [Fluxo de Dados](#6-fluxo-de-dados)
7. [Aprendizados e Análise](#7-aprendizados-e-análise)
8. [Plano de Produção - Cloud SQL GCP](#8-plano-de-produção---cloud-sql-gcp)
9. [Recomendação Final](#9-recomendação-final)

---

## 1. Objetivo

### 1.1 Contexto

O sistema SAEV atualmente utiliza uma única instância de banco de dados MySQL para todas as operações de leitura e escrita. Com o crescimento do sistema e aumento de usuários simultâneos, identificou-se a necessidade de otimizar a performance separando as operações:

- **Operações de Escrita (INSERT, UPDATE, DELETE):** Banco Master
- **Operações de Leitura (SELECT):** Banco Replica

### 1.2 Objetivos da POC

| Objetivo | Descrição |
|----------|-----------|
| Validar viabilidade técnica | Confirmar que o TypeORM suporta replicação transparente |
| Medir impacto no código | Avaliar quantidade de alterações necessárias no código existente |
| Testar compatibilidade | Garantir funcionamento com bibliotecas existentes (transações, cls-hooked) |
| Preparar para Cloud SQL | Validar arquitetura antes da implementação em produção no GCP |

---

## 2. Arquitetura Proposta

### 2.1 Arquitetura Atual (Single Database)

```
┌─────────────────────────────────────────────────────────────┐
│                      Aplicação NestJS                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Controller │  │  Controller │  │  Controller │   ...   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │   Service   │  │   Service   │  │   Service   │   ...   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                   ┌──────▼──────┐                           │
│                   │   TypeORM   │                           │
│                   │ Connection  │                           │
│                   └──────┬──────┘                           │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   MySQL     │
                    │  (Single)   │
                    │  Port 3306  │
                    └─────────────┘
```

### 2.2 Arquitetura Proposta (Read/Write Splitting)

```
┌─────────────────────────────────────────────────────────────┐
│                      Aplicação NestJS                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Controller │  │  Controller │  │  Controller │   ...   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │   Service   │  │   Service   │  │   Service   │   ...   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                   ┌──────▼──────┐                           │
│                   │   TypeORM   │                           │
│                   │ Replication │                           │
│                   │   Router    │                           │
│                   └──────┬──────┘                           │
└──────────────────────────┼──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────▼──────┐          ┌──────▼──────┐
       │   Master    │          │   Replica   │
       │   (Write)   │◄────────►│   (Read)    │
       │  Port 3306  │  Sync    │  Port 3307  │
       └─────────────┘          └─────────────┘
```

### 2.3 Arquitetura de Produção (Cloud SQL GCP)

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Cloud Run / GKE                    │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │              Aplicação NestJS SAEV              │ │  │
│  │  │                                                 │ │  │
│  │  │  ┌─────────────────────────────────────────┐   │ │  │
│  │  │  │      TypeORM Replication Config         │   │ │  │
│  │  │  └─────────────────┬───────────────────────┘   │ │  │
│  │  └────────────────────┼───────────────────────────┘ │  │
│  └───────────────────────┼─────────────────────────────┘  │
│                          │                                 │
│  ┌───────────────────────┼─────────────────────────────┐  │
│  │                 Cloud SQL                            │  │
│  │                       │                              │  │
│  │       ┌───────────────┴───────────────┐              │  │
│  │       │                               │              │  │
│  │  ┌────▼────┐                    ┌─────▼─────┐        │  │
│  │  │ Primary │    Replicação      │  Read     │        │  │
│  │  │Instance │◄──────────────────►│ Replica   │        │  │
│  │  │ (Write) │    Automática      │  (Read)   │        │  │
│  │  └─────────┘                    └───────────┘        │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Implementação da POC

### 3.1 Arquivos Criados/Modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `docker-compose.replication.yml` | Novo | Infraestrutura Docker com 2 instâncias MySQL |
| `src/config/configuration.ts` | Modificado | Configuração condicional para replicação |
| `src/config/database-config.factory.ts` | Modificado | Logging de modo de operação |
| `.env.example` | Modificado | Novas variáveis de ambiente |

### 3.2 Configuração TypeORM para Replicação

O TypeORM 0.2.x suporta nativamente a configuração de replicação através do objeto `replication`:

```typescript
// src/config/configuration.ts
const getReplicationConfig = () => ({
  replication: {
    master: {
      host: process.env.DB_MASTER_HOST,
      port: Number(process.env.DB_MASTER_PORT),
      username: process.env.DB_MASTER_USERNAME,
      password: process.env.DB_MASTER_PASSWORD,
      database: process.env.DB_NAME,
    },
    slaves: [
      {
        host: process.env.DB_REPLICA_HOST,
        port: Number(process.env.DB_REPLICA_PORT),
        username: process.env.DB_REPLICA_USERNAME,
        password: process.env.DB_REPLICA_PASSWORD,
        database: process.env.DB_NAME,
      },
    ],
  },
})
```

### 3.3 Roteamento Automático de Queries

O TypeORM roteia automaticamente as operações:

| Operação | Destino | Exemplo |
|----------|---------|---------|
| `SELECT` | Slave (Replica) | `repository.find()`, `repository.findOne()` |
| `INSERT` | Master | `repository.save()`, `repository.insert()` |
| `UPDATE` | Master | `repository.update()`, `repository.save()` |
| `DELETE` | Master | `repository.delete()`, `repository.remove()` |
| Transações | Master | `@Transactional()`, `QueryRunner` |

### 3.4 Feature Flag

A funcionalidade é controlada pela variável de ambiente `DB_REPLICATION_ENABLED`:

```bash
# Modo single database (comportamento atual)
DB_REPLICATION_ENABLED=false

# Modo replicação (read/write splitting)
DB_REPLICATION_ENABLED=true
```

---

## 4. Guia de Execução e Validação

### 4.1 Pré-requisitos

- Docker e Docker Compose instalados
- Node.js 14+ e Yarn
- Acesso ao repositório do projeto

### 4.2 Passo a Passo para Execução

#### Passo 1: Subir a Infraestrutura

```bash
# Navegar para o diretório do projeto
cd /path/to/abemcomum-saev-backend

# Subir os containers MySQL (master + replica)
docker-compose -f docker-compose.replication.yml up -d

# Verificar se os containers estão rodando
docker ps

# Aguardar health check (aproximadamente 30 segundos)
docker-compose -f docker-compose.replication.yml ps
```

#### Passo 2: Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar o arquivo .env com as configurações:
DB_REPLICATION_ENABLED=true
DB_NAME=saev

DB_MASTER_HOST=localhost
DB_MASTER_PORT=3306
DB_MASTER_USERNAME=saev_user
DB_MASTER_PASSWORD=saev_password

DB_REPLICA_HOST=localhost
DB_REPLICA_PORT=3307
DB_REPLICA_USERNAME=saev_user
DB_REPLICA_PASSWORD=saev_password
```

#### Passo 3: Executar Migrations

```bash
# Instalar dependências (se necessário)
yarn install
```

**Nota:** Para a POC simplificada, as migrations devem ser executadas manualmente em ambos os bancos, já que não há replicação real do MySQL:

#### Passo 4: Iniciar a Aplicação

```bash
# Modo desenvolvimento
yarn start:dev

# Verificar logs de inicialização
# Deve aparecer:
# [DatabaseConfig] Database replication is ENABLED
# [DatabaseConfig] Master: localhost:3306
# [DatabaseConfig] Slaves: localhost:3307
```

### 4.3 Validação Técnica

#### Teste 1: Verificar Roteamento de Leitura

```bash
# Habilitar logging de queries no MySQL replica
docker exec -it saev-db-replica mysql -u root -prootpassword -e "SET GLOBAL general_log = 'ON';"

# Fazer uma requisição GET (leitura)
curl http://localhost:3003/v1/assessments

# Verificar logs no replica
docker exec -it saev-db-replica mysql -u root -prootpassword -e "SELECT * FROM mysql.general_log ORDER BY event_time DESC LIMIT 10;"
```

#### Teste 2: Verificar Roteamento de Escrita

```bash
# Habilitar logging de queries no MySQL master
docker exec -it saev-db-master mysql -u root -prootpassword -e "SET GLOBAL general_log = 'ON';"

# Fazer uma requisição POST (escrita)
curl -X POST http://localhost:3003/v1/endpoint-de-criacao \
  -H "Content-Type: application/json" \
  -d '{"dados": "teste"}'

# Verificar logs no master
docker exec -it saev-db-master mysql -u root -prootpassword -e "SELECT * FROM mysql.general_log ORDER BY event_time DESC LIMIT 10;"
```

#### Teste 3: Verificar Transações

Transações devem sempre usar o master, mesmo para operações de leitura dentro da transação:

```bash
# Executar endpoint que usa @Transactional()
# Todas as queries (SELECT, INSERT, UPDATE) devem ir para o master
```

### 4.4 Checklist de Validação

| Item | Validação | Status |
|------|-----------|--------|
| Containers iniciam corretamente | `docker ps` mostra ambos containers | [ ] |
| Aplicação conecta aos bancos | Logs mostram conexão com master e slave | [ ] |
| Leituras vão para replica | Logs do replica mostram SELECTs | [ ] |
| Escritas vão para master | Logs do master mostram INSERT/UPDATE/DELETE | [ ] |
| Transações usam master | Queries dentro de transação vão para master | [ ] |
| Rollback em caso de falha | Feature flag permite voltar ao modo single | [ ] |

---

## 5. Separação de Camadas e Responsabilidades

### 5.1 Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE APRESENTAÇÃO                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Controllers                       │   │
│  │  - Recebe requisições HTTP                          │   │
│  │  - Valida DTOs de entrada                           │   │
│  │  - Delega para Services                             │   │
│  │  - Não conhece detalhes de banco de dados           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     CAMADA DE NEGÓCIO                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     Services                         │   │
│  │  - Implementa regras de negócio                     │   │
│  │  - Orquestra operações entre repositórios           │   │
│  │  - Gerencia transações (@Transactional)             │   │
│  │  - Não conhece detalhes de replicação               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE PERSISTÊNCIA                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Repositories                       │   │
│  │  - CRUD básico via TypeORM Repository               │   │
│  │  - Query Builders para consultas complexas          │   │
│  │  - Não conhece detalhes de replicação               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  CAMADA DE INFRAESTRUTURA                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              TypeORM Connection Manager              │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │         Replication Router (Interno)        │    │   │
│  │  │  - Analisa tipo de operação                 │    │   │
│  │  │  - Roteia SELECT → Slaves                   │    │   │
│  │  │  - Roteia INSERT/UPDATE/DELETE → Master     │    │   │
│  │  │  - Roteia Transações → Master               │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Database Connections                 │   │
│  │  ┌───────────────┐        ┌───────────────┐         │   │
│  │  │    Master     │        │    Slave(s)   │         │   │
│  │  │  Connection   │        │  Connection   │         │   │
│  │  │   Pool        │        │    Pool       │         │   │
│  │  └───────────────┘        └───────────────┘         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Responsabilidades por Camada

| Camada | Responsabilidade | Conhece Replicação? |
|--------|------------------|---------------------|
| Controller | Endpoints HTTP, validação de entrada | Não |
| Service | Regras de negócio, orquestração | Não |
| Repository | Acesso a dados, queries | Não |
| TypeORM | Gerenciamento de conexões, roteamento | **Sim** |
| Configuration | Configuração de infraestrutura | **Sim** |

### 5.3 Princípio de Transparência

O código de negócio (Controllers, Services, Repositories) **não precisa ser alterado**. A separação read/write é completamente transparente e gerenciada pela camada de infraestrutura (TypeORM + Configuration).

---

## 6. Fluxo de Dados

### 6.1 Fluxo de Leitura (SELECT)

```
┌──────────┐    GET /api/students    ┌────────────┐
│  Client  │ ───────────────────────►│ Controller │
└──────────┘                         └─────┬──────┘
                                           │
                                           ▼
                                    ┌────────────┐
                                    │  Service   │
                                    │ findAll()  │
                                    └─────┬──────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │ Repository  │
                                   │   find()    │
                                   └──────┬──────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │   TypeORM   │
                                   │  Detecta:   │
                                   │   SELECT    │
                                   └──────┬──────┘
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │    MySQL REPLICA    │
                               │     (Port 3307)     │
                               └─────────────────────┘
```

### 6.2 Fluxo de Escrita (INSERT/UPDATE/DELETE)

```
┌──────────┐   POST /api/students    ┌────────────┐
│  Client  │ ───────────────────────►│ Controller │
└──────────┘                         └─────┬──────┘
                                           │
                                           ▼
                                    ┌────────────┐
                                    │  Service   │
                                    │  create()  │
                                    └─────┬──────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │ Repository  │
                                   │   save()    │
                                   └──────┬──────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │   TypeORM   │
                                   │  Detecta:   │
                                   │   INSERT    │
                                   └──────┬──────┘
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │    MySQL MASTER     │
                               │     (Port 3306)     │
                               └─────────────────────┘
```

### 6.3 Fluxo de Transação

```
┌──────────┐  POST /api/transfer     ┌────────────┐
│  Client  │ ───────────────────────►│ Controller │
└──────────┘                         └─────┬──────┘
                                           │
                                           ▼
                                    ┌────────────────┐
                                    │    Service     │
                                    │ @Transactional │
                                    └───────┬────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
             ┌────────────┐         ┌────────────┐         ┌────────────┐
             │ SELECT     │         │ UPDATE     │         │ INSERT     │
             │ (Origem)   │         │ (Saldo)    │         │ (Log)      │
             └─────┬──────┘         └─────┬──────┘         └─────┬──────┘
                   │                      │                      │
                   └──────────────────────┼──────────────────────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │   TypeORM   │
                                   │  Detecta:   │
                                   │ TRANSACTION │
                                   └──────┬──────┘
                                          │
                                          ▼
                         ┌────────────────────────────────┐
                         │        MySQL MASTER            │
                         │  (Todas as operações da        │
                         │   transação vão para master)   │
                         └────────────────────────────────┘
```

---

## 7. Aprendizados e Análise

### 7.1 Pontos Positivos

| Aspecto | Benefício |
|---------|-----------|
| **Zero alteração em código de negócio** | Controllers, Services e Repositories não precisam de modificação |
| **Configuração declarativa** | Toda a lógica de replicação é configurada via ambiente |
| **Roteamento automático** | TypeORM decide automaticamente o destino das queries |
| **Suporte nativo a transações** | Transações são automaticamente direcionadas ao master |
| **Feature flag** | Possibilidade de habilitar/desabilitar sem deploy |
| **Compatibilidade** | Funciona com `typeorm-transactional-cls-hooked` |
| **Escalabilidade** | Permite adicionar múltiplas replicas (round-robin) |

### 7.2 Limitações Identificadas

| Limitação | Descrição | Mitigação |
|-----------|-----------|-----------|
| **Replication lag** | Leituras podem retornar dados desatualizados | Para operações críticas, usar transação |
| **Read-after-write** | Ler imediatamente após escrever pode não refletir a mudança | TypeORM mitiga isso no mesmo request |
| **POC simplificada** | Não testa replicação real do MySQL | Testar com Cloud SQL em ambiente de staging |
| **Migrations** | Devem ser executadas no master | Configurar migrations para rodar apenas no master |
| **Sessões de longa duração** | Podem ter inconsistências | Avaliar casos específicos |

### 7.3 Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Inconsistência de dados por replication lag | Média | Médio | Monitorar lag, usar transações para operações críticas |
| Falha na replica | Baixa | Alto | Cloud SQL gerencia failover automático |
| Sobrecarga no master | Baixa | Médio | Balancear queries, otimizar índices |
| Incompatibilidade com bibliotecas | Baixa | Alto | Testado com typeorm-transactional-cls-hooked |
| Complexidade de debugging | Média | Baixo | Logging detalhado implementado |

### 7.4 Métricas para Monitoramento em Produção

| Métrica | Descrição | Alerta |
|---------|-----------|--------|
| Replication Lag | Atraso entre master e replica | > 5 segundos |
| Connection Pool Usage | Uso do pool de conexões | > 80% |
| Query Distribution | Proporção read/write | Monitorar anomalias |
| Error Rate | Taxa de erros de conexão | > 1% |
| Response Time | Tempo de resposta por tipo | P99 > 500ms |

---

## 8. Plano de Produção - Cloud SQL GCP

### 8.1 Configuração Cloud SQL

O Google Cloud SQL oferece suporte nativo a Read Replicas com replicação automática:

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud SQL Configuration                   │
│                                                             │
│  Primary Instance (Master)                                  │
│  ├── Name: saev-db-primary                                  │
│  ├── Region: southamerica-east1 (São Paulo)                 │
│  ├── Machine Type: db-n1-standard-4                         │
│  ├── Storage: 100GB SSD                                     │
│  └── High Availability: Enabled                             │
│                                                             │
│  Read Replica                                               │
│  ├── Name: saev-db-replica                                  │
│  ├── Region: southamerica-east1                             │
│  ├── Machine Type: db-n1-standard-2                         │
│  └── Storage: 100GB SSD                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Variáveis de Ambiente para Produção (GCP)

```bash
# Produção - Cloud SQL
DB_REPLICATION_ENABLED=true
DB_NAME=saev

# Master (Primary Instance)
DB_MASTER_HOST=/cloudsql/project-id:region:saev-db-primary
DB_MASTER_PORT=3306
DB_MASTER_USERNAME=saev_app
DB_MASTER_PASSWORD=${SECRET_DB_PASSWORD}

# Replica (Read Replica)
DB_REPLICA_HOST=/cloudsql/project-id:region:saev-db-replica
DB_REPLICA_PORT=3306
DB_REPLICA_USERNAME=saev_app
DB_REPLICA_PASSWORD=${SECRET_DB_PASSWORD}
```

### 8.3 Benefícios do Cloud SQL

| Benefício | Descrição |
|-----------|-----------|
| **Replicação automática** | Dados replicados automaticamente do primary para replica |
| **Failover automático** | Em caso de falha, replica pode ser promovida |
| **Backups gerenciados** | Backups automáticos com point-in-time recovery |
| **Escalabilidade** | Adicionar réplicas conforme necessário |
| **Monitoramento** | Métricas integradas ao Cloud Monitoring |
| **Segurança** | Conexão via Cloud SQL Proxy com IAM |



### Referências
- [Cloud SQL Read Replicas](https://cloud.google.com/sql/docs/mysql/replication)

