import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Shows() {
  const [shows, setShows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const res = await api.get('/shows');
        setShows(res.data);
      } catch (err) {
        setError(err.customMessage || 'Failed to load shows');
      } finally {
        setLoading(false);
      }
    };
    fetchShows();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-5 py-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap gap-3 justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🎬 Available Shows</h1>
          <button
            onClick={handleLogout}
            className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        {loading && (
          <p className="text-gray-500 text-center mt-10">Loading shows...</p>
        )}

        {error && (
          <p className="text-red-500 mb-4">{error}</p>
        )}

        {!loading && (
          <div className="grid gap-4">
            {shows.map((show) => (
              <div
                key={show.id}
                className="bg-white rounded-xl px-6 py-5 flex flex-wrap gap-4 justify-between items-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {show.movie_name}
                  </h3>
                  <p className="text-gray-500 text-sm mb-2">
                    📍 {show.theatre_name} &nbsp;•&nbsp; 🕒{' '}
                    {new Date(show.show_time).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    ₹{show.price}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/shows/${show.id}/seats`)}
                  className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Select Seats
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && shows.length === 0 && !error && (
          <p className="text-gray-500 text-center mt-10">
            No shows available right now.
          </p>
        )}
      </div>
    </div>
  );
}

export default Shows;