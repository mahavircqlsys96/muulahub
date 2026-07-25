const db = require('./models');

async function updateEnum() {
    try {
        await db.sequelize.query("ALTER TABLE bookings MODIFY COLUMN bookingStatus ENUM('pending', 'accepted', 'completed', 'cancelled', 'reject', 'counter_offer') DEFAULT 'pending'");
        console.log("bookingStatus enum updated successfully!");
    } catch (e) {
        console.error("Error updating enum:", e);
    } finally {
        process.exit();
    }
}

updateEnum();
