const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  return sequelize.define('admin_roles', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Display Name (e.g. Operations Admin)'
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: 'slug',
      comment: 'Identifier slug (e.g. operations_admin)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of module permission strings (e.g. ["dashboard:view", "users:manage"])'
    },
    isSystem: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '1 for built-in client specification roles, 0 for user created'
    }
  }, {
    sequelize,
    tableName: 'admin_roles',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [{ name: "id" }]
      },
      {
        name: "idx_admin_roles_slug",
        unique: true,
        using: "BTREE",
        fields: [{ name: "slug" }]
      }
    ]
  });
};
