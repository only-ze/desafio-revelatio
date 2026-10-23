const MAX_PG_INT = 2147483647;

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > MAX_PG_INT) throw new HttpError(400, 'ID inválido');
  return id;
}

module.exports = { HttpError, parseId };
