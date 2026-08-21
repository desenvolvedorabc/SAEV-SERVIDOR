# Módulo `batch-operations`

Operações administrativas executadas **em bloco** sobre grandes volumes de dados. Implementa duas operações:

- **Desativação de alunos não enturmados** (`STUDENT_DEACTIVATION`) — inativa (`ALU_ATIVO=0`) alunos que já estão sem turma.
- **Desativação de turmas em cascata** (`CLASS_DEACTIVATION`) — para combinações município+rede de um ano letivo anterior, **desenturma** os alunos das turmas ativas (preservando o histórico em `turma_aluno`) e **depois desativa** essas turmas. Os alunos ficam sem turma mas permanecem **ativos**.

Não usa Bull/Redis: o progresso é rastreado via a entidade `BatchOperation` no banco. A execução é assíncrona (Cloud Tasks) e o front consulta o status ao carregar/recarregar a tela (sem polling).

Reaproveita os **padrões** da infra de reprocesso (`jobs/`) — dispatcher abstrato, `GoogleOidcGuard`, reconciliação por Cloud Scheduler — mas em um módulo próprio, sem acoplamento ao pipeline de reprocesso.

---

## Sumário

1. [Responsabilidades](#responsabilidades)
2. [Entidades e Enums](#entidades-e-enums)
3. [Fluxo da Operação](#fluxo-da-operação)
4. [A query de desativação (alunos)](#a-query-de-desativação-alunos)
5. [Desativação de turmas em cascata](#desativação-de-turmas-em-cascata)
6. [Dispatcher: Cloud Tasks vs In-Process](#dispatcher-cloud-tasks-vs-in-process)
7. [Worker HTTP (APP_ROLE=worker)](#worker-http-app_roleworker)
8. [Endpoints públicos](#endpoints-públicos)
9. [Permissão de acesso](#permissão-de-acesso)
10. [Regras críticas de integridade](#regras-críticas-de-integridade)
11. [Variáveis de ambiente](#variáveis-de-ambiente)
12. [Estrutura de arquivos](#estrutura-de-arquivos)

---

## Responsabilidades

| Responsabilidade | Onde |
|---|---|
| Criar a operação, bloquear concorrência e despachar a execução | `BatchOperationService` |
| Consultar status e histórico paginado | `BatchOperationService` |
| Rotear a execução para o serviço do `type` da operação | `BatchOperationExecutorService` |
| Desativar em massa os alunos não enturmados (execução no worker) | `StudentDeactivationService` |
| Desenturmar alunos e desativar turmas em cascata (execução no worker) | `ClassDeactivationService` |
| Recuperar operações órfãs/travadas | `BatchOperationReconciliationService` |
| Enfileirar a execução (Cloud Tasks ou in-process) | `BatchOperationDispatcher` |

---

## Entidades e Enums

### `BatchOperation`

Registro de uma operação em lote.

| Campo | Tipo | Significado |
|---|---|---|
| `id` | PK | — |
| `type` | `BatchOperationType` | `STUDENT_DEACTIVATION` / `CLASS_DEACTIVATION` |
| `status` | `BatchOperationStatus` | `PENDING → RUNNING → DONE / FAILED` |
| `combinations` | `json` | Tags selecionadas: `{ countyId, network }[]` |
| `year` | varchar nullable | Ano letivo — obrigatório em `CLASS_DEACTIVATION` (anterior ao corrente); `null` na desativação de alunos |
| `requestedByUserId` | FK nullable | Usuário que disparou (ON DELETE SET NULL — LGPD) |
| `errorMessage` | text nullable | Mensagem do último erro |
| `retryCount` | number | Incrementado a cada tentativa de execute |
| `startDate` / `endDate` | timestamp nullable | Início/fim da última execução |

Índice composto `IDX_batch_operation_type_status` em `(type, status)` — suporta o lock "operação em andamento" e o filtro do histórico.

**`BatchOperationType`**

| Valor | Uso |
|---|---|
| `STUDENT_DEACTIVATION` | Desativação em massa de alunos não enturmados |
| `CLASS_DEACTIVATION` | Desenturmação dos alunos + desativação das turmas, em cascata |

**`BatchOperationStatus`**

```
PENDING → RUNNING → DONE
                 ↘ FAILED
```

Uma operação `RUNNING` com `updatedAt` há mais de 30 minutos é considerada **travada** e pode ser reclamada pela próxima chamada de `execute`.

**`BatchOperationStatusTag`** — derivado do `status` via `toStatusTag()`, é o que a UI pinta como tag:

| `status` | `statusTag` | Tag exibida |
|---|---|---|
| `PENDING` / `RUNNING` | `IN_PROGRESS` | Em andamento |
| `DONE` | `SUCCESS` | Sucesso |
| `FAILED` | `ERROR` | Erro (mostra `errorMessage`) |

O response carrega **ambos**: `status` (técnico, distingue fila de processamento) e `statusTag` (UI).

---

## Fluxo da Operação

```
[primary] POST /v1/batch-operations/{student-deactivation | class-deactivation}
      │  valida (DTO) ≥1 combinação; em class-deactivation valida year < ano corrente
      │  assertNoOperationInProgress() — bloqueio cross-tela (qualquer type em PENDING/RUNNING)
      │  cria BatchOperation (status=PENDING, requestedByUserId, year p/ turmas)
      ▼
dispatcher.scheduleExecute(operationId)
      │
      ▼
[worker] POST /internal/batch-operations/execute  →  BatchOperationExecutorService.execute(id)
      │  carrega a operação e roteia pelo type:
      │     STUDENT_DEACTIVATION → StudentDeactivationService.execute(id)
      │     CLASS_DEACTIVATION   → ClassDeactivationService.execute(id)
      │  idempotência: DONE? RUNNING<30min? → skip ; RUNNING≥30min → reclaim
      │  status=RUNNING, retryCount++
      │  para cada combinação município+rede: comandos em massa (ver abaixo)
      │  status=DONE  (ou FAILED + relança p/ o Cloud Tasks reexecutar)
      ▼
[Cloud Scheduler] POST /internal/batch-operations/reconcile (a cada 5 min)
      │  re-despacha PENDING órfão (>5min) e RUNNING travado (>15min)
```

### Bloqueio cross-tela ("operação em andamento")

`assertNoOperationInProgress()` rejeita com `409 Conflict` se existir **qualquer** `BatchOperation` em `PENDING`/`RUNNING` — independente do `type`. Assim, uma desativação de alunos em andamento bloqueia também a tela de turmas (e vice-versa). O endpoint `GET /in-progress` expõe esse estado para o aviso amarelo.

---

## A query de desativação (alunos)

Município e rede **não existem no aluno** — vivem na escola (`escola.ESC_MUN_ID` / `escola.ESC_TIPO`). O aluno só tem `ALU_ESC_ID`. Por isso o UPDATE faz `JOIN` com `escola`, usada apenas como filtro:

```sql
UPDATE `aluno` a
INNER JOIN `escola` e ON e.`ESC_ID` = a.`ALU_ESC_ID`
SET a.`ALU_ATIVO` = 0, a.`ALU_DT_ATUALIZACAO` = NOW()
WHERE a.`ALU_ATIVO` = 1
  AND a.`ALU_TUR_ID` IS NULL
  AND e.`ESC_MUN_ID` = ?
  AND e.`ESC_TIPO` = ?
```

Executado via `manager.query()` com placeholders posicionais (`?`), parametrizado contra SQL injection — um UPDATE por combinação.

- **"Não enturmado"** = `ALU_TUR_ID IS NULL` (estado denormalizado que o sistema já mantém). Sem noção de ano: o aluno não carrega ano.
- **Idempotente**: `ALU_ATIVO = 1` no WHERE garante que reexecuções (retry do Cloud Tasks / reconciliação) afetam 0 alunos.
- **Não atômico entre combinações**: cada combinação é um UPDATE independente. Se a 3ª de 5 falhar, as 2 primeiras já foram commitadas; o retry reprocessa tudo (as já feitas afetam 0) e completa as restantes. Alinhado à ideia de desativação faseada, município a município.
- **Preserva histórico**: não toca `ALU_ESC_ID`, `ALU_TUR` ou `turma_aluno`. O aluno desativado segue vinculado à escola e pode ser reativado manualmente depois.

---

## Desativação de turmas em cascata

`ClassDeactivationService.execute()` processa, para cada combinação município+rede do ano informado, as turmas **ativas** — desenturmando os alunos e desativando as turmas, **nessa ordem**.

**1. Seleciona as turmas ativas** da combinação (só o `TUR_ID`; o filtro município+rede vive na escola, via `JOIN`):

```sql
SELECT SchoolClass.TUR_ID
FROM `turma` SchoolClass
INNER JOIN `escola` School ON School.ESC_ID = SchoolClass.TUR_ESC_ID
WHERE SchoolClass.TUR_ATIVO = 1
  AND SchoolClass.TUR_ANO = :year
  AND School.ESC_MUN_ID = :countyId
  AND School.ESC_TIPO   = :network
```

**2. Em lotes de turmas (`IN (...)`, chunk de 500)**, três comandos em massa + a desativação — nunca turma a turma. O banco é remoto e a latência por round-trip domina: municípios com **milhares** de turmas ativas (ex.: ~4.300 num único ano) levavam dezenas de minutos turma-a-turma; em lote, segundos.

```sql
-- (a) fecha as matrículas abertas (snapshot em turma_aluno)
UPDATE `turma_aluno` SET `endDate` = CURDATE()
WHERE `schoolClassTURID` IN (...) AND `endDate` IS NULL;

-- (b) cria snapshot fechado p/ alunos sem matrícula na própria turma (branch "else" do legado)
INSERT INTO `turma_aluno` (`startDate`,`endDate`,`studentALUID`,`schoolClassTURID`)
SELECT CURDATE(), CURDATE(), a.`ALU_ID`, a.`ALU_TUR_ID`
FROM `aluno` a
WHERE a.`ALU_TUR_ID` IN (...)
  AND NOT EXISTS (SELECT 1 FROM `turma_aluno` ta
                  WHERE ta.`studentALUID` = a.`ALU_ID`
                    AND ta.`schoolClassTURID` = a.`ALU_TUR_ID`);

-- (c) desenturma (aluno permanece ATIVO)
UPDATE `aluno`
SET `ALU_TUR_ID` = NULL, `ALU_SER_ID` = NULL,
    `ALU_STATUS` = 'Não Enturmado', `ALU_DT_ATUALIZACAO` = NOW()
WHERE `ALU_TUR_ID` IN (...);

-- (d) desativa as turmas do lote
UPDATE `turma` SET `TUR_ATIVO` = 0 WHERE `TUR_ID` IN (...);
```

Característica do desenho:

- **Snapshot preservado.** O par (a)+(b) reproduz, em massa, o que o `SchoolClassService.createSchoolClassStudentEndDate` fazia por aluno: fecha as matrículas abertas e, para quem não tinha registro, cria uma já fechada. O `INSERT` casa `ta.schoolClassTURID = a.ALU_TUR_ID` para que cada aluno só ganhe snapshot da **sua** turma, mesmo processando várias juntas.
- **Aluno fica sem turma, mas ATIVO.** O UPDATE não toca `ALU_ATIVO` — diferente da desativação de alunos.
- **Ordem obrigatória.** Desenturmar (a→c) sempre antes de desativar a turma (d); o `INSERT` (b) usa `ALU_TUR_ID` para achar quem está na turma, então roda antes do UPDATE de aluno (c).
- **Idempotente.** A seleção só pega `TUR_ATIVO = 1`; o (a) só fecha matrículas abertas; o (b) tem `NOT EXISTS`; o (c) não acha mais alunos já desenturmados. Retry do Cloud Tasks / reconciliação reprocessa só o que faltou.
- **Ano corrente bloqueado.** `createClassDeactivation` rejeita (`400`) `year >= ano corrente` — só anos anteriores.
- **Parametrizado** via `manager.query()` com placeholders posicionais.

---

## Dispatcher: Cloud Tasks vs In-Process

Injetado via token `BATCH_OPERATION_DISPATCHER` e selecionado pela mesma variável do reprocesso, `REPROCESS_DISPATCHER`:

| Modo | Classe | Quando usar |
|---|---|---|
| `cloud-tasks` | `CloudTasksBatchOperationDispatcher` | Produção/staging |
| `in-process` | `InProcessBatchOperationDispatcher` | Desenvolvimento local |

**Cloud Tasks** cria uma task com `name` único (`batch-op-${id}`) na fila `CLOUD_TASKS_BATCH_EXECUTE_QUEUE`, alvo `POST {WORKER_BASE_URL}/internal/batch-operations/execute`, assinada com OIDC. Código `ALREADY_EXISTS` (gRPC 6) é silenciado — dedup nativo.

**In-Process** chama `BatchOperationExecutorService.execute()` via `setImmediate`. Processo único; não usar em produção.

---

## Worker HTTP (`APP_ROLE=worker`)

Quando `APP_ROLE=worker`, o `AppModule` carrega o `BatchOperationsWorkerModule`, que registra o `BatchOperationInternalController` sob `/internal/batch-operations`. **O backend primário não expõe esses endpoints.**

Protegidos pelo `GoogleOidcGuard` (reusado de `auth/`), que valida o JWT OIDC do Cloud Tasks/Scheduler. E-mails permitidos em `INTERNAL_OIDC_ALLOWED_EMAILS`.

| Endpoint | Caller | O que faz |
|---|---|---|
| `POST /internal/batch-operations/execute` | Cloud Tasks (execute queue) | `BatchOperationExecutorService.execute(operationId)` (roteia pelo `type`) |
| `POST /internal/batch-operations/reconcile` | Cloud Scheduler | `BatchOperationReconciliationService.reconcile()` |

---

## Endpoints públicos

Todos sob `/v1/batch-operations/`, protegidos por `JwtAuthGuard` + `RolesGuard` + `AreaGuard`.

| Método | Path | O que faz |
|---|---|---|
| POST | `/student-deactivation` | Cria a operação e despacha. Body: `{ combinations: [{ countyId, network }] }` |
| POST | `/class-deactivation` | Cria a cascata de turmas e despacha. Body: `{ year, combinations: [{ countyId, network }] }` |
| GET | `/` | Histórico paginado de **todas** as operações. Query: `?page&limit` |
| GET | `/student-deactivation/:id` | Detalhe da operação (modal / status no load) |
| GET | `/class-deactivation/:id` | Detalhe da operação de turmas (mesma projeção; resposta inclui `type` e `year`) |
| GET | `/in-progress` | `{ inProgress: boolean }` — alimenta o aviso amarelo das duas telas |

A resposta projeta apenas o necessário do usuário (`USU_ID`/`USU_NOME`), via `baseQuery()` — nunca o objeto `User` inteiro.

---

## Permissão de acesso

Dupla barreira em todas as rotas públicas:

1. **`RolesGuard`** + `@Role([RoleProfile.SAEV])` — só admin SAEV.
2. **`AreaGuard`** + `@RequireArea(AreaEnum.OPR_LOTE)` — o sub-perfil do usuário precisa ter a área `OPR_LOTE` vinculada.

A área `OPR_LOTE` ("Operações em Lote") é criada pelo seed `CreateAreasSeed` (`areasData`) e vinculada ao sub-perfil SAEV como dado (banco / tela de Perfis de Acesso), igual às demais áreas.

---

## Regras críticas de integridade

1. **Ambas as operações são idempotentes.** Alunos: `WHERE ALU_ATIVO = 1`. Turmas: a seleção só pega `TUR_ATIVO = 1`, o fechamento de matrícula só atua em `endDate IS NULL`, o INSERT tem `NOT EXISTS` e o UPDATE de aluno filtra por `ALU_TUR_ID`. Retries do Cloud Tasks e a reconciliação não causam dano nem dupla contagem.

2. **Desativação de alunos não toca `ALU_ESC_ID`/`ALU_TUR`/`turma_aluno`.** Só muda `ALU_ATIVO`. Já a **cascata de turmas** desenturma (`ALU_TUR_ID`/`ALU_SER_ID = NULL`, `ALU_STATUS='Não Enturmado'`) e fecha o snapshot em `turma_aluno`, mas **não** inativa o aluno (`ALU_ATIVO` intacto).

3. **Ordem obrigatória na cascata.** Sempre desenturmar antes de desativar a turma; nunca o inverso.

4. **Bloqueio cross-tela por status, não por type.** O lock considera qualquer operação `PENDING`/`RUNNING`, então as duas telas do módulo se bloqueiam mutuamente.

5. **Em erro, relança.** `execute` marca `FAILED`, grava `errorMessage` e **relança** a exceção para o Cloud Tasks reexecutar. A idempotência torna isso seguro.

6. **`year`: nullable nos alunos, obrigatório e anterior ao corrente nas turmas.** A desativação de alunos grava `year = null`. A de turmas exige `year` e rejeita (`400`) ano corrente/futuro.

7. **Reconciliação externa, nunca `@Cron`.** O worker pode ter `min-instances=0`; a recuperação de órfãos/travados é disparada pelo Cloud Scheduler.

---

## Variáveis de ambiente

| Variável | Obrigatória em prod | Padrão | Descrição |
|---|---|---|---|
| `APP_ROLE` | sim | — | `primary` ou `worker` |
| `REPROCESS_DISPATCHER` | sim | `in-process` | `cloud-tasks` ou `in-process` (compartilhado com o reprocesso) |
| `GCP_PROJECT_ID` | se cloud-tasks | — | Projeto GCP |
| `CLOUD_TASKS_LOCATION` | se cloud-tasks | — | Região das filas (ex: `us-central1`) |
| `CLOUD_TASKS_BATCH_EXECUTE_QUEUE` | se cloud-tasks | — | Nome da fila de execução das operações em lote |
| `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` | se cloud-tasks | — | SA que assina as tasks |
| `WORKER_BASE_URL` | se cloud-tasks | — | URL base do worker (ex: `https://worker.run.app/v1`) |
| `INTERNAL_OIDC_ALLOWED_EMAILS` | se worker | — | CSV de e-mails OIDC permitidos |
| `ALLOW_LOCAL_BYPASS` | não | — | `true` habilita bypass dev (exige `NODE_ENV != production` + `REPROCESS_DISPATCHER=in-process`) |

> Provisionamento das filas e do Cloud Scheduler: ver [docs/reprocess-infra.md](../../../docs/reprocess-infra.md) (seção "Operações em Lote").

---

## Estrutura de arquivos

```
batch-operations/
├── README.md
├── batch-operations.module.ts               # Providers, exports, DI do dispatcher, AreaGuard
│
├── model/
│   ├── entities/batch-operation.entity.ts
│   ├── enums/
│   │   ├── batch-operation-type.enum.ts
│   │   └── batch-operation-status.enum.ts    # + BatchOperationStatusTag + toStatusTag()
│   └── interface/batch-operation-response.interface.ts
│
├── dto/
│   ├── create-student-deactivation.dto.ts
│   ├── create-class-deactivation.dto.ts          # + year (obrigatório, anterior ao corrente)
│   ├── batch-operation-combination.dto.ts
│   └── list-batch-operations-query.dto.ts
│
├── dispatcher/
│   ├── batch-operation-dispatcher.interface.ts   # Token DI + interface
│   ├── cloud-tasks-batch-operation-dispatcher.ts
│   └── in-process-batch-operation-dispatcher.ts  # chama o executor
│
├── service/
│   ├── batch-operation.service.ts                # create*, getStatus, isAnyInProgress, listHistory
│   ├── batch-operation-executor.service.ts       # execute(id): roteia pelo type
│   ├── student-deactivation.service.ts           # execute(): idempotência + UPDATE em massa
│   ├── class-deactivation.service.ts             # execute(): cascata desenturmar→desativar (IN chunkado)
│   └── batch-operation-reconciliation.service.ts # reconcile() — chamado pelo Cloud Scheduler
│
├── controller/
│   └── batch-operations.controller.ts            # Endpoints públicos /v1/batch-operations
│
└── worker/
    ├── batch-operations-worker.module.ts         # Carregado somente se APP_ROLE=worker
    ├── batch-operation-internal.controller.ts    # POST /internal/batch-operations/{execute,reconcile}
    └── dto/execute-batch-operation.dto.ts
```
