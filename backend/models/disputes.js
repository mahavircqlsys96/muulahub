const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('disputes', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    bookingId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'bookings',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    providerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    evidenceImage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00
    },
    status: {
      type: DataTypes.ENUM('pending','resolved','refunded','partial_refund','escrow_released'),
      allowNull: true,
      defaultValue: "pending"
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'disputes',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [{ name: "id" }]
      },
      {
        name: "idx_disputes_bookingId",
        using: "BTREE",
        fields: [{ name: "bookingId" }]
      },
      {
        name: "idx_disputes_userId",
        using: "BTREE",
        fields: [{ name: "userId" }]
      },
      {
        name: "idx_disputes_providerId",
        using: "BTREE",
        fields: [{ name: "providerId" }]
      }
    ]
  });
};
