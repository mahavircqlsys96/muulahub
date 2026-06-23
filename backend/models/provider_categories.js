const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('provider_categories', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    providerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    categoryId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'services_categories',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'provider_categories',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [{ name: "id" }]
      },
      {
        name: "idx_provider_categories_providerId",
        using: "BTREE",
        fields: [{ name: "providerId" }]
      },
      {
        name: "idx_provider_categories_categoryId",
        using: "BTREE",
        fields: [{ name: "categoryId" }]
      }
    ]
  });
};
