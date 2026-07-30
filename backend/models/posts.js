const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define('posts', {
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
    hashtags: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    status: {
      type: DataTypes.ENUM('active', 'reported', 'deleted'),
      allowNull: true,
      defaultValue: "active"
    },
    type: {
      type: DataTypes.ENUM("publish", "scheduled", "draft"),
      defaultValue: "publish"
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
    allowComments: {
      type: DataTypes.ENUM('on', 'off'),
      defaultValue: 'on'
    },
    allowShares: {
      type: DataTypes.ENUM('on', 'off'),
      defaultValue: 'on'
    },
    saveToProfile: {
      type: DataTypes.ENUM('on', 'off'),
      defaultValue: 'off'
    },

    date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    time: {
      type: DataTypes.TIME,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'posts',
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
        name: "idx_posts_userId",
        using: "BTREE",
        fields: [
          { name: "userId" },
        ]
      },
    ]
  });
};
