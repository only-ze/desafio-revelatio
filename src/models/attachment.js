const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Attachment',
    {
      originalName: { type: DataTypes.STRING(255), allowNull: false },
      storedName: { type: DataTypes.STRING(255), allowNull: false },
      mimeType: { type: DataTypes.STRING(100), allowNull: false },
      size: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: 'attachments',
      updatedAt: false,
      indexes: [{ fields: ['task_id'] }],
    }
  );
