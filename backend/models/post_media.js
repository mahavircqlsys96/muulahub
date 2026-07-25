const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define('post_media', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    postId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id'
      }
    },
    mediaUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('video', 'photo'),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'post_media',
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
        name: "postId",
        using: "BTREE",
        fields: [
          { name: "postId" },
        ]
      },
    ]
  });
};
