const bcrypt = require('bcryptjs');
const sequelize = require('../db');
const config = require('../config');

const User = require('./user')(sequelize);
const Task = require('./task')(sequelize);
const Attachment = require('./attachment')(sequelize);

User.hasMany(Task, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
Task.belongsTo(User, { as: 'owner', foreignKey: { name: 'userId', allowNull: false } });

Task.hasMany(Attachment, {
  as: 'attachments',
  foreignKey: { name: 'taskId', allowNull: false },
  onDelete: 'CASCADE',
});
Attachment.belongsTo(Task, { foreignKey: { name: 'taskId', allowNull: false } });

async function seedAdmin() {
  const { name, email, password } = config.admin;
  await User.findOrCreate({
    where: { email },
    defaults: { name, passwordHash: await bcrypt.hash(password, 10), role: 'admin' },
  });
}

async function initDatabase({ force = false } = {}) {
  await sequelize.authenticate();
  await sequelize.sync({ force });
  await seedAdmin();
}

module.exports = { sequelize, User, Task, Attachment, initDatabase };
