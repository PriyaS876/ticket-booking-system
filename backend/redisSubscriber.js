const redis = require('redis');
const pool = require('./db');
require('dotenv').config();

const subscriber = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

subscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));

async function startExpiryListener() {
  await subscriber.connect();

  await subscriber.subscribe('__keyevent@0__:expired', async (key) => {
    console.log(`Expired key detected: ${key}`);

    if (key.startsWith('seat_hold:')) {
      const seatId = key.split(':')[1];

      try {
        const result = await pool.query(
          `UPDATE seats SET status = 'available', held_by = NULL, held_at = NULL 
           WHERE id = $1 AND status = 'held' 
           RETURNING *`,
          [seatId]
        );

        if (result.rows.length > 0) {
          console.log(`Seat ${seatId} automatically released (hold expired)`);
        }
      } catch (err) {
        console.error('Error releasing expired seat:', err);
      }
    }
  });

  console.log('Redis expiry listener started!');
}

module.exports = startExpiryListener;