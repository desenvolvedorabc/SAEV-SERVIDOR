# Módulo de IA - SAEVIA

## Visão Geral

O módulo de IA implementa a **SAEVIA** (Assistente de IA do SAEV), uma assistente especializada em análise de dados educacionais. A SAEVIA analisa os dados do relatório de Síntese Geral e responde perguntas do usuário sobre o desempenho educacional.

### Pilares de Funcionamento

A SAEVIA opera com base em três pilares fundamentais:

1. **Foco em Interpretação de Dados**: A IA analisa exclusivamente os dados fornecidos, identificando padrões, comparando entidades e descrevendo o cenário educacional sem inventar informações.

2. **Linguagem Educacional**: Utiliza terminologia adequada ao contexto educacional brasileiro, com clareza e objetividade para gestores e educadores.

3. **Sem Sugestões Pedagógicas Avançadas**: A SAEVIA NÃO fornece recomendações de intervenção pedagógica, estratégias de ensino ou planos de ação. Seu papel é interpretar e apresentar os dados, deixando as decisões pedagógicas para os profissionais da educação.

## Arquitetura

O módulo utiliza o padrão **Adapter** para permitir troca fácil de provedores de IA no futuro.

```
src/modules/ai/
├── adapters/
│   ├── openai.adapter.ts       # Implementação OpenAI
│   └── ai-provider.factory.ts  # Factory para criar adapters
├── controller/
│   └── ai.controller.ts        # Endpoints REST
├── service/
│   └── ai-analysis.service.ts  # Lógica de negócio
├── model/
│   ├── dto/
│   │   ├── chat-request.dto.ts     # DTO da requisição
│   │   ├── chat-message.dto.ts     # DTO das mensagens
│   │   └── report-context.dto.ts   # DTO do contexto do relatório
│   ├── interface/
│   │   ├── ai-provider.interface.ts    # Interface do adapter
│   │   └── report-context.interface.ts # Interfaces TypeScript
│   └── enum/
│       └── ai-provider.enum.ts     # Enum de provedores
└── utils/
    ├── sanitize.util.ts        # Sanitização contra prompt injection
    └── prompt-builder.util.ts  # Construção do prompt do sistema
```

## Configuração

### Variáveis de Ambiente

Adicione no arquivo `.env`:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

### Configuração do Modelo

A configuração padrão está em `ai-analysis.service.ts`:

```typescript
const DEFAULT_CONFIG = {
  provider: AiProviderEnum.OPENAI,
  model: 'gpt-4o-mini',      // Modelo da OpenAI
  temperature: 0.2,          // Baixo = mais determinístico, menos alucinações
  maxTokens: 4000,           // Máximo de tokens na resposta
}
```

#### Temperatura

| Valor | Comportamento | Recomendação |
|-------|---------------|--------------|
| 0.0 - 0.2 | Determinístico, respostas consistentes | **Recomendado para análise de dados** |
| 0.3 - 0.5 | Balanceado | Uso geral |
| 0.6 - 1.0 | Criativo, respostas variadas | Não recomendado para dados |

## Endpoints

### POST `/v1/ai/chat`

Endpoint com resposta em streaming (text/plain com chunked transfer encoding).

## DTO de Requisição

### ChatRequestDto

```typescript
{
  "messages": ChatMessageDto[],  // Histórico de mensagens
  "context": ReportContextDto    // Contexto do relatório (opcional)
}
```

### ChatMessageDto

```typescript
{
  "role": "user" | "assistant",  // Papel da mensagem
  "content": string              // Conteúdo da mensagem (max 5000 chars)
}
```

### ReportContextDto

O contexto do relatório contém todos os dados necessários para a IA analisar:

```typescript
{
  // Filtros aplicados
  "serie": {
    "SER_NOME": string,      // Nome da série (ex: "1º Ano")
    "SER_NUMBER": number     // Número da série (opcional)
  },
  "year": {
    "name": string           // Ano letivo (ex: "2024")
  },
  "edition": {
    "name": string           // Edição da avaliação (ex: "1ª Avaliação")
  },

  // Localização (hierarquia dos filtros)
  "state": { "name": string },              // Estado
  "stateRegional": { "name": string },      // Regional do Estado (opcional)
  "county": { "name": string },             // Município
  "countyRegional": { "name": string },     // Regional do Município (opcional)
  "school": { "name": string },             // Escola
  "schoolClass": { "name": string },        // Turma

  // Breadcrumb dos filtros
  "breadcrumb": [
    { "label": string, "name": string }
  ],

  // Dados por disciplina (todas as disciplinas são enviadas)
  "items": ReportItemDto[]
}
```

