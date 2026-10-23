const multer = require('multer');
const { HttpError } = require('../utils/errors');
const { removeStoredFiles } = require('../utils/files');

function notFound(req, res, next) {
  next(new HttpError(404, 'Rota não encontrada'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (Array.isArray(req.files)) removeStoredFiles(req.files.map((f) => f.filename));

  if (err.name === 'ZodError') {
    return res.status(400).json({
      message: 'Dados inválidos',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({
      message: tooBig ? 'Arquivo excede o tamanho máximo de 5MB' : `Erro no upload: ${err.message}`,
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'Registro já existe (valor duplicado)' });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, details: err.details });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido' });
  }

  console.error(err);
  res.status(500).json({ message: 'Erro interno do servidor' });
}

module.exports = { notFound, errorHandler };
