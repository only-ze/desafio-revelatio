const { Router } = require('express');
const { authenticate, requireRole } = require('../../middlewares/auth');
const usersRepo = require('./users.repository');

const router = Router();

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  res.json(await usersRepo.list());
});

module.exports = router;
