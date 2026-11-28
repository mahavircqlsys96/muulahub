'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file !== 'associations.js' &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Ensure location column exists on users table safely
sequelize.query("ALTER TABLE `users` ADD COLUMN `location` VARCHAR(255) NULL").catch(() => {});

// Ensure unique index on userName exists safely
sequelize.query("ALTER TABLE `users` ADD UNIQUE INDEX `idx_users_userName_unique` (`userName`)").catch(() => {});

// Ensure recording columns exist on events table safely for live streaming recording on AWS S3
sequelize.query("ALTER TABLE `events` ADD COLUMN `recordingResourceId` VARCHAR(255) NULL").catch(() => {});
sequelize.query("ALTER TABLE `events` ADD COLUMN `recordingSid` VARCHAR(255) NULL").catch(() => {});
sequelize.query("ALTER TABLE `events` ADD COLUMN `recordingUid` VARCHAR(255) NULL").catch(() => {});
sequelize.query("ALTER TABLE `events` ADD COLUMN `recordingStatus` VARCHAR(50) DEFAULT 'idle'").catch(() => {});
sequelize.query("ALTER TABLE `events` ADD COLUMN `recordingUrl` TEXT NULL").catch(() => {});

// Ensure admin_roles table and sub-admin columns exist safely
sequelize.query(`
  CREATE TABLE IF NOT EXISTS \`admin_roles\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`name\` VARCHAR(100) NOT NULL,
    \`slug\` VARCHAR(100) NOT NULL UNIQUE,
    \`description\` TEXT NULL,
    \`permissions\` JSON NULL,
    \`isSystem\` TINYINT NOT NULL DEFAULT 0,
    \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`).catch(() => {});

sequelize.query("ALTER TABLE `users` ADD COLUMN `adminRoleId` INT NULL").catch(() => {});
sequelize.query("ALTER TABLE `users` ADD COLUMN `adminRoleSlug` VARCHAR(100) NULL").catch(() => {});
sequelize.query("ALTER TABLE `users` ADD COLUMN `adminPermissions` JSON NULL").catch(() => {});
sequelize.query("ALTER TABLE `users` ADD COLUMN `isSubAdmin` TINYINT DEFAULT 0").catch(() => {});

// Ensure User License Verification and Blue Tick fields exist safely
sequelize.query("ALTER TABLE `users` ADD COLUMN `isApproved` ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending'").catch(() => {});
sequelize.query("ALTER TABLE `users` ADD COLUMN `isVerified` TINYINT DEFAULT 0").catch(() => {});
sequelize.query("ALTER TABLE `users` ADD COLUMN `licenseFront` VARCHAR(500) NULL").catch(() => {});
sequelize.query("ALTER TABLE `users` ADD COLUMN `licenseBack` VARCHAR(500) NULL").catch(() => {});
sequelize.query("ALTER TABLE `users` ADD COLUMN `licenseRejectionReason` TEXT NULL").catch(() => {});
sequelize.query("ALTER TABLE `users` ADD COLUMN `licenseSubmittedAt` DATETIME NULL").catch(() => {});

// Ensure counterStatus on bookings supports pending, accepted, reject, rejected, and cancelled safely
sequelize.query("ALTER TABLE `bookings` MODIFY COLUMN `counterStatus` ENUM('pending', 'accepted', 'reject', 'rejected', 'cancelled') DEFAULT 'pending'").catch(() => {});

module.exports = db;
