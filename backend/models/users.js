const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define('users', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: "email"
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    countryCode: {
      type: DataTypes.STRING(10),
      allowNull: true,

    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    userName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    profileImage: {
      type: DataTypes.STRING(255),
      allowNull: true,

    },
    profileImageProvider: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: true,
      defaultValue: "user"
    },
    isProvider: {
      type: DataTypes.TINYINT,
      allowNull: true,
      defaultValue: 0,

    },
    providerStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: true,
      defaultValue: "pending",

    },
    currentMode: {
      type: DataTypes.ENUM('user', 'provider'),
      allowNull: true,
      defaultValue: "user",

    },
    status: {
      type: DataTypes.ENUM('active', 'blocked', 'inactive'),
      allowNull: true,
      defaultValue: "active"
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    loginTime: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    fcmToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    deviceType: {
      type: DataTypes.STRING(50),
      allowNull: true,

    },
    socialId: {
      type: DataTypes.STRING(255),
      allowNull: true,

    },
    loginType: {
      type: DataTypes.ENUM('email', 'google', 'facebook', 'apple'),
      allowNull: true,
      defaultValue: "email",
    },
    resetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    resetTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    customerId: {
      type: DataTypes.STRING(255),
      allowNull: true,

    },
    isNotification: {
      type: DataTypes.ENUM('on', 'off'),
      allowNull: true,
      defaultValue: "on",
    },
    walletAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,

    },
    totalEarning: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
    },
    pendingAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
    },
    withdrawnAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
    },
    isWalletFrozen: {
      type: DataTypes.TINYINT,
      allowNull: true,
      defaultValue: 0,
    },
    referralCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: "users_referralCode"
    },
    referredBy: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    admin_commission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    govt_tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    contact_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    contact_phone: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    withdrawal_fees: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    country_fees: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    promotional_fee_waivers: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    about: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "About section only for provider profile"
    },
    hourlyPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    supported_currencies: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tax_rules: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payout_providers: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    otp: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    otpVerify: {
      type: DataTypes.ENUM("pending", "verified"),
      allowNull: true,
      defaultValue: "pending"
    },
    socketId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    isOnline: {
      type: DataTypes.TINYINT,
      allowNull: true,
      defaultValue: 0
    },
    isProfileComplete: {
      type: DataTypes.TINYINT,
      allowNull: true,
      defaultValue: 0,
      comment: "0=>Pending,1=>User,2=>Provider"
    }
  }, {
    sequelize,
    tableName: 'users',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [{ name: "id" }]
      },
      {
        name: "email",
        unique: true,
        using: "BTREE",
        fields: [{ name: "email" }]
      },
      {
        name: "idx_users_email",
        using: "BTREE",
        fields: [{ name: "email" }]
      },
    ]
  });
};
