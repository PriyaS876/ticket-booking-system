require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const redisClient = require('./redisClient');
const startExpiryListener = require('./redisSubscriber');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running!');
});

// SIGNUP API
app.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if email is already registered
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'This email is already registered' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user to database
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: 'Signup successful', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// LOGIN API
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Compare password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// ADD A NEW SHOW (Admin feature)
app.post('/shows', async (req, res) => {
  try {
    const { movie_name, theatre_name, show_time, price, total_seats } = req.body;

    if (!movie_name || !theatre_name || !show_time || !price || !total_seats) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const showResult = await pool.query(
      'INSERT INTO shows (movie_name, theatre_name, show_time, price, total_seats) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [movie_name, theatre_name, show_time, price, total_seats]
    );

    const show = showResult.rows[0];

    // Auto-generate seats for this show (A1, A2, A3...)
    const seatPromises = [];
    for (let i = 1; i <= total_seats; i++) {
      const seatNumber = `A${i}`;
      seatPromises.push(
        pool.query(
          'INSERT INTO seats (show_id, seat_number, status) VALUES ($1, $2, $3)',
          [show.id, seatNumber, 'available']
        )
      );
    }
    await Promise.all(seatPromises);

    res.status(201).json({ message: 'Show created', show });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET ALL SHOWS
app.get('/shows', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shows ORDER BY show_time');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET SEATS FOR A SPECIFIC SHOW
app.get('/shows/:id/seats', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM seats WHERE show_id = $1 ORDER BY id', [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// HOLD A SEAT (Core concurrency-handling feature)
app.post('/bookings/hold', async (req, res) => {
  const { seatId, userId } = req.body;

  if (!seatId || !userId) {
    return res.status(400).json({ error: 'seatId and userId are required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the seat row so no other request can touch it simultaneously
    const result = await client.query(
      'SELECT * FROM seats WHERE id = $1 FOR UPDATE',
      [seatId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Seat not found' });
    }

    const seat = result.rows[0];

    if (seat.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This seat is already held or booked' });
    }

    // Hold the seat
    await client.query(
      `UPDATE seats SET status = 'held', held_by = $1, held_at = NOW() WHERE id = $2`,
      [userId, seatId]
    );

    await client.query('COMMIT');

    // Set a 5-minute TTL in Redis for auto-release
    await redisClient.setEx(`seat_hold:${seatId}`, 300, userId.toString());

    res.json({ success: true, message: `Seat ${seat.seat_number} held for 5 minutes` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  } finally {
    client.release();
  }
});

// CONFIRM BOOKING (convert a held seat into a booked one)
app.post('/bookings/confirm', async (req, res) => {
  const { seatId, userId, showId } = req.body;

  if (!seatId || !userId || !showId) {
    return res.status(400).json({ error: 'seatId, userId and showId are required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      'SELECT * FROM seats WHERE id = $1 FOR UPDATE',
      [seatId]
    );

    const seat = result.rows[0];

    if (!seat) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Seat not found' });
    }

    // Ensure this seat was held by the same user
    if (seat.status !== 'held' || seat.held_by !== userId) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You did not hold this seat, or the hold has expired' });
    }

    await client.query(
      `UPDATE seats SET status = 'booked' WHERE id = $1`,
      [seatId]
    );

    // Get show price for the total amount
    const showResult = await client.query('SELECT price FROM shows WHERE id = $1', [showId]);
    const price = showResult.rows[0].price;

    // Create booking record
    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, show_id, seat_ids, total_amount, status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, showId, [seatId], price, 'confirmed']
    );

    await client.query('COMMIT');

    res.status(201).json({ 
      message: 'Booking confirmed!', 
      booking: bookingResult.rows[0] 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  } finally {
    client.release();
  }
});

// GET MY BOOKINGS
app.get('/bookings/my/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT b.*, s.movie_name, s.theatre_name, s.show_time 
       FROM bookings b 
       JOIN shows s ON b.show_id = s.id 
       WHERE b.user_id = $1 
       ORDER BY b.booked_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

startExpiryListener();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));