### ReportItemDto (Dados por Disciplina)

```typescript
{
  "id": number,
  "subject": string,           // Nome da disciplina
  "type": string,              // Tipo (opcional)
  "typeSubject": string,       // "Leitura" ou "Objetiva" - IMPORTANTE!
  "level": string,             // Nível hierárquico dos sub-items
  "avg": number,               // Média geral (não aplicável para Leitura)
  "min": number,               // Mínimo
  "max": number,               // Máximo

  // Sub-items (regionais, escolas, turmas, etc.)
  "items": ReportSubItemDto[],

  // Lista de alunos (quando no nível de turma)
  "students": StudentDto[],

  // Dados do gráfico de leitura
  "dataGraph": DataGraphDto,

  // Informações de questões/descritores
  "quests": QuestsInfoDto
}
```

#### Campo `typeSubject`

O campo `typeSubject` determina como os dados são tratados:

| Valor | Descrição | Cálculo de Média |
|-------|-----------|------------------|
| `"Leitura"` | Dados categóricos (níveis de fluência) | Não há média numérica |
| `"Objetiva"` | Dados percentuais (Português, Matemática, etc.) | `totalGradesStudents / countPresentStudents` |

### QuestsInfoDto (Questões e Descritores)

Contém as informações sobre as questões da avaliação e seus descritores:

```typescript
{
  "total": number,           // Total de questões
  "descriptors": [           // Lista de descritores
    {
      "id": number,
      "TEG_ORDEM": number,   // Índice da questão (começa em 0!)
      "cod": string,         // Código do descritor (ex: "P005", "M012")
      "description": string  // Descrição da habilidade avaliada
    }
  ]
}
```

**Importante:** O campo `TEG_ORDEM` começa em **0**, então:
- `TEG_ORDEM: 0` = Questão 1
- `TEG_ORDEM: 1` = Questão 2
- etc.

### StudentDto (Dados de Aluno)

Quando no nível de turma, contém os dados individuais de cada aluno:

```typescript
{
  "id": number,
  "name": string,
  "avg": number,             // Média do aluno (não para Leitura)
  "type": string,            // Nível de leitura (para typeSubject="Leitura")
  "quests": [                // Respostas do aluno por questão
    {
      "id": number,          // ID único da resposta
      "letter": string,      // Alternativa marcada (A, B, C, D)
      "type": "right" | "wrong",  // Se acertou ou errou
      "questionId": number   // ID do descritor (relaciona com descriptors.id)
    }
  ]
}
```

### ReportSubItemDto (Dados Hierárquicos)

Representa os dados de cada entidade dentro do nível atual (regionais, municípios, escolas, turmas):

```typescript
{
  "id": number,
  "name": string,              // Nome da entidade
  "value": number,             // Percentual de desempenho (não para Leitura)
  "type": string,              // Tipo (opcional)

  // Participação e cálculo de média
  "countTotalStudents": number,    // Total de alunos matriculados
  "countPresentStudents": number,  // Total de alunos avaliados
  "totalGradesStudents": number,   // Soma das notas (para cálculo de média)

  // Dados de Leitura (quando typeSubject="Leitura")
  "fluente": number,
  "nao_fluente": number,
  "frases": number,
  "palavras": number,
  "silabas": number,
  "nao_leitor": number,
  "nao_avaliado": number,
  "nao_informado": number
}
```

#### Cálculo de Média para Disciplinas Objetivas

```
Média = totalGradesStudents / countPresentStudents
```

#### Formato de Saída no Prompt

```
1. Afonso Cláudio: 75.5% | Avaliados: 258/261
2. Domingos Martins: 72.3% | Avaliados: 312/320
```

## Hierarquia dos Dados

A IA entende a hierarquia dos dados do SAEV:

```
Estado
  └── Regionais do Estado
        └── Municípios
              └── Regionais do Município
                    └── Escolas
                          └── Turmas
                                └── Alunos
```

### Campo `level`

