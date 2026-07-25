const db = require('./models');

db.sequelize.query(`
  ALTER TABLE posts 
  MODIFY COLUMN allowComments ENUM('on', 'off') DEFAULT 'on',
  MODIFY COLUMN allowShares ENUM('on', 'off') DEFAULT 'on',
  MODIFY COLUMN saveToProfile ENUM('on', 'off') DEFAULT 'off';
`)
  .then(() => {
    console.log('Database updated successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error updating database:', err.message);
    process.exit(1);
  });
