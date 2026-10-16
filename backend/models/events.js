const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define('events', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    categoryId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },

    caption: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    status: {
      type: DataTypes.ENUM('start', 'stop'),
      allowNull: true,
      defaultValue: "stop"
    },

    available: {
      type: DataTypes.ENUM("followersOnly", "everyone"),
      defaultValue: "everyone"
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    media: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    time: {
      type: DataTypes.TIME,
      allowNull: true
    },
    agoraToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    agoraChannel: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    agoraUid: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    agoraAppId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    agoraAppCertificate: {
      type: DataTypes.STRING(255),
      allowNull: true
    },

  }, {
    sequelize,
    tableName: 'events',
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
      {
        name: "categoryId",
        using: "BTREE",
        fields: [
          { name: "categoryId" },
        ]
      },
      {
        name: "idx_events_userId",
        using: "BTREE",
        fields: [
          { name: "userId" },
        ]
      },
    ]
  });
};