O campo `level` em `ReportItemDto` indica qual nível de dados está sendo listado em `items`:

| level | Descrição | items contém |
|-------|-----------|--------------|
| `regional` | Filtrando por Estado | Lista de Regionais do Estado |
| `county` | Filtrando por Regional do Estado | Lista de Municípios |
| `regionalSchool` | Filtrando por Município | Lista de Regionais do Município |
| `school` | Filtrando por Regional do Município | Lista de Escolas |
| `schoolClass` | Filtrando por Escola | Lista de Turmas |

### Formatação Visual Aprimorada

**IMPORTANTE**: A formatação dos dados hierárquicos foi otimizada para evitar alucinações quando há muitas entidades (ex: 115 municípios).

#### Problema Anterior

Quando havia listas extensas (100+ municípios), a IA:
- Se perdia na quantidade de dados
- Confundia dados de diferentes entidades
- Inventava números que não existiam nos dados

**Exemplo de erro**: Perguntando sobre "Domingos Martins", a IA inventava dados completamente errados, mesmo estando corretos no prompt.

#### Solução Implementada

Cada entidade agora tem **marcadores visuais claros**:

```
📊 LISTAGEM DE MUNICÍPIOS DA REGIONAL DO ESTADO (115 municípios):
   [Estes são os dados que você pode comparar entre si]

   ▸ [#71] Domingos Martins: 72.9% | Avaliados: 387/403

   ▸ [#72] Dores do Rio Preto: 85.6% | Avaliados: 105/105
```

**Benefícios**:
- ✅ Marcador `▸ [#número]` separa visualmente cada entidade
- ✅ Quebra de linha antes de cada item facilita localização
- ✅ Número de posição ajuda a navegar em listas longas
- ✅ Nome completo em destaque evita confusões

#### Instruções para a IA

O prompt inclui instruções específicas:

```
PROCEDIMENTO OBRIGATÓRIO ao responder sobre uma entidade específica:
1. Identifique a disciplina sendo perguntada
2. Procure na LISTAGEM dessa disciplina pelo marcador ▸ seguido do NOME EXATO
3. Leia APENAS os dados dessa linha específica
4. NUNCA misture dados de outras entidades
5. Se não encontrar o NOME EXATO, a entidade NÃO está nos dados
```

## Tratamento de Dados de Leitura

Dados de **Leitura** (`typeSubject: "Leitura"`) são tratados de forma especial:

- **Não possuem média numérica** - são dados categóricos
- Mostram **distribuição por nível de fluência**
- Comparações são feitas por **quantidade de alunos** em cada nível
- Valores **0 são incluídos** para que a IA saiba que não há alunos naquela categoria

### Níveis de Leitura

| Nível | Descrição |
|-------|-----------|
| Fluente | Leitura fluida com boa compreensão |
| Não Fluente | Lê com dificuldades na fluência |
| Frases | Lê frases simples |
| Palavras | Lê palavras isoladas |
| Sílabas | Reconhece sílabas |
| Não Leitor | Não alfabetizado |
| Não Avaliado | Presente mas não avaliado |
| Não Informado | Sem registro |

## Níveis de Desempenho

Para disciplinas objetivas (`typeSubject: "Objetiva"`):

| Nível | Faixa | Descrição |
|-------|-------|-----------|
| Maior Desempenho | 75-100% | Domínio satisfatório ou pleno |
| Desempenho Mediano | 50-74% | Domínio parcial |
| Abaixo da Média | 25-49% | Domínio insuficiente |
| Menor Desempenho | 0-24% | Lacunas significativas |

## Questões e Descritores

No nível de turma/alunos, a IA recebe informações sobre as questões da avaliação:

### Formato no Prompt

```
QUESTÕES E DESCRITORES (20 questões):
  Questão 1: [P005] P005 - Distinguir as letras do alfabeto de outros sinais gráficos
  Questão 2: [P068] P068 - Identificar fonemas e sua representação por letras.
  ...

ÍNDICE DE DESCRITORES:
[Use esta lista para localizar rapidamente quais questões pertencem a cada descritor]
  M044: Questões 1, 7
    Comparar ou ordenar o objeto/pessoa/animal por meio dos atributos de tamanho...
  P005: Questões 1
    Distinguir as letras do alfabeto de outros sinais gráficos
  P068: Questões 2, 12
    Identificar fonemas e sua representação por letras.
  ...

RESPOSTAS POR QUESTÃO:
  Questão 1: 92.3% acertos (12/13) - Respostas: A:12 | B:1
  Questão 2: 84.6% acertos (11/13) - Respostas: B:2 | C:11
  ...
```

