import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get(`/bookings/my/${user.id}`);
        setBookings(res.data);
      } catch (err) {
        setError(err.customMessage || 'Failed to load bookings');
      }
    };
    fetchBookings();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-5 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap gap-3 justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🎫 My Bookings</h1>
          <button
            onClick={() => navigate('/shows')}
            className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Back to Shows
          </button>
        </div>

        {error && <p className="text-red-500">{error}</p>}

        <div className="grid gap-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-xl px-6 py-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {booking.movie_name}
              </h3>
              <p className="text-gray-500 text-sm mb-1">
                📍 {booking.theatre_name} • 🕒{' '}
                {new Date(booking.show_time).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-sm text-gray-500">
                Amount: ₹{booking.total_amount} •{' '}
                <span className="text-green-600 font-semibold">{booking.status}</span>
              </p>
            </div>
          ))}
        </div>

        {bookings.length === 0 && !error && (
          <p className="text-gray-500 text-center mt-10">
            You have no bookings yet.
          </p>
        )}
      </div>
    </div>
  );
}

export default MyBookings;