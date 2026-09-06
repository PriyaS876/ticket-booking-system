import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Shows from './pages/Shows';
import SeatSelection from './pages/SeatSelection';
import MyBookings from './pages/MyBookings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/shows" element={<Shows />} />
      <Route path="/shows/:id/seats" element={<SeatSelection />} />
      <Route path="/my-bookings" element={<MyBookings />} />
    </Routes>
  );
}

export default App;