const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const upload = require('../../middlewares/upload');
const { parseId } = require('../../utils/errors');
const schemas = require('./tasks.schemas');
const service = require('./tasks.service');

const router = Router();
router.use(authenticate);

router.get('/', validate(schemas.listQuery, 'query'), async (req, res) => {
  res.json(await service.listTasks(req.user, req.valid.query));
});

router.post('/', upload, validate(schemas.create), async (req, res) => {
  res.status(201).json(await service.createTask(req.user, req.valid.body, req.files));
});

router.get('/:id', async (req, res) => {
  res.json(await service.getTask(req.user, parseId(req.params.id)));
});

router.put('/:id', upload, validate(schemas.update), async (req, res) => {
  res.json(await service.updateTask(req.user, parseId(req.params.id), req.valid.body, req.files));
});

router.patch('/:id/complete', async (req, res) => {
  res.json(await service.completeTask(req.user, parseId(req.params.id)));
});

router.delete('/:id', async (req, res) => {
  await service.deleteTask(req.user, parseId(req.params.id));
  res.status(204).end();
});

router.post('/:id/attachments', upload, async (req, res) => {
  res.status(201).json(await service.addAttachments(req.user, parseId(req.params.id), req.files));
});

router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  await service.deleteAttachment(
    req.user,
    parseId(req.params.id),
    parseId(req.params.attachmentId)
  );
  res.status(204).end();
});

module.exports = router;
