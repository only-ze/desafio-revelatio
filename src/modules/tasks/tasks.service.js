const repo = require('./tasks.repository');
const { HttpError } = require('../../utils/errors');
const { removeStoredFiles, decodeOriginalName } = require('../../utils/files');

const isAdmin = (user) => user.role === 'admin';

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toView(task) {
  const t = task.get({ plain: true });
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    dueDate: t.dueDate,
    status: t.status,
    priority: t.priority,
    isOverdue: Boolean(t.dueDate && t.status !== 'done' && t.dueDate < today()),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    owner: { id: t.owner.id, name: t.owner.name },
    attachments: (t.attachments || []).map((a) => ({
      id: a.id,
      originalName: a.originalName,
      mimeType: a.mimeType,
      size: a.size,
      url: `/api/attachments/${a.id}`,
    })),
  };
}

function toAttachmentRows(files = []) {
  return files.map((f) => ({
    originalName: decodeOriginalName(f.originalname),
    storedName: f.filename,
    mimeType: f.mimetype,
    size: f.size,
  }));
}

async function getAuthorizedTask(user, id) {
  const task = await repo.findById(id);
  if (!task) throw new HttpError(404, 'Tarefa não encontrada');
  if (!isAdmin(user) && task.userId !== user.id) {
    throw new HttpError(403, 'Você não tem acesso a esta tarefa');
  }
  return task;
}

async function listTasks(user, { status, priority, q, userId }) {
  const ownerId = isAdmin(user) ? userId : user.id;
  const tasks = await repo.list({ ownerId, status, priority, q });
  return tasks.map(toView);
}

async function getTask(user, id) {
  return toView(await getAuthorizedTask(user, id));
}

async function createTask(user, data, files) {
  const id = await repo.create({ ...data, userId: user.id }, toAttachmentRows(files));
  return toView(await repo.findById(id));
}

async function updateTask(user, id, data, files) {
  await getAuthorizedTask(user, id);
  await repo.update(id, data);
  if (files?.length) await repo.addAttachments(id, toAttachmentRows(files));
  return toView(await repo.findById(id));
}

function completeTask(user, id) {
  return updateTask(user, id, { status: 'done' });
}

async function deleteTask(user, id) {
  await getAuthorizedTask(user, id);
  const attachments = await repo.listAttachmentsByTask(id);
  await repo.remove(id);
  removeStoredFiles(attachments.map((a) => a.storedName));
}

async function getAuthorizedAttachment(user, attachmentId) {
  const attachment = await repo.findAttachment(attachmentId);
  if (!attachment) throw new HttpError(404, 'Anexo não encontrado');
  if (!isAdmin(user) && attachment.Task.userId !== user.id) {
    throw new HttpError(403, 'Você não tem acesso a este anexo');
  }
  return attachment;
}

async function addAttachments(user, taskId, files) {
  await getAuthorizedTask(user, taskId);
  if (!files?.length) throw new HttpError(400, 'Envie ao menos um arquivo no campo "files"');
  await repo.addAttachments(taskId, toAttachmentRows(files));
  return toView(await repo.findById(taskId));
}

async function deleteAttachment(user, taskId, attachmentId) {
  await getAuthorizedTask(user, taskId);
  const attachment = await getAuthorizedAttachment(user, attachmentId);
  if (attachment.taskId !== taskId) throw new HttpError(404, 'Anexo não encontrado nesta tarefa');
  await repo.removeAttachment(attachmentId);
  removeStoredFiles([attachment.storedName]);
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  addAttachments,
  deleteAttachment,
  getAuthorizedAttachment,
};
