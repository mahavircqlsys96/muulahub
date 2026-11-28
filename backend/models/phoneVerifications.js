const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('phoneVerifications', {
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
    sessionToken: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    step: {
      type: DataTypes.ENUM('old_phone_pending', 'old_phone_verified', 'new_phone_pending', 'completed'),
      allowNull: false,
      defaultValue: 'old_phone_pending'
    },
    oldPhone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    oldCountryCode: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    oldOtp: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    oldOtpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    oldOtpAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    oldOtpLastSentAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    newPhone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    newCountryCode: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    newOtp: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    newOtpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    newOtpAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    newOtpLastSentAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'phone_verifications',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [{ name: "id" }]
      },
      {
        name: "idx_phone_verifications_userId",
        using: "BTREE",
        fields: [{ name: "userId" }]
      },
      {
        name: "idx_phone_verifications_sessionToken",
        unique: true,
        using: "BTREE",
        fields: [{ name: "sessionToken" }]
      }
    ]
  });
};
