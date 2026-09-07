# 🎬 Movie Ticket Booking System

A full-stack ticket booking application that solves the classic **double-booking problem** using database-level concurrency control and Redis-based auto-expiry — the same core challenge faced by platforms like BookMyShow and IRCTC.

---

## 🚀 Live Demo

| | Link |
|---|---|
| 🌐 **Live App** | [ticket-booking-system-sandy-zeta.vercel.app](https://ticket-booking-system-sandy-zeta.vercel.app) |
| ⚙️ **Backend API** | [ticket-booking-system-u8k9.onrender.com](https://ticket-booking-system-u8k9.onrender.com) |
| 💻 **Source Code** | [github.com/PriyaS876/ticket-booking-system](https://github.com/PriyaS876/ticket-booking-system) |

> **Note:** The backend is hosted on Render's free tier, which spins down after inactivity. The first request after idle time may take 20–30 seconds to respond while the server wakes up.

---

## 📌 Problem Statement

When multiple users try to book the same seat at the same time, most naive implementations allow **double bookings** — two users end up paying for the same seat. This project solves that with:

1. **PostgreSQL row-level locking** (`SELECT ... FOR UPDATE`) to prevent race conditions while a seat is being held.
2. **Redis TTL + keyspace notifications** to automatically release a seat if the user doesn't complete payment within 5 minutes.

---

## 📸 Screenshots

**Login**

![Login](./screenshots/login.png)

**Available Shows**

![Shows](./screenshots/shows.png)

**Seat Selection** — live status (available / held / booked)

![Seat Selection](./screenshots/seat-selection.png)

**Booking History**

![My Bookings](./screenshots/my-bookings.png)

---

## 🏗️ Architecture

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│   React     │─────▶│   Express   │─────▶│  PostgreSQL  │
│  (Vercel)   │◀─────│  (Render)   │◀─────│    (Neon)    │
└─────────────┘      └──────┬──────┘      └──────────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │    Redis    │
                      │  (Upstash)  │
                      │ TTL-based   │
                      │ seat holds  │
                      └─────────────┘
```

---

## 🔑 Key Technical Challenge: Preventing Double Booking

When a user selects a seat, the backend runs this inside a database transaction:

```sql
BEGIN;
SELECT * FROM seats WHERE id = $1 FOR UPDATE;  -- locks this row
-- check if status = 'available'
UPDATE seats SET status = 'held', held_by = $2 WHERE id = $1;
COMMIT;
```

The `FOR UPDATE` clause locks the seat row for the duration of the transaction. If two requests arrive for the same seat at the same instant, PostgreSQL forces the second request to wait until the first transaction commits — at which point it sees the seat is no longer `available` and safely rejects the booking with a `409 Conflict`.

**Verified behavior:** sending multiple simultaneous hold requests for the same seat results in exactly **one success**, all others are rejected.

---

## ⏱️ Auto-Release with Redis

If a user holds a seat but doesn't complete the booking, the seat shouldn't stay locked forever:

1. When a seat is held, a Redis key (`seat_hold:<seatId>`) is set with a 300-second TTL.
2. Redis keyspace notifications are enabled (`notify-keyspace-events Ex`) so the app is notified the moment a key expires.
3. A subscriber listens for expired keys and automatically updates the seat back to `available` in PostgreSQL — no cron jobs or polling required.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router, Tailwind CSS, Axios |
| Backend | Node.js, Express |
| Database | PostgreSQL (hosted on Neon) |
| Cache / Expiry | Redis (hosted on Upstash) |
| Auth | JWT, bcrypt |
| Deployment | Vercel (frontend), Render (backend) |

---

## ✨ Features

- User authentication (signup/login) with hashed passwords and JWT, including password strength validation
- Browse available shows with theatre, timing, and pricing
- Interactive seat map with live status (available / held / booked)
- Concurrency-safe seat holding — no double bookings, even under simultaneous requests
- Automatic release of unconfirmed holds after 5 minutes via Redis TTL
- Booking confirmation and booking history per user
- Centralized API error handling — network errors, session expiry, and loading states are all handled gracefully

---

## 📂 Project Structure

```
ticket-booking-system/
├── backend/
│   ├── index.js            # All API routes
│   ├── db.js                # PostgreSQL connection pool
│   ├── redisClient.js       # Redis connection
│   ├── redisSubscriber.js   # Listens for expired seat holds
│   └── migrate.js           # Database schema setup
└── frontend/
    └── src/
        ├── pages/            # Login, Signup, Shows, SeatSelection, MyBookings
        └── api/axios.js      # Axios instance with interceptors
```

---

## 🔧 Running Locally

### Prerequisites
- Node.js
- PostgreSQL
- Redis (or a free instance from Upstash)

### Backend
```bash
cd backend
npm install
node migrate.js       # creates tables
npm run dev            # starts server on :5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev             # starts on :5173
```

### Environment Variables (`backend/.env`)
```
DATABASE_URL=postgresql://user:password@host:5432/ticket_booking
JWT_SECRET=your_secret_key
REDIS_URL=redis://localhost:6379
PORT=5000
```

---

## 🎯 What This Project Demonstrates

- Understanding of **database transactions and row-level locking** to solve real concurrency problems
- Practical use of **Redis beyond simple caching** (TTL-based expiry + pub/sub notifications)
- End-to-end full-stack integration with proper error handling
- Clean, component-based React architecture with Tailwind CSS
- Deploying a multi-service app (frontend, backend, database, cache) across different cloud providers

---

## 🔮 Future Improvements

- Real payment gateway integration (Razorpay/Stripe test mode)
- Admin dashboard for managing shows
- Documented load testing results for the concurrency handling
- Custom domain and CI/CD pipeline

---

## 👤 Author

**Priya S**
[GitHub](https://github.com/PriyaS876)