### Índice de Descritores

**IMPORTANTE**: O "Índice de Descritores" é essencial para responder perguntas sobre descritores específicos.

#### Problema Anterior

Quando o usuário perguntava "Qual a resposta do aluno Miguel no descritor M044?", a IA precisava:
1. Encontrar quais questões tinham o descritor M044
2. Procurar as respostas do Miguel nessas questões

Sem o índice, a IA tinha dificuldade em fazer essa correlação e às vezes respondia incorretamente que o aluno não tinha respondido.

#### Solução com Índice

O índice agrupa as questões por descritor, facilitando essa busca:

```
ÍNDICE DE DESCRITORES:
  M044: Questões 1, 7
    Comparar ou ordenar o objeto/pessoa/animal...
```

**Processo para responder "Qual a resposta do Miguel no M044?":**
1. Consulta o índice → M044 está nas Questões 1 e 7
2. Busca Miguel na listagem completa de alunos
3. Encontra as respostas: Q1:D✓ | Q7:C✓
4. Responde: "Miguel respondeu D (acertou) na Questão 1 e C (acertou) na Questão 7 do descritor M044"

### Perguntas Suportadas

- "Qual o descritor da questão 1?" → Responde para **todas** as disciplinas
- "Qual o descritor da questão 1 de Português?" → Responde **apenas** para Português
- "Quantos alunos marcaram A na questão 1?"
- "Qual questão teve mais erros?"
- "Qual o código da questão 5 de Matemática?"
- ✅ **"Qual a resposta do aluno João no descritor M044?"** → Usa o índice para encontrar as questões
- ✅ **"Quantos alunos acertaram o descritor P005?"** → Usa o índice + respostas por questão

## Listagem Completa de Alunos

**IMPORTANTE**: O prompt agora inclui uma **listagem completa de TODOS os alunos** com todas as informações, resolvendo o problema de perguntas sobre alunos específicos.

### Problema Anterior

Antes, o prompt mostrava apenas os **top 5** e **bottom 5** alunos. Isso causava problemas:
- Se perguntasse sobre um aluno fora dessas listas, a IA não tinha os dados
- Se perguntasse sobre um aluno em uma disciplina específica (ex: "nota de João em Português"), mas ele só aparecia na lista de outra disciplina, a resposta vinha errada

### Solução Implementada

Agora o prompt inclui uma seção **"LISTAGEM COMPLETA DE TODOS OS ALUNOS"** para cada disciplina com:

#### Para Disciplinas Objetivas (Português, Matemática, etc.)

```
=== LISTAGEM COMPLETA DE TODOS OS ALUNOS (25 alunos) ===
[Use esta lista para responder perguntas sobre qualquer aluno específico]

1. Ana Silva - Média: 85.5%
   Respostas: Q1:A✓ | Q2:C✓ | Q3:B✗ | Q4:D✓ | Q5:A✓ | ...

2. Bruno Santos - Média: 72.3%
   Respostas: Q1:A✓ | Q2:B✗ | Q3:C✓ | Q4:D✓ | Q5:B✗ | ...

...
```

**Formato das Respostas**:
- `Q1:A✓` = Questão 1, marcou alternativa A, **acertou**
- `Q3:B✗` = Questão 3, marcou alternativa B, **errou**
- `Q5:-` = Questão 5, **não respondeu** (deixou em branco)
- `Status: AUSENTE (não fez a prova)` = Aluno não compareceu à avaliação

**Casos Especiais**:
- **Aluno ausente** (APENAS disciplinas objetivas): Quando `quests` está vazio, o aluno é marcado como "AUSENTE (não fez a prova)"
- **Questão não respondida**: Quando `letter = "-"`, significa que o aluno fez a prova mas deixou aquela questão em branco

**⚠️ IMPORTANTE**: Diferença entre Leitura e Disciplinas Objetivas:

