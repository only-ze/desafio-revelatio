const { z } = require('zod');

const STATUSES = ['pending', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];
const MAX_PG_INT = 2147483647;

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const dueDate = z.preprocess(
  (v) => (v === '' ? null : v),
  z.string().refine(isRealDate, 'Data inválida (use AAAA-MM-DD)').nullable()
);

const fields = {
  title: z
    .string({ error: 'Título é obrigatório' })
    .trim()
    .min(1, 'Título é obrigatório')
    .max(120, 'Título deve ter no máximo 120 caracteres'),
  description: z.string().trim().max(2000, 'Descrição deve ter no máximo 2000 caracteres'),
  dueDate,
  status: z.enum(STATUSES, { error: `Status deve ser: ${STATUSES.join(', ')}` }),
  priority: z.enum(PRIORITIES, { error: `Prioridade deve ser: ${PRIORITIES.join(', ')}` }),
};

const create = z.object({
  title: fields.title,
  description: fields.description.optional(),
  dueDate: fields.dueDate.optional(),
  status: fields.status.optional(),
  priority: fields.priority.optional(),
});

const update = z
  .object({
    title: fields.title.optional(),
    description: fields.description.optional(),
    dueDate: fields.dueDate.optional(),
    status: fields.status.optional(),
    priority: fields.priority.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualizar');

const listQuery = z.object({
  status: fields.status.optional(),
  priority: fields.priority.optional(),
  q: z.string().trim().max(100).optional(),
  userId: z.coerce.number().int().positive().max(MAX_PG_INT).optional(),
});

module.exports = { create, update, listQuery, STATUSES, PRIORITIES };
