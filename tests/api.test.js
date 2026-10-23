const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// A config é lida no require, então o ambiente de teste é definido antes de importar o app.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taskmanager-test-'));
// Banco de TESTE separado: as tabelas são recriadas a cada execução (sync force),
// por isso nunca usamos o DATABASE_URL de desenvolvimento aqui.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/taskmanager_test';
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.ADMIN_PASSWORD = 'admin123';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, initDatabase } = require('../src/models');

const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function register(name, email) {
  const res = await request(app).post('/api/auth/register').send({ name, email, password: '123456' });
  assert.equal(res.status, 201);
  return res.body.token;
}

describe('Task Manager API', () => {
  let adminToken, aliceToken, bobToken;

  before(async () => {
    await initDatabase({ force: true });
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'admin123' });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, 'admin');
    adminToken = res.body.token;
    aliceToken = await register('Alice', 'alice@test.com');
    bobToken = await register('Bob', 'bob@test.com');
  });

  after(async () => {
    await sequelize.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  describe('autenticação', () => {
    test('rejeita requisição sem token', async () => {
      const res = await request(app).get('/api/tasks');
      assert.equal(res.status, 401);
    });

    test('rejeita credenciais inválidas', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'alice@test.com', password: 'errada' });
      assert.equal(res.status, 401);
    });

    test('não permite e-mail duplicado', async () => {
      const res = await request(app).post('/api/auth/register').send({ name: 'Alice 2', email: 'ALICE@test.com', password: '123456' });
      assert.equal(res.status, 409);
    });

    test('auto-cadastro nunca cria admin, mesmo enviando role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Mallory', email: 'mallory@test.com', password: '123456', role: 'admin' });
      assert.equal(res.status, 201);
      assert.equal(res.body.user.role, 'user');
    });
  });

  describe('tarefas', () => {
    let taskId;

    test('valida dados na criação', async () => {
      const res = await request(app).post('/api/tasks').set(auth(aliceToken)).send({ description: 'sem título' });
      assert.equal(res.status, 400);
      assert.ok(res.body.details.some((d) => d.field === 'title'));
    });

    test('rejeita data inexistente e marca tarefa atrasada', async () => {
      const invalid = await request(app).post('/api/tasks').set(auth(aliceToken)).send({ title: 'x', dueDate: '2026-02-31' });
      assert.equal(invalid.status, 400);

      const late = await request(app).post('/api/tasks').set(auth(aliceToken)).send({ title: 'Atrasada', dueDate: '2020-01-01' });
      assert.equal(late.status, 201);
      assert.equal(late.body.dueDate, '2020-01-01');
      assert.equal(late.body.isOverdue, true);
      await request(app).delete(`/api/tasks/${late.body.id}`).set(auth(aliceToken)); // mantém a contagem dos demais testes
    });

    test('cria tarefa com anexo (multipart)', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set(auth(aliceToken))
        .field('title', 'Estudar Express')
        .field('description', 'Ler a documentação')
        .field('dueDate', '2099-12-31')
        .field('priority', 'high')
        .attach('files', Buffer.from('conteudo do anexo'), { filename: 'nota.txt', contentType: 'text/plain' });

      assert.equal(res.status, 201);
      assert.equal(res.body.status, 'pending');
      assert.equal(res.body.priority, 'high');
      assert.equal(res.body.attachments.length, 1);
      assert.equal(res.body.attachments[0].originalName, 'nota.txt');
      taskId = res.body.id;
    });

    test('rejeita tipo de arquivo não permitido e não deixa arquivo órfão', async () => {
      const before = fs.readdirSync(process.env.UPLOAD_DIR).length;
      const res = await request(app)
        .post('/api/tasks')
        .set(auth(aliceToken))
        .field('title', 'Com exe')
        .attach('files', Buffer.from('MZ'), { filename: 'virus.exe', contentType: 'application/x-msdownload' });
      assert.equal(res.status, 400);
      assert.equal(fs.readdirSync(process.env.UPLOAD_DIR).length, before);
    });

    test('dono lista e baixa o anexo; outro usuário recebe 403', async () => {
      const list = await request(app).get('/api/tasks').set(auth(aliceToken));
      assert.equal(list.body.length, 1);

      const url = list.body[0].attachments[0].url;
      const ok = await request(app).get(url).set(auth(aliceToken));
      assert.equal(ok.status, 200);
      assert.equal(ok.text, 'conteudo do anexo');

      const denied = await request(app).get(url).set(auth(bobToken));
      assert.equal(denied.status, 403);
    });

    test('usuário comum vê apenas as próprias tarefas', async () => {
      const bobList = await request(app).get('/api/tasks').set(auth(bobToken));
      assert.equal(bobList.status, 200);
      assert.equal(bobList.body.length, 0);

      const direct = await request(app).get(`/api/tasks/${taskId}`).set(auth(bobToken));
      assert.equal(direct.status, 403);
    });

    test('usuário comum não edita nem remove tarefa alheia', async () => {
      const put = await request(app).put(`/api/tasks/${taskId}`).set(auth(bobToken)).send({ title: 'hack' });
      assert.equal(put.status, 403);
      const del = await request(app).delete(`/api/tasks/${taskId}`).set(auth(bobToken));
      assert.equal(del.status, 403);
    });

    test('admin vê todas as tarefas e pode filtrar por usuário', async () => {
      await request(app).post('/api/tasks').set(auth(bobToken)).send({ title: 'Tarefa do Bob' });

      const all = await request(app).get('/api/tasks').set(auth(adminToken));
      assert.equal(all.body.length, 2);

      const onlyBob = await request(app).get('/api/tasks?userId=' + all.body.find((t) => t.owner.name === 'Bob').owner.id).set(auth(adminToken));
      assert.equal(onlyBob.body.length, 1);
      assert.equal(onlyBob.body[0].title, 'Tarefa do Bob');
    });

    test('usuário comum não consegue ver tarefas alheias via filtro userId', async () => {
      const all = await request(app).get('/api/tasks').set(auth(adminToken));
      const aliceId = all.body.find((t) => t.owner.name === 'Alice').owner.id;
      const res = await request(app).get(`/api/tasks?userId=${aliceId}`).set(auth(bobToken));
      assert.equal(res.status, 200);
      assert.ok(res.body.every((t) => t.owner.name === 'Bob'));
    });

    test('filtra por status e busca por texto', async () => {
      const byText = await request(app).get('/api/tasks?q=express').set(auth(aliceToken));
      assert.equal(byText.body.length, 1);
      const byStatus = await request(app).get('/api/tasks?status=done').set(auth(aliceToken));
      assert.equal(byStatus.body.length, 0);
    });

    test('dono edita, conclui e admin também edita', async () => {
      const edit = await request(app).put(`/api/tasks/${taskId}`).set(auth(aliceToken)).send({ title: 'Estudar Express 5', status: 'in_progress' });
      assert.equal(edit.status, 200);
      assert.equal(edit.body.title, 'Estudar Express 5');
      assert.equal(edit.body.status, 'in_progress');

      const done = await request(app).patch(`/api/tasks/${taskId}/complete`).set(auth(aliceToken));
      assert.equal(done.body.status, 'done');

      const byAdmin = await request(app).put(`/api/tasks/${taskId}`).set(auth(adminToken)).send({ priority: 'low' });
      assert.equal(byAdmin.status, 200);
      assert.equal(byAdmin.body.priority, 'low');
    });

    test('remover tarefa apaga os arquivos do disco', async () => {
      const filesBefore = fs.readdirSync(process.env.UPLOAD_DIR).length;
      const del = await request(app).delete(`/api/tasks/${taskId}`).set(auth(aliceToken));
      assert.equal(del.status, 204);

      const get = await request(app).get(`/api/tasks/${taskId}`).set(auth(aliceToken));
      assert.equal(get.status, 404);

      await new Promise((r) => setTimeout(r, 100)); // unlink é assíncrono
      assert.equal(fs.readdirSync(process.env.UPLOAD_DIR).length, filesBefore - 1);
    });
  });

  describe('usuários', () => {
    test('somente admin lista usuários', async () => {
      const denied = await request(app).get('/api/users').set(auth(aliceToken));
      assert.equal(denied.status, 403);
      const ok = await request(app).get('/api/users').set(auth(adminToken));
      assert.equal(ok.status, 200);
      assert.ok(ok.body.length >= 3);
      assert.equal(ok.body[0].password_hash, undefined);
    });
  });
});
