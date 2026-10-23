# Task Manager — Desafio Técnico Revelatio Studio

Sistema simples de organização de tarefas com backend em **Node.js + Express**, autenticação **JWT**, controle de acesso por perfil (**admin / usuário comum**), upload de anexos e um frontend em HTML + JS puro para testar tudo.

🎥 **Vídeo de apresentação:** _cole aqui o link (Loom / OBS / Clipchamp)_

---

## Como rodar

### Local (Node 20+ e PostgreSQL)

```bash
# 0) Banco PostgreSQL (via Docker). Cria também o banco de testes "taskmanager_test".
docker compose up -d db

# 1) Backend
npm install
npm start                  # API em http://localhost:3000 (cria as tabelas e o admin na 1ª execução)

# 2) Frontend React — escolha uma opção:
cd frontend && npm install
npm run dev                # desenvolvimento: http://localhost:5173 (proxy de /api para a porta 3000)
npm run build              # produção: gera ../public e o Express passa a servir tudo em http://localhost:3000
```

Sem Docker? Use qualquer PostgreSQL e aponte `DATABASE_URL` (veja `.env.example`). Variáveis podem ser carregadas com `node --env-file=.env src/server.js`.

### Docker

```bash
docker compose up --build   # http://localhost:3000
```

Sobe o PostgreSQL e a aplicação juntos. Dados e uploads ficam em volumes (`pg-data`, `app-uploads`).

### Testes automatizados

```bash
npm test     # 17 testes de integração (node:test + supertest) contra o banco "taskmanager_test"
```

Precisa do Postgres no ar (`docker compose up -d db`). Para usar outro banco de teste, defina `TEST_DATABASE_URL`. **Atenção:** as tabelas desse banco são recriadas a cada execução.

### Credenciais

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador (criado automaticamente na 1ª execução) | `admin@example.com` | `admin123` |
| Usuário comum | crie pela aba "Criar conta" | — |

Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `JWT_SECRET` por variável de ambiente (veja `.env.example`).

---

## Stack e decisões técnicas

| Decisão | Motivo |
|---|---|
| **Express 5** | Erros em handlers async chegam ao middleware de erro sem `try/catch` ou wrapper. |
| **PostgreSQL** | Banco relacional padrão de mercado: constraints, FKs com cascade, tipos ENUM e `ILIKE` para a busca. |
| **Sequelize (ORM)** | ORM maduro para Express, em JS puro (sem etapa de geração de código). Models, associações e transações ficam declarados em `src/models`. As tabelas são criadas com `sequelize.sync()` na inicialização — simples para o desafio; em produção eu usaria migrations versionadas. |
| **JWT + bcrypt** | Autenticação stateless simples. Senhas com hash bcrypt; mensagem de erro única no login (não revela se o e-mail existe). |
| **zod** | Validação declarativa de entrada, com mensagens de erro por campo. |
| **multer (disco)** | Upload multipart. Arquivos salvos com nome aleatório (UUID); o nome original fica no banco. |
| **Frontend React (Vite)** | SPA enxuta em `frontend/`. Em produção o build vai para `public/` e o próprio Express serve, sem segundo servidor nem CORS. |
| **Docker** | Item opcional do desafio. Build multi-stage (front + API) para rodar com um comando, sem depender da versão local do Node. O `docker-compose.yml` sobe também o PostgreSQL, com healthcheck para a API só iniciar quando o banco estiver pronto. |

### Arquitetura

Organização por módulo, em camadas com responsabilidades bem separadas:

```
src/
├── app.js / server.js        # montagem do Express / bootstrap
├── config.js                 # variáveis de ambiente em um só lugar
├── db/index.js               # conexão Sequelize/PostgreSQL
├── models/                   # User, Task, Attachment, associações, initDatabase + seed do admin
├── middlewares/
│   ├── auth.js               # authenticate (JWT) + requireRole
│   ├── validate.js           # valida body/query com zod
│   ├── upload.js             # multer: tipos permitidos, limites, nomes seguros
│   └── error.js              # tratamento central de erros (+ limpeza de arquivos órfãos)
├── modules/
│   ├── auth/                 # register, login, me
│   ├── users/                # listagem (admin)
│   └── tasks/
│       ├── tasks.routes.js       # HTTP: rotas e ordem dos middlewares
│       ├── tasks.schemas.js      # contratos de entrada
│       ├── tasks.service.js      # regras de negócio e autorização
│       ├── tasks.repository.js   # acesso a dados (Sequelize)
│       └── attachments.routes.js # download/preview autenticado
└── utils/                    # HttpError, parseId, helpers de arquivo

frontend/                     # React + Vite
├── src/api.js                # cliente HTTP (token, erros, blob de anexos)
├── src/auth.jsx              # contexto de autenticação
├── src/pages/                # LoginPage, TasksPage
└── src/components/           # TaskCard, TaskFormModal, PreviewModal
```

Fluxo de uma requisição: `route → authenticate → (upload) → validate → service → repository`.

### Modelagem de dados

```
users (id, name, email UNIQUE, password_hash, role[user|admin], created_at, updated_at)
  └─< tasks (id, title, description, due_date DATE, status[pending|in_progress|done],
             priority[low|medium|high], user_id FK, created_at, updated_at)
        └─< attachments (id, task_id FK, original_name, stored_name, mime_type, size, created_at)
```

