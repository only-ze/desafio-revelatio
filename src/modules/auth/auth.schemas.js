const { z } = require('zod');

const email = z
  .string({ error: 'E-mail é obrigatório' })
  .trim()
  .toLowerCase()
  .email('E-mail inválido');

const register = z.object({
  name: z.string({ error: 'Nome é obrigatório' }).trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(80),
  email,
  password: z
    .string({ error: 'Senha é obrigatória' })
    .min(6, 'Senha deve ter ao menos 6 caracteres')
    .max(100),
});

const login = z.object({
  email,
  password: z.string({ error: 'Senha é obrigatória' }).min(1, 'Senha é obrigatória'),
});

module.exports = { register, login };
