const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth');
const { HttpError, parseId } = require('../../utils/errors');
const { storedPath } = require('../../utils/files');
const service = require('./tasks.service');

const router = Router();

router.get('/:id', authenticate, async (req, res, next) => {
  const attachment = await service.getAuthorizedAttachment(req.user, parseId(req.params.id));

  res.type(attachment.mimeType);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set(
    'Content-Disposition',
    `inline; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`
  );
  res.sendFile(storedPath(attachment.storedName), (err) => {
    if (err) next(err.code === 'ENOENT' ? new HttpError(404, 'Arquivo não encontrado no disco') : err);
  });
});

module.exports = router;
