const { Router } = require('express');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const schemas = require('./auth.schemas');
const service = require('./auth.service');

const router = Router();

router.post('/register', validate(schemas.register), async (req, res) => {
  res.status(201).json(await service.register(req.valid.body));
});

router.post('/login', validate(schemas.login), async (req, res) => {
  res.json(await service.login(req.valid.body));
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
