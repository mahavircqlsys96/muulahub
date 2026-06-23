const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define('notifications', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    senderId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },

    title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('booking', 'payment', 'withdrawal', 'post', 'system', 'follow'),
      allowNull: true,
      defaultValue: "system"
    },
    notificationType: {
      type: DataTypes.ENUM('email', 'push'),
      allowNull: true,

    },
    referenceId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    isRead: {
      type: DataTypes.TINYINT,
      allowNull: true,
      defaultValue: 0,

    }
  }, {
    sequelize,
    tableName: 'notifications',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [{ name: "id" }]
      },
      {
        name: "idx_notifications_userId",
        using: "BTREE",
        fields: [{ name: "user_id" }]
      },
    ]
  });
};
