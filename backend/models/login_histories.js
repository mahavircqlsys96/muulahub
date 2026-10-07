const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('login_histories', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    loginTime: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    logoutTime: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    deviceType: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    fcmToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    loginType: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'login_histories',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
