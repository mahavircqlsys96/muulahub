const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('supportTickets', {
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
    ticketNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Resolved', 'Rejected'),
      allowNull: false,
      defaultValue: 'Pending'
    },
    adminRemark: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejectedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'support_tickets',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [{ name: "id" }]
      },
      {
        name: "idx_support_tickets_userId",
        using: "BTREE",
        fields: [{ name: "userId" }]
      },
      {
        name: "idx_support_tickets_status",
        using: "BTREE",
        fields: [{ name: "status" }]
      },
      {
        name: "idx_support_tickets_ticketNumber",
        unique: true,
        using: "BTREE",
        fields: [{ name: "ticketNumber" }]
      }
    ]
  });
};
