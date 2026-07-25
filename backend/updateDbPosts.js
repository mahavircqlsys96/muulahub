const db = require('./models');

db.sequelize.query(`
  ALTER TABLE posts 
  ADD COLUMN location VARCHAR(255) NULL,
  ADD COLUMN allowComments TINYINT(1) DEFAULT 1,
  ADD COLUMN allowShares TINYINT(1) DEFAULT 1,
  ADD COLUMN saveToProfile TINYINT(1) DEFAULT 0,
  MODIFY COLUMN type ENUM('publish', 'scheduled', 'draft') NULL DEFAULT 'publish';
`)
  .then(() => {
    console.log('Database updated successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error updating database:', err.message);
    process.exit(1);
  });
