const jwt = require('jsonwebtoken');
const config = require('../config');
const usersRepo = require('../modules/users/users.repository');
const { HttpError } = require('../utils/errors');

async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Token de autenticação não informado'));
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return next(new HttpError(401, 'Token inválido ou expirado'));
  }

  const user = await usersRepo.findById(Number(payload.sub));
  if (!user) return next(new HttpError(401, 'Usuário não encontrado'));

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Você não tem permissão para esta ação'));
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
