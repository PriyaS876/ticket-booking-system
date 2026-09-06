import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function SeatSelection() {
  const { id } = useParams();
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user'));

  const fetchSeats = async () => {
    try {
      const res = await api.get(`/shows/${id}/seats`);
      setSeats(res.data);
    } catch (err) {
      setError(err.customMessage || 'Failed to load seats');
    } finally {
      setLoadingSeats(false);
    }
  };

  useEffect(() => {
    fetchSeats();
  }, [id]);

  const handleSeatClick = async (seat) => {
    if (seat.status !== 'available') return;

    setError('');
    setMessage('');

    try {
      const res = await api.post('/bookings/hold', {
        seatId: seat.id,
        userId: user.id,
      });
      setMessage(res.data.message);
      setSelectedSeat(seat.id);
      fetchSeats();
    } catch (err) {
      setError(err.customMessage || 'Something went wrong');
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedSeat) return;
    setConfirming(true);
    setError('');

    try {
      await api.post('/bookings/confirm', {
        seatId: selectedSeat,
        userId: user.id,
        showId: id,
      });
      alert('Booking Confirmed! 🎉');
      navigate('/my-bookings');
    } catch (err) {
      setError(err.customMessage || 'Could not confirm booking');
    } finally {
      setConfirming(false);
    }
  };

  const getSeatClasses = (seat) => {
    if (seat.id === selectedSeat) return 'bg-indigo-500 text-white';
    if (seat.status === 'available') return 'bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer';
    if (seat.status === 'held') return 'bg-amber-400 text-gray-700 cursor-not-allowed';
    if (seat.status === 'booked') return 'bg-red-500 text-white cursor-not-allowed';
    return 'bg-gray-200 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-5 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">🎟️ Select a Seat</h1>
        <p className="text-gray-500 mb-5">
          Tap on any grey seat to hold it for 5 minutes.
        </p>

        {error && <p className="text-red-500 mb-3">{error}</p>}
        {message && <p className="text-green-600 mb-3">{message}</p>}

        <div className="flex flex-wrap gap-4 mb-5 text-sm text-gray-500">
          <span>⬜ Available</span>
          <span>🟨 Held</span>
          <span>🟥 Booked</span>
          <span>🟪 Your Selection</span>
        </div>

        {loadingSeats ? (
          <p className="text-gray-500">Loading seats...</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 bg-white p-6 rounded-xl shadow-sm">
            {seats.map((seat) => (
              <button
                key={seat.id}
                onClick={() => handleSeatClick(seat)}
                disabled={seat.status !== 'available' && seat.id !== selectedSeat}
                className={`py-4 rounded-lg text-sm font-medium transition-colors ${getSeatClasses(seat)}`}
              >
                {seat.seat_number}
              </button>
            ))}
          </div>
        )}

        {selectedSeat && (
          <button
            onClick={handleConfirmBooking}
            disabled={confirming}
            className="mt-6 w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {confirming ? 'Confirming...' : 'Confirm Booking'}
          </button>
        )}
      </div>
    </div>
  );
}

export default SeatSelection;