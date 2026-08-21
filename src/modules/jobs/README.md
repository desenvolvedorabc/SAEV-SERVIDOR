# Módulo `jobs`

Responsável por toda a geração e regeneração de relatórios do SAEV. Não usa Bull/Redis: o progresso é rastreado via a entidade `Job` no banco, e o cliente faz polling de status.

---

## Sumário

1. [Responsabilidades](#responsabilidades)
2. [Entidades e Enums](#entidades-e-enums)
3. [Fluxo de Geração Normal (startJob)](#fluxo-de-geração-normal-startjob)
4. [Fluxo de Reprocessamento Retroativo](#fluxo-de-reprocessamento-retroativo)
5. [Dispatcher: Cloud Tasks vs In-Process](#dispatcher-cloud-tasks-vs-in-process)
6. [Worker HTTP (APP_ROLE=worker)](#worker-http-app_roleworker)
7. [Endpoints públicos](#endpoints-públicos)
8. [Regras críticas de integridade](#regras-críticas-de-integridade)
9. [Variáveis de ambiente](#variáveis-de-ambiente)
10. [Estrutura de arquivos](#estrutura-de-arquivos)

---

## Responsabilidades

| Responsabilidade | Onde |
|---|---|
| Geração inicial de relatórios por turma, escola, regional, município | `JobsService` |
| Regeneração retroativa após mudança de gabarito/anulação/descritor | `ReprocessService`, `ReprocessSchoolClassService` |
| Detecção de mudanças e enfileiramento com debounce | `ReprocessDispatchService` |
| Reconciliação de logs órfãos | `ReprocessReconciliationService` |
| Cálculo de `ReportSubject` por tipo OBJETIVA/LEITURA | `JobsService`, `ReprocessSchoolClassService` |
| Cálculo de descritores por turma | `JobDescriptorsService` |
| Cálculo de não avaliados | `JobNotEvaluatedService` |
| Cálculo de distribuição racial | `JobRaceService` |
| Cálculo por questão | `JobQuestionService` |

---

## Entidades e Enums

### `Job`

Registro de uma execução de geração/reprocessamento.

| Campo | Tipo | Significado |
|---|---|---|
| `id` | PK | — |
| `assessmentId` | number | Avaliação alvo |
| `countyId` | number | Município alvo |
| `bullId` | string | Legado; `"ERROR"` sinaliza falha em jobs antigos |
| `jobType` | `JobType` | Tipo do job (ver tabela abaixo) |
| `status` | `JobStatus` | `PENDING → RUNNING → DONE / FAILED` |
| `affectedTestIds` | `simple-array` | IDs de `Test` afetados; acumulado por múltiplos dispatches |
| `retryCount` | number | Incrementado a cada tentativa de execute |
| `errorMessage` | text | Mensagem do último erro |
| `triggeredByChangeLogId` | FK nullable | `AnswerKeyChangeLog` que originou o job |
| `startDate` / `endDate` | Date | Timestamps de início/fim da última execução |

**`JobType`**

| Valor | Uso |
|---|---|
| `JOB_FULL` | Geração completa disparada manualmente |
| `REPROCESS_ANSWER_KEY` | Reprocessamento retroativo após mudança no gabarito/descritor |
| `ReportEditionSchoolClass` / `ReportSubjectSchool` / etc. | Tipos históricos de jobs granulares |

**`JobStatus`**

```
PENDING → RUNNING → DONE
                 ↘ FAILED
```

Um job `RUNNING` com `updatedAt` há mais de 30 minutos é considerado **stuck** e pode ser reclamado pela próxima chamada de `executeReprocess`.

---

### `AnswerKeyChangeLog`

Auditoria de alterações em `TestTemplate` que disparam reprocessamento.

| Campo | Tipo | Significado |
|---|---|---|
| `testTemplateId` | FK | Template de questão alterado |
| `field` | `AnswerKeyChangeField` | Campo alterado: `RESPOSTA_CORRETA`, `ANULADA`, `DESCRITOR` |
| `previousValue` | varchar | Valor anterior |
| `newValue` | varchar | Novo valor |
| `changedByUserId` | FK nullable | Usuário que fez a alteração (ON DELETE SET NULL — LGPD) |
| `reprocessStatus` | `ReprocessStatus` | `PENDING → DISPATCHED → DONE / FAILED` |
| `dispatchedAt` | timestamp | Momento em que o dispatch foi enfileirado |

**`ReprocessStatus`** do changelog é independente do `JobStatus`. Um changelog vai a `DISPATCHED` quando a task é enfileirada; o job segue seu próprio ciclo de vida.

---

## Fluxo de Geração Normal (`startJob`)

Chamado via `GET /v1/jobs/start-job` (protegido por `GoogleOidcGuard`). Processa todas as avaliações **em andamento** (janela `AVM_DT_INICIO ≤ agora ≤ AVM_DT_FIM - 3h`) em concorrência 5:

```
Para cada edição em andamento:
  Para cada (assessmentCounty) em paralelo (concurrency=5):
    1. generateReportEditionsBySchoolClasses   ← turma-level, população = ALU_ATIVO=true
    2. generateReportEditionsBySchool          ← rollup escola
    3. generateReportEditionsByMunicipalityRegional  ← rollup regional
    4. generateReportEditionsByCounty          ← rollup município
```

**`startJobWithFilters`** (`GET /v1/jobs/start-job-with-filters`, role `SAEV`) faz o mesmo mas sem o passo `generateReportEditionsBySchoolClasses` e permite filtrar por `assessmentId`/`countyId`/`stateId`.

### Cálculo do `ReportSubject` por turma

Para cada turma × teste (mesmo `TUR_ANO` e `SER_ID`):

- **OBJETIVA**: `totalGradesStudents = Σ round(acertos_válidos / questões_válidas * 100)` por aluno presente. Questões com `TEG_ANULADA=true` são excluídas do denominador.
- **LEITURA**: distribuição em categorias (`fluente`, `nao_fluente`, `frases`, `palavras`, `silabas`, `nao_leitor`, `nao_avaliado`, `nao_informado`).

O campo `idStudents` armazena os IDs de todos os alunos que compõem a turma no momento da geração (ativos + submetidos). É a população histórica.

---

## Fluxo de Reprocessamento Retroativo

Acionado quando admin altera `TEG_RESPOSTA_CORRETA`, `TEG_ANULADA` ou `TEG_MTI` (descritor) em uma questão de edição **já encerrada**.

### Visão geral

```
[tests.service] detecta mudança
      │
      ▼
AnswerKeyChangeLog criado (status=PENDING)
      │
      ▼
dispatcher.scheduleDebounce(testTemplateId, changeLogId)
      │
      │  aguarda CLOUD_TASKS_DEBOUNCE_SECONDS (padrão: 60s)
      │  múltiplas mudanças no mesmo template se fundem em 1 task
      ▼
POST /internal/reprocess/dispatch  →  ReprocessDispatchService.handle()
      │
      │  resolveTargets: quais (assessment, county) têm lançamentos p/ este teste?
      │  upsertJobLocked: SELECT FOR UPDATE → cria ou mescla Job com affectedTestIds
      │  changelogs → DISPATCHED
      ▼
dispatcher.scheduleExecute(jobId)
      │
      ▼
POST /internal/reprocess/execute  →  ReprocessService.executeReprocess(jobId)
      │
      ├─ reprocessSchoolClassService.regenerate()   (UPDATE in-place, preserva idStudents)
      ├─ generateReportEditionsBySchool()
      ├─ generateReportEditionsByMunicipalityRegional()
      └─ generateReportEditionsByCounty()
```

### Por que UPDATE in-place no nível de turma

`generateReportEditionsBySchoolClasses` (usado no fluxo normal) recria `ReportSubject` consultando `ALU_ATIVO=true`. Em edições encerradas, alunos transferidos ou desativados estão fora do banco — o total histórico seria perdido.

`ReprocessSchoolClassService.regenerate` usa `ReportSubject.idStudents` como população fixa e faz `save()` sobre o objeto existente, preservando o ID e a população histórica. Os **filhos** do subject (`report_question`, `report_race`) e os filhos da edition ligados ao mesmo teste (`report_descriptor`, `report_not_evaluated`) são apagados e recriados — eles não guardam população histórica.

### `affectedTestIds`

Propaga quais `Test.TES_ID` foram afetados desde o dispatch até cada nível de rollup:

- **Dispatch**: cada job acumula os IDs via merge (múltiplos changes no mesmo job = união de IDs).
- **`upsertReportEditionByAssessmentId`**: deleta apenas filhos cujo `test.TES_ID` ∈ `affectedTestIds`. Se vazio, deleta tudo (comportamento original, retrocompatível).
- **Repositórios de rollup** (`getMunicipalityRegionalReportEditions`, etc.): adicionam `WHERE REPORT_SUBJECT.testTESID IN (...)` quando o array é não-vazio.
- As sub-relações `.test` são carregadas automaticamente pelo `upsert` quando `affectedTestIds` é fornecido, sem exigir alteração nos callers.

### Reconciliação

`ReprocessReconciliationService.reconcile()` re-agenda changelogs que ficaram `PENDING` por mais de 5 minutos (orphans). Deve ser chamado externamente via **Cloud Scheduler** (`POST /internal/reprocess/reconcile`) — nunca use `@Cron` interno, pois o worker pode ter `min-instances=0` e o backend tem múltiplas réplicas sem leader election.

### Stuck jobs

Se um job ficar em `RUNNING` por mais de 30 minutos (worker morreu entre o `save(RUNNING)` e o `try/catch`), a próxima chamada de `executeReprocess` para o mesmo jobId o reclama e reinicia. O campo `retryCount` é incrementado a cada reclaim.

---

## Dispatcher: Cloud Tasks vs In-Process

O dispatcher é injetado via token `REPROCESS_DISPATCHER` e selecionado pela variável `REPROCESS_DISPATCHER`:

| Modo | Classe | Quando usar |
|---|---|---|
| `cloud-tasks` | `CloudTasksReprocessDispatcher` | Produção/staging |
| `in-process` | `InProcessReprocessDispatcher` | Desenvolvimento local |

**Cloud Tasks** usa `scheduleTime` para o debounce e `name` de task único para deduplicação nativa. Código `ALREADY_EXISTS` (gRPC 6) é silenciado — indica dedup bem-sucedido.

**In-Process** mantém um `Map<testTemplateId, { timer, changeLogIds }>` em memória. Funciona apenas em processo único; não usar em produção (múltiplas réplicas perdem o estado do timer).

O bypass local exige **3 condições simultâneas**: `ALLOW_LOCAL_BYPASS=true` + `NODE_ENV != production` + `REPROCESS_DISPATCHER=in-process`.

---

## Worker HTTP (`APP_ROLE=worker`)

Quando `APP_ROLE=worker`, o `AppModule` carrega o `WorkerHttpModule`, que registra o `ReprocessInternalController` sob `/internal/reprocess`. **O backend primário não expõe esses endpoints.**

Todos os endpoints são protegidos pelo `GoogleOidcGuard`, que valida o JWT OIDC assinado pelo Cloud Tasks/Scheduler via `google-auth-library`. Os e-mails permitidos são configurados em `INTERNAL_OIDC_ALLOWED_EMAILS` (CSV).

| Endpoint | Caller | O que faz |
|---|---|---|
| `POST /internal/reprocess/dispatch` | Cloud Tasks (debounce queue) | `ReprocessDispatchService.handle(testTemplateId)` |
| `POST /internal/reprocess/execute` | Cloud Tasks (execute queue) | `ReprocessService.executeReprocess(jobId)` |
| `POST /internal/reprocess/reconcile` | Cloud Scheduler | `ReprocessReconciliationService.reconcile()` |

---

## Endpoints públicos

Todos sob `/v1/jobs/`.

| Método | Path | Guard | Role | O que faz |
|---|---|---|---|---|
| GET | `/start-job` | `GoogleOidcGuard` | — | Gera relatórios para edições em andamento |
| GET | `/start-job-with-filters` | `JwtAuthGuard` | `SAEV` | Geração filtrada por assessment/county/state |
| GET | `/reprocess-status` | `JwtAuthGuard` | `SAEV` | Lista até 100 jobs `REPROCESS_ANSWER_KEY` |
| POST | `/reprocess/retry/:jobId` | `JwtAuthGuard` | `SAEV` | Força status `PENDING` e dispara execute inline |

---

## Regras críticas de integridade

1. **Nunca chame `generateReportEditionsBySchoolClasses` no reprocessamento.** Esse método recria `ReportSubject` consultando `ALU_ATIVO=true`, apagando a população histórica de edições encerradas.

2. **`idStudents` é imutável no reprocessamento.** `ReprocessSchoolClassService` faz UPDATE in-place e mantém o campo intacto.

3. **`ATR_CERTO` não é atualizado no reprocessamento.** Nenhum componente de relatório consome esse campo para decisão de negócio — o acerto é calculado ao vivo via `isAnswerCorrect(answer)` a partir de `TEG_RESPOSTA_CORRETA` e `TEG_ANULADA`.

4. **Filhos com chave composta são delete+recreate.** `report_question` e `report_race` têm chaves compostas; um UPDATE de matching seria frágil. Eles não carregam população histórica, então delete+recreate é seguro.

5. **`upsertJobLocked` usa `SELECT ... FOR UPDATE`.** Sem esse lock, duas réplicas do worker poderiam criar Jobs duplicados para o mesmo `(assessmentId, countyId)`. O índice composto `IDX_job_assessment_county` torna o range lock eficiente.

6. **`Promise.allSettled` no scheduleExecute.** Falha de uma task não aborta as demais. Cada falha é logada individualmente.

---

## Variáveis de ambiente

| Variável | Obrigatória em prod | Padrão | Descrição |
|---|---|---|---|
| `APP_ROLE` | sim | — | `primary` ou `worker` |
| `REPROCESS_DISPATCHER` | sim | `in-process` | `cloud-tasks` ou `in-process` |
| `GCP_PROJECT_ID` | se cloud-tasks | — | Projeto GCP |
| `CLOUD_TASKS_LOCATION` | se cloud-tasks | — | Região das filas (ex: `us-central1`) |
| `CLOUD_TASKS_REPROCESS_DEBOUNCE_QUEUE` | se cloud-tasks | — | Nome da fila de debounce |
| `CLOUD_TASKS_REPROCESS_EXECUTE_QUEUE` | se cloud-tasks | — | Nome da fila de execute |
| `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` | se cloud-tasks | — | SA que assina as tasks |
| `CLOUD_TASKS_DEBOUNCE_SECONDS` | não | `60` | Janela de debounce em segundos |
| `WORKER_BASE_URL` | se cloud-tasks | — | URL base do worker (ex: `https://worker.run.app/v1`) |
| `INTERNAL_OIDC_ALLOWED_EMAILS` | se worker | — | CSV de e-mails OIDC permitidos |
| `ALLOW_LOCAL_BYPASS` | não | — | `true` habilita bypass dev (exige `NODE_ENV != production`) |
| `REPROCESS_FAILURE_NOTIFICATION_EMAIL` | não | — | CSV de destinatários para e-mail de falha |

---

## Estrutura de arquivos

```
jobs/
├── job.entity.ts                          # Entidade Job
├── job-type.enum.ts                       # JobType enum
├── jobs.controller.ts                     # Endpoints públicos /v1/jobs
├── jobs.module.ts                         # Providers, exports, DI do dispatcher
├── jobs.service.ts                        # Geração normal + rollups escola/regional/município
│
├── model/
│   ├── entities/answer-key-change-log.entity.ts
│   └── enums/
│       ├── job-status.enum.ts
│       ├── job-type.enum.ts
│       ├── answer-key-change-field.enum.ts
│       └── reprocess-status.enum.ts
│
├── dispatcher/
│   ├── reprocess-dispatcher.interface.ts  # Token DI + interface
│   ├── cloud-tasks-reprocess-dispatcher.ts
│   └── in-process-reprocess-dispatcher.ts
│
├── services/
│   ├── reprocess.service.ts               # executeReprocess, resolveTargets, stuck-job reclaim
│   ├── reprocess-school-class.service.ts  # UPDATE in-place preservando idStudents
│   ├── reprocess-reconciliation.service.ts # reconcile() — chamado pelo Cloud Scheduler
│   ├── job-subject.service.ts             # Rollup ReportSubject por escola/regional/município
│   ├── job-descriptor.service.ts          # Rollup descritores
│   ├── job-not-evaluated.service.ts       # Rollup não avaliados
│   ├── job-race.service.ts               # Distribuição racial por turma
│   ├── job-question.service.ts            # Dados por questão
│   └── repositories/                     # Queries TypeORM de cada tipo
│
└── worker/
    ├── worker-http.module.ts              # Carregado somente se APP_ROLE=worker
    ├── reprocess-internal.controller.ts   # POST /internal/reprocess/{dispatch,execute,reconcile}
    ├── reprocess-dispatch.service.ts      # handle(): upsertJobLocked + scheduleExecute
    └── dto/
        ├── dispatch-task.dto.ts
        └── execute-task.dto.ts
```
