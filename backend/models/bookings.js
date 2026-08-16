const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define('bookings', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    bookingNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: "bookingNumber"
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
    serviceId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'services',
        key: 'id'
      }
    },
    bookingDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    bookingTime: {
      type: DataTypes.TIME,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    counterDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    counterTime: {
      type: DataTypes.TIME,
      allowNull: true
    },
    counterPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'paid', 'failed'),
      allowNull: true,
      defaultValue: "pending"
    },
    bookingStatus: {
      type: DataTypes.ENUM('pending', 'accepted', 'upcoming', 'ongoing', 'completed', 'cancelled', 'reject'),
      allowNull: true,
      defaultValue: "pending"
    },
    counterStatus: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      allowNull: true,
      defaultValue: "pending"
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
    video: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    thumbnail: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'bookings',
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
        name: "bookingNumber",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "bookingNumber" },
        ]
      },
      {
        name: "serviceId",
        using: "BTREE",
        fields: [
          { name: "serviceId" },
        ]
      },
      {
        name: "idx_bookings_userId",
        using: "BTREE",
        fields: [
          { name: "userId" },
        ]
      },
      {
        name: "idx_bookings_providerId",
        using: "BTREE",
        fields: [
          { name: "providerId" },
        ]
      },
    ]
  });
};