| Aspecto | Leitura | Disciplinas Objetivas |
|---------|---------|----------------------|
| Dados do aluno | Apenas `type` (nível de leitura) | `avg` (média) + `quests` (respostas) |
| Array `quests` | **NÃO existe** | Existe com as respostas |
| Status AUSENTE | **Não se aplica** | Aplicável quando `quests` vazio |
| Formato | `Nível de Leitura: Fluente` | `Média: 85.5%` + Respostas |

#### Para Disciplina de Leitura

```
=== LISTAGEM COMPLETA DE TODOS OS ALUNOS (25 alunos) ===
[Use esta lista para responder perguntas sobre qualquer aluno específico]

1. Ana Silva
   Nível de Leitura: Fluente

2. Bruno Santos
   Nível de Leitura: Não Fluente

...
```

### Perguntas Agora Suportadas

Com a listagem completa, a IA pode responder:

- ✅ "Qual a nota do aluno João Silva em Português?"
- ✅ "O que a aluna Maria marcou na questão 3?"
- ✅ "Quantos acertos teve o aluno Pedro em Matemática?"
- ✅ "Qual o nível de leitura da aluna Ana?"
- ✅ "Quais questões o aluno Carlos errou em Português?"

### Comportamento Multi-Disciplina

- **Com disciplina especificada**: "Qual a nota de João em Português?" → Procura apenas em Português
- **Sem disciplina especificada**: "Qual a nota de João?" → Procura em **TODAS** as disciplinas e responde todas

## Segurança

### Sanitização

O módulo implementa sanitização contra **prompt injection**:

- Remove padrões maliciosos de texto
- Limita tamanho dos campos (MAX_STRING_LENGTH: 1000)
- Limita profundidade de objetos (MAX_NESTED_DEPTH: 10)
- Limita tamanho de arrays (MAX_ARRAY_SIZE: 500)
- Escapa caracteres especiais

### Verificação Rigorosa

A IA segue diretrizes para evitar alucinações:

- SEMPRE relê os dados antes de responder
- NUNCA inventa dados que não estão no contexto
- NÃO se deixa induzir ao erro pelo usuário
- Mantém a resposta mesmo se questionada ("tem certeza?")

### Validação

Todos os DTOs são validados com `class-validator`:

- Tipos de dados corretos
- Tamanhos máximos de string
- Estrutura de objetos aninhados
- Transformação automática de string para number

## Exemplo de Integração (Frontend)

### Chamada com Streaming

```typescript
const response = await fetch('/v1/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Compare o desempenho das regionais' }
    ],
    context: {
      serie: { SER_NOME: '5º Ano' },
      year: { name: '2024' },
      edition: { name: '1ª Avaliação' },
      state: { name: 'Ceará' },
      items: [
        {
          id: 1,
          subject: 'Matemática',
          typeSubject: 'Objetiva',
          avg: 65.5,
          level: 'regional',
          items: [
            {
              id: 1,
              name: 'Regional Norte',
              totalGradesStudents: 7020,
              countPresentStudents: 100,
              countTotalStudents: 105
            },
            {
              id: 2,
              name: 'Regional Sul',
              totalGradesStudents: 6210,
              countPresentStudents: 100,
              countTotalStudents: 102
            }
          ]
        }
      ]
    }
  })
});

// Ler streaming
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  // Processar chunk de texto
  console.log(chunk);
}
```

## Exemplos de Perguntas Suportadas

### Disciplinas Objetivas (Português, Matemática)

- "Qual é a média geral de Matemática?"
- "Compare o desempenho das regionais"
- "Quais escolas estão abaixo da média?"
- "Qual turma tem o melhor desempenho em Português?"
- "Analise a amplitude de desempenho entre as escolas"

### Leitura

- "Como está a distribuição de leitura nas turmas?"
- "Qual escola tem mais alunos fluentes?"
- "Quantos alunos são não leitores?"
- "Compare a fluência entre as regionais"

### Questões e Descritores

- "Qual o descritor da questão 1?"
- "Qual o código da questão 5 de Matemática?"
- "Quantos alunos marcaram A na questão 1?"
- "Qual questão teve mais erros?"
- "Quais descritores estão sendo avaliados?"

### Análises Gerais

- "Quais são os pontos de atenção deste relatório?"
- "Faça um resumo do desempenho geral"
- "Compare o desempenho entre Português e Matemática"
