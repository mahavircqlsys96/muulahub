const db = require('./models');

async function addCounterColumns() {
    try {
        await db.sequelize.query("ALTER TABLE bookings ADD COLUMN counterDate DATE DEFAULT NULL AFTER amount;");
        await db.sequelize.query("ALTER TABLE bookings ADD COLUMN counterTime TIME DEFAULT NULL AFTER counterDate;");
        await db.sequelize.query("ALTER TABLE bookings ADD COLUMN counterPrice DECIMAL(10, 2) DEFAULT 0.00 AFTER counterTime;");
        console.log("Counter columns added successfully!");
    } catch (e) {
        console.error("Error adding columns:", e.message);
    } finally {
        process.exit();
    }
}

addCounterColumns();
