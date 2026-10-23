const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const usersRepo = require('../users/users.repository');
const { HttpError } = require('../../utils/errors');

function signToken(user) {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtExpiresIn,
  });
}

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function register({ name, email, password }) {
  if (await usersRepo.findByEmail(email)) throw new HttpError(409, 'E-mail já cadastrado');

  const user = await usersRepo.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'user',
  });
  return { token: signToken(user), user: toPublicUser(user) };
}

async function login({ email, password }) {
  const user = await usersRepo.findByEmail(email);
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) throw new HttpError(401, 'E-mail ou senha incorretos');
  return { token: signToken(user), user: toPublicUser(user) };
}

module.exports = { register, login };
