const db = require('./models');

db.sequelize.query(`
  ALTER TABLE services_categories 
  MODIFY COLUMN approvalStatus ENUM('approved', 'pending', 'disapproved') NULL DEFAULT 'pending';
`)
  .then(() => {
    console.log('Database updated successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error updating database:', err.message);
    process.exit(1);
  });
