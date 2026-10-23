const { Op } = require('sequelize');
const { sequelize, Task, User, Attachment } = require('../../models');

const INCLUDE = [
  { model: User, as: 'owner', attributes: ['id', 'name'] },
  { model: Attachment, as: 'attachments' },
];

const ATTACHMENTS_ORDER = [{ model: Attachment, as: 'attachments' }, 'id', 'ASC'];

const UPDATABLE = ['title', 'description', 'dueDate', 'status', 'priority'];

const escapeLike = (text) => text.replace(/[\\%_]/g, '\\$&');

async function list({ ownerId, status, priority, q } = {}) {
  const where = {};
  if (ownerId) where.userId = ownerId;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    where[Op.or] = [{ title: { [Op.iLike]: pattern } }, { description: { [Op.iLike]: pattern } }];
  }

  return Task.findAll({
    where,
    include: INCLUDE,
    order: [
      [sequelize.literal(`"Task"."status" = 'done'`), 'ASC'],
      ['dueDate', 'ASC NULLS LAST'],
      ['createdAt', 'DESC'],
      ATTACHMENTS_ORDER,
    ],
  });
}

function findById(id) {
  return Task.findByPk(id, { include: INCLUDE, order: [ATTACHMENTS_ORDER] });
}

function create(data, attachments = []) {
  return sequelize.transaction(async (transaction) => {
    const task = await Task.create(
      {
        title: data.title,
        description: data.description ?? '',
        dueDate: data.dueDate ?? null,
        status: data.status ?? 'pending',
        priority: data.priority ?? 'medium',
        userId: data.userId,
      },
      { transaction }
    );
    if (attachments.length) {
      await Attachment.bulkCreate(
        attachments.map((a) => ({ ...a, taskId: task.id })),
        { transaction }
      );
    }
    return task.id;
  });
}

async function update(id, data) {
  const changes = {};
  for (const field of UPDATABLE) {
    if (data[field] !== undefined) changes[field] = data[field];
  }
  if (Object.keys(changes).length) await Task.update(changes, { where: { id } });
}

function remove(id) {
  return Task.destroy({ where: { id } });
}

function listAttachmentsByTask(taskId) {
  return Attachment.findAll({ where: { taskId }, order: [['id', 'ASC']] });
}

function addAttachments(taskId, attachments) {
  return Attachment.bulkCreate(attachments.map((a) => ({ ...a, taskId })));
}

function findAttachment(id) {
  return Attachment.findByPk(id, { include: [{ model: Task, attributes: ['id', 'userId'] }] });
}

function removeAttachment(id) {
  return Attachment.destroy({ where: { id } });
}

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
  listAttachmentsByTask,
  addAttachments,
  findAttachment,
  removeAttachment,
};
