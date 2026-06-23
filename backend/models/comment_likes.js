const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('comment_likes', {
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
    commentId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'post_comments',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'comment_likes',
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
        name: "userId",
        using: "BTREE",
        fields: [
          { name: "userId" },
        ]
      },
      {
        name: "commentId",
        using: "BTREE",
        fields: [
          { name: "commentId" },
        ]
      },
    ]
  });
};
