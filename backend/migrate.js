const pool = require('./db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      password VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS shows (
      id SERIAL PRIMARY KEY,
      movie_name VARCHAR(200),
      theatre_name VARCHAR(200),
      show_time TIMESTAMP,
      price DECIMAL(10,2),
      total_seats INT
    );

    CREATE TABLE IF NOT EXISTS seats (
      id SERIAL PRIMARY KEY,
      show_id INT REFERENCES shows(id),
      seat_number VARCHAR(10),
      status VARCHAR(20) DEFAULT 'available',
      held_by INT REFERENCES users(id),
      held_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      show_id INT REFERENCES shows(id),
      seat_ids INT[],
      total_amount DECIMAL(10,2),
      status VARCHAR(20),
      booked_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('Tables ban gaye!');
  process.exit();
}

migrate();