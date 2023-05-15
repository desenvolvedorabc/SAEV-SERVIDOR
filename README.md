<h1 align="center">SAEV</h1>

## 🛠 Tecnologias

As seguintes ferramentas foram usadas na construção do projeto:  

- [NodeJs](https://nodejs.org/en/)
- [TypeScript](https://www.typescriptlang.org/)
- [TypeOrm](https://typeorm.io/#/)
- [MySql](https://www.mysql.com/)
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
