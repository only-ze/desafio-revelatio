const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Task',
    {
      title: { type: DataTypes.STRING(120), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
      dueDate: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'done'),
        allowNull: false,
        defaultValue: 'pending',
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        allowNull: false,
        defaultValue: 'medium',
      },
    },
    {
      tableName: 'tasks',
      indexes: [{ fields: ['user_id'] }, { fields: ['status'] }],
    }
  );
