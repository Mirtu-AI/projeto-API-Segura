# API Biblioteca

> API segura com autenticação JWT e autorização por perfil (ADMIN / Leitor)

## Descrição

API RESTful para gerenciamento de uma biblioteca, com dois recursos principais:

- **Livros** — acervo cadastrado pelo ADMIN
- **Empréstimos** — criados pelo leitor (USER) ao retirar um livro; cada leitor só vê os seus próprios empréstimos

A autenticação é feita via **JWT** (Bearer Token). A autorização segue dois critérios:

| Critério | Descrição |
|---|---|
| **Por perfil** | Algumas rotas exigem o papel `ADMIN` |
| **Por dono** | Leitor só acessa / altera os seus próprios empréstimos |

---

## Regras de Acesso

| Recurso | Rota | Perfil |
|---|---|---|
| Livros | `GET /livros` e `GET /livros/:id` | Pública (sem token) |
| Livros | `POST`, `PUT`, `DELETE /livros` | Somente `ADMIN` |
| Empréstimos | `GET /emprestimos` | Somente `ADMIN` (vê todos) |
| Empréstimos | `GET /emprestimos/meus` | Qualquer usuário logado (vê só os seus) |
| Empréstimos | `GET /emprestimos/:id` | Dono **ou** `ADMIN` |
| Empréstimos | `POST /emprestimos` | Qualquer usuário logado |
| Empréstimos | `PUT` / `DELETE /emprestimos/:id` | Dono **ou** `ADMIN` |
| Auth | `POST /auth/register`, `POST /auth/login` | Pública |
| Auth | `GET /auth/me`, `PATCH /auth/senha` | Logado |
| Users | Todas as rotas `/users` | Somente `ADMIN` |

> **Regra do dono:** o `leitorId` de um empréstimo é sempre extraído do token JWT — nunca do corpo da requisição. O leitor não pode se atribuir um `livroId` ou `leitorId` diferente.

---

## Tecnologias

- **Node.js** com ES Modules (`"type": "module"`)
- **Express 5**
- **Prisma ORM** com **SQLite** (via `better-sqlite3`)
- **bcryptjs** para hash de senhas
- **jsonwebtoken** para tokens JWT
- **dotenv** para variáveis de ambiente
- **express-rate-limit** para proteção contra força bruta no login

---

## Como Rodar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` e defina pelo menos:

```env
JWT_SECRET=sua_chave_secreta_muito_longa_e_aleatoria
```

### 3. Criar o banco e aplicar as migrations

```bash
npx prisma migrate dev --name init_biblioteca
```

### 4. Popular o banco com dados de exemplo

```bash
npm run seed
```

Isso cria:
- 1 usuário **ADMIN** (`admin@biblioteca.com`)
- 2 leitores: **Ana** (`ana@biblioteca.com`) e **Bruno** (`bruno@biblioteca.com`)
- 5 livros no acervo
- 5 empréstimos distribuídos entre os usuários

> Senha de todos os usuários de teste: `Senha123`

### 5. Iniciar o servidor em modo de desenvolvimento

```bash
npm run dev
```

O servidor sobe em `http://localhost:3000` por padrão.

---

## Tabela de Rotas Completa

### Autenticação (`/auth`)

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `POST` | `/auth/register` | Pública | Registra novo leitor |
| `POST` | `/auth/login` | Pública | Login; retorna JWT |
| `GET` | `/auth/me` | Logado | Dados do usuário atual |
| `PATCH` | `/auth/senha` | Logado | Troca senha |

### Livros (`/livros`)

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `GET` | `/livros` | Pública | Lista todos os livros |
| `GET` | `/livros/:id` | Pública | Busca livro por ID |
| `POST` | `/livros` | ADMIN | Cadastra novo livro |
| `PUT` | `/livros/:id` | ADMIN | Atualiza livro |
| `DELETE` | `/livros/:id` | ADMIN | Remove livro |

**Corpo para `POST` / `PUT`:**

```json
{
  "titulo": "Dom Casmurro",
  "autor": "Machado de Assis",
  "isbn": "9788520916535"
}
```

> `isbn` é opcional e único. `titulo` e `autor` são obrigatórios no `POST`.

### Empréstimos (`/emprestimos`)

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `GET` | `/emprestimos` | ADMIN | Lista todos os empréstimos |
| `GET` | `/emprestimos/meus` | Logado | Lista empréstimos do leitor logado |
| `GET` | `/emprestimos/:id` | Dono ou ADMIN | Busca empréstimo por ID |
| `POST` | `/emprestimos` | Logado | Cria empréstimo (retira livro) |
| `PUT` | `/emprestimos/:id` | Dono ou ADMIN | Atualiza (ex: registra devolução) |
| `DELETE` | `/emprestimos/:id` | Dono ou ADMIN | Remove empréstimo |

**Corpo para `POST`:**

```json
{
  "livroId": 1
}
```

**Corpo para `PUT` (parcial):**

```json
{
  "dataDevolucao": "2026-11-20T00:00:00.000Z",
  "devolvido": true
}
```

> `leitorId` e `livroId` nunca são aceitos no `PUT` — o dono e o livro de um empréstimo não mudam após a criação.

### Usuários (`/users`)

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `GET` | `/users` | ADMIN | Lista todos os usuários |
| `PATCH` | `/users/:id/role` | ADMIN | Altera papel de um usuário |

---

## Estrutura do Projeto

```
receitas/
├── prisma/
│   ├── schema.prisma       # Modelos: User, Livro, Emprestimo
│   ├── seed.js             # Dados iniciais de exemplo
│   └── migrations/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── livroController.js
│   │   ├── emprestimoController.js
│   │   └── userController.js
│   ├── middlewares/
│   │   ├── autenticar.js   # Verifica JWT
│   │   ├── autorizar.js    # Verifica papel (ADMIN / USER)
│   │   ├── erros.js        # Handlers de erro global
│   │   └── limitarLogin.js # Rate limit para /auth/login
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── livroRoutes.js
│   │   ├── emprestimoRoutes.js
│   │   └── userRoutes.js
│   ├── lib/
│   │   ├── jwt.js
│   │   └── prisma.js
│   ├── app.js
│   └── server.js
├── generated/prisma/       # Gerado pelo Prisma (não editar)
├── requests.http           # Exemplos de requisições (REST Client)
├── .env.example
└── package.json
```

---

## Modelos do Banco de Dados

### `User`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | Int (PK) | Identificador único |
| `nome` | String | Nome do leitor |
| `email` | String (único) | E-mail de login |
| `password` | String | Hash bcrypt da senha |
| `role` | Enum | `USER` (leitor) ou `ADMIN` |
| `criadoEm` | DateTime | Data de criação |

### `Livro`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | Int (PK) | Identificador único |
| `titulo` | String | Título do livro |
| `autor` | String | Nome do autor |
| `isbn` | String? (único) | ISBN (opcional) |
| `criadoEm` | DateTime | Data de cadastro |

### `Emprestimo`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | Int (PK) | Identificador único |
| `leitorId` | Int (FK) | Referência ao `User` dono |
| `livroId` | Int (FK) | Referência ao `Livro` |
| `dataEmprestimo` | DateTime | Data de retirada (default: agora) |
| `dataDevolucao` | DateTime? | Data prevista de devolução |
| `devolvido` | Boolean | Se já foi devolvido (default: false) |
| `criadoEm` | DateTime | Data de criação do registro |
| `atualizadoEm` | DateTime | Última atualização (auto) |
