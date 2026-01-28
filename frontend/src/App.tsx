import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import RegisterOfficial from "./pages/RegisterOfficial";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Pay from "./pages/Pay";
import VehicleRegister from "./pages/VehicleRegister";

import Slots from "./pages/Slots";
import Booking from "./pages/Booking";
import ActiveBookings from "./pages/ActiveBookings";
import AdminDashboard from "./pages/AdminDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import GlobalToast from "./components/GlobalToast"; // Import here
import { ConfirmProvider } from "./context/ConfirmContext"; // Import this

// ...
// ...

// Inside Routes...

function App() {
  return (
    <BrowserRouter>
      <ConfirmProvider>
        <GlobalToast />
        <Routes>
          <Route path="/owner-dashboard" element={<OwnerDashboard />} />;
          <Route path="/admin-dashboard" element={<AdminDashboard />} />;
          <Route path="/active-bookings" element={<ActiveBookings />} />;
          {/* Default redirect to auth */}
          <Route path="/" element={<Navigate to="/auth" replace />} />
          {/* Auth Pages */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/register-official" element={<RegisterOfficial />} />
          {/* Protected Pages */}
          <Route path="/profile" element={<Profile />} />
          {/* Placeholder routes for links mentioned in Profile */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pay" element={<Pay />} />
          <Route path="/vehicle-register" element={<VehicleRegister />} />
          <Route path="/slots" element={<Slots />} />
          <Route path="/booking" element={<Booking />} />
        </Routes>
      </ConfirmProvider>
    </BrowserRouter>
  );
}

export default App;
