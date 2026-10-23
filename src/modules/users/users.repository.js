const { User } = require('../../models');

const PUBLIC_ATTRIBUTES = ['id', 'name', 'email', 'role', 'createdAt'];

module.exports = {
  findById(id) {
    return User.findByPk(id, { attributes: PUBLIC_ATTRIBUTES });
  },

  findByEmail(email) {
    return User.findOne({ where: { email } });
  },

  create({ name, email, passwordHash, role = 'user' }) {
    return User.create({ name, email, passwordHash, role });
  },

  list() {
    return User.findAll({ attributes: PUBLIC_ATTRIBUTES, order: [['name', 'ASC']] });
  },
};