- `ON DELETE CASCADE` em `tasks → attachments`; o service também remove os arquivos físicos.
- Índices em `tasks.user_id`, `tasks.status` e `attachments.task_id`.
- Tipos `ENUM` do PostgreSQL garantem valores válidos de `role`, `status` e `priority` direto no banco.
- `due_date` é do tipo `DATE` (sem fuso), então o prazo nunca "anda um dia"; datas inexistentes como `2026-02-31` são rejeitadas na validação.

### Controle de acesso (RBAC)

A regra fica **centralizada no service** (`getAuthorizedTask`), não espalhada pelas rotas:

| Ação | Usuário comum | Admin |
|---|---|---|
| Criar tarefa | ✅ | ✅ |
| Listar | apenas as próprias | todas (filtro opcional `?userId=`) |
| Ver / editar / remover | apenas as próprias | qualquer uma |
| Baixar anexo | apenas de tarefas próprias | qualquer um |
| Listar usuários (`/api/users`) | ❌ 403 | ✅ |

Pontos de segurança:

- O **perfil nunca vem do cliente**: o auto-cadastro sempre cria `user`, mesmo que o body envie `role: "admin"` (coberto por teste).
- O middleware `authenticate` **busca o usuário no banco a cada requisição**, então mudanças de perfil/remoção valem imediatamente, sem esperar o token expirar.
- Anexos **não são servidos como arquivos estáticos**: passam por `/api/attachments/:id`, que exige token e checa o dono.
- Upload limitado a 5MB por arquivo e 5 arquivos por requisição, com lista de MIME permitidos (imagens, PDF, TXT, DOC/DOCX), `X-Content-Type-Options: nosniff` e nome em disco aleatório (evita colisão e path traversal).
- Se uma requisição falha após o upload (validação, 403, 404…), os arquivos recém-gravados são removidos — não sobram órfãos.
- Acesso a tarefa alheia retorna **403** (e 404 só quando a tarefa não existe).

---

## API

Todas as rotas (exceto `register`/`login`) exigem `Authorization: Bearer <token>`.
Rotas com upload aceitam `multipart/form-data` (campo `files`, múltiplos); as demais aceitam JSON.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | `{name, email, password}` → `{token, user}` |
| POST | `/api/auth/login` | `{email, password}` → `{token, user}` |
| GET | `/api/auth/me` | Usuário autenticado |
| GET | `/api/tasks` | Lista. Filtros: `status`, `priority`, `q` (busca em título/descrição), `userId` (só admin) |
| POST | `/api/tasks` | Cria (`title` obrigatório; `description`, `dueDate`, `status`, `priority`, `files`) |
| GET | `/api/tasks/:id` | Detalhe |
| PUT | `/api/tasks/:id` | Edição parcial; também aceita novos `files` |
| PATCH | `/api/tasks/:id/complete` | Marca como concluída |
| DELETE | `/api/tasks/:id` | Remove a tarefa e seus arquivos |
| POST | `/api/tasks/:id/attachments` | Adiciona anexos |
| DELETE | `/api/tasks/:id/attachments/:attachmentId` | Remove um anexo |
| GET | `/api/attachments/:id` | Download/preview autenticado |
| GET | `/api/users` | Lista usuários (**admin**) |
| GET | `/api/health` | Healthcheck |

Erros seguem o formato `{ "message": "...", "details": [{ "field": "title", "message": "..." }] }` com status HTTP adequado (400, 401, 403, 404, 409, 413).

Exemplo rápido:

```bash
TOKEN=$(curl -s localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}' | jq -r .token)

curl -s localhost:3000/api/tasks -H "Authorization: Bearer $TOKEN" \
  -F title="Minha tarefa" -F dueDate=2026-12-31 -F priority=high -F files=@foto.png
```

---

## Frontend

SPA em React (Vite) na pasta `frontend/`. Após `npm run build`, os arquivos vão para `public/` e são servidos pelo Express em `/`. Oferece:

- login e cadastro
- criar, editar, concluir e excluir tarefas
- upload de múltiplos anexos, remoção de anexos e **preview** (imagem, PDF, TXT; demais tipos viram download)
- **filtros** por status, prioridade, busca textual e (admin) por usuário
- indicação de tarefas **atrasadas**
- visão de admin com o nome do dono em cada tarefa

---

## Uso de IA

> ⚠️ **Edite esta seção para refletir exatamente o que você fez.** Abaixo está um rascunho.

- **Ferramenta:** Claude (Anthropic).
- **Onde foi usada:** estrutura inicial do projeto, implementação das camadas do backend, escrita dos testes de integração, geração do frontend React (`frontend/`), Dockerfile e rascunho deste README.
- **Como ajudou:** acelerou o scaffolding e a escrita de código repetitivo (validações, CRUD, testes), além de servir de apoio para discutir decisões (onde centralizar a regra de autorização, como evitar arquivos órfãos).
- **O que eu fiz/revisei:** _descreva aqui: leitura e revisão do código, ajustes, decisões que você tomou, o que testou manualmente._

---

## O que eu faria com mais tempo

- Refresh tokens / cookies `httpOnly` e rate limiting no login
- Paginação e ordenação configurável na listagem
- Migrations versionadas (ex.: sequelize-cli/umzug ou Prisma) no lugar do `sync()`
- Armazenamento de anexos em S3 compatível, com validação do conteúdo real do arquivo (magic bytes)
- Documentação OpenAPI/Swagger e pipeline de CI
- Gestão de usuários pelo admin (promover/desativar)
