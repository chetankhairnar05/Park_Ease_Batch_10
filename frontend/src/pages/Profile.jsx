import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8080/api";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [location, setLocation] = useState({ lat: "", lon: "" });

  const token = localStorage.getItem("parkease_token");

  // --- IMPROVED FETCH FUNCTION ---
  const fetchAPI = async (endpoint, method = "GET", body = null) => {
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": token,
      },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, opts);

    // Check for success
    if (res.ok) {
      // Try parsing JSON, fallback to text if void response
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } else {
      // Extract error message from backend
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.message || json.error || "API Error");
      } catch {
        throw new Error(text || `HTTP Error ${res.status}`);
      }
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }

    const fetchData = async () => {
      try {
        const userData = await fetchAPI("/user/profile");
        setUser(userData);
        // Ensure we handle nulls gracefully
        if (userData.latitude !== null && userData.latitude !== undefined)
          setLocation((prev) => ({ ...prev, lat: userData.latitude }));
        if (userData.longitude !== null && userData.longitude !== undefined)
          setLocation((prev) => ({ ...prev, lon: userData.longitude }));

        const vehicleData = await fetchAPI("/user/vehicles");
        setVehicles(vehicleData);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate]);

  const handleTopUp = () => {
    if (!topUpAmount || parseFloat(topUpAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    window.location.href = `/pay?amount=${topUpAmount}`;
  };

  // --- FIXED LOCATION UPDATE ---
  const handleUpdateLoc = async () => {
    // 1. Validation
    if (!location.lat || !location.lon) {
      alert("Please enter both Latitude and Longitude");
      return;
    }

    // 2. Conversion (String -> Number)
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);

    if (isNaN(lat) || isNaN(lon)) {
      alert("Latitude and Longitude must be valid numbers");
      return;
    }

    try {
      await fetchAPI("/user/location", "PUT", {
        latitude: lat,
        longitude: lon,
      });
      alert("Location Saved Successfully!");
    } catch (e) {
      console.error(e);
      alert("Error saving location: " + e.message);
    }
  };

  const handleGeoLocate = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setLocation({ lat: p.coords.latitude, lon: p.coords.longitude });
        },
        (err) => {
          alert("Error getting location: " + err.message);
        },
      );
    } else {
      alert("Geolocation is not supported by your browser");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("parkease_token");
    localStorage.removeItem("parkease_user");
    navigate("/auth");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading...
      </div>
    );

  const isDriver = user?.role === "DRIVER";

  return (
    <div className="bg-gray-900 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col pb-20">
        {/* Header */}
        <header className="bg-white p-6 shadow-sm z-10 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        </header>

        <div className="p-6 space-y-8 overflow-y-auto flex-1">
          {/* User Info */}
          <div className="flex items-center gap-4 bg-gray-200 py-2 px-2 rounded-3xl">
            <div className="h-14 w-14 bg-indigo-300 text-indigo-900 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-indigo-50">
              {user.name?.charAt(0) || "U"}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {user.name}
              </h2>
              <p className="text-sm font-bold text-gray-900">{user.email}</p>
              <p className="text-sm font-bold text-gray-900">{user.phone}</p>
              <span className="text-[13px] bg-gray-300 text-gray-900 px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                {user.role}
              </span>
            </div>
          </div>

          {/* Wallet - Driver Only */}
          {isDriver && (
            <div className="bg-gray-900 rounded-2xl p-5 text-white shadow-xl">
              <p className="text-xs text-gray-400 mb-1">Wallet Balance</p>
              <div className="text-3xl font-bold mb-4">
                ₹{(user.walletBalance || 0).toFixed(2)}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="bg-gray-800 border-none rounded text-sm w-full px-3 py-2 text-white placeholder-gray-500"
                  placeholder="Amount"
                />
                <button
                  onClick={handleTopUp}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-bold"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Location - Driver Only */}
          {isDriver && (
            <div className="bg-gray-300 px-3 py-3 rounded-2xl">
              <h3 className="font-bold text-black text-sm mb-3">
                Location Settings
              </h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div>
                    <label className="font-bold text-xs">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={location.lat}
                      onChange={(e) =>
                        setLocation({ ...location, lat: e.target.value })
                      }
                      className="bg-gray-50 border border-gray-200 rounded text-xs p-2 w-full"
                      placeholder="Latitude"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-xs">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={location.lon}
                      onChange={(e) =>
                        setLocation({ ...location, lon: e.target.value })
                      }
                      className="bg-gray-50 border border-gray-200 rounded text-xs p-2 w-full"
                      placeholder="Longitude"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateLoc}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-xs font-bold hover:bg-gray-50"
                  >
                    Save Coords
                  </button>
                  <button
                    onClick={handleGeoLocate}
                    className="flex-1 text-indigo-600 text-md font-extrabold underline"
                  >
                    Auto-Detect GPS
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Vehicles - Driver Only */}
          {isDriver && (
            <div className="bg-gray-400 px-3 py-4 rounded-2xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-900 text-sm">My Vehicles</h3>
                <Link
                  to="/vehicle-register"
                  className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold"
                >
                  + Add
                </Link>
              </div>
              <div className="space-y-2">
                {vehicles.length === 0 ? (
                  <p className="text-xs text-center text-gray-400 py-2">
                    No vehicles.
                  </p>
                ) : (
                  vehicles.map((v, index) => (
                    <div
                      key={index}
                      className="bg-white p-3 rounded-lg border border-gray-100 flex justify-between items-center shadow-sm"
                    >
                      <div>
                        <div className="font-bold text-gray-800 text-sm">
                          {v.vehicle.model} {v.isPrimary && "⭐"}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {v.vehicle.registerNumber}
                        </div>
                      </div>
                      <span className="text-[10px] bg-gray-100 px-2 py-1 rounded font-bold text-gray-600 uppercase">
                        {v.vehicle.vehicleType}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full text-red-950 text-sm font-bold border border-red-300 bg-red-300 py-3 rounded-xl hover:bg-red-200"
          >
            Sign Out
          </button>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 p-2 flex justify-around items-center text-xs font-medium text-gray-400 z-50">
          <Link
            to="/dashboard"
            className="flex flex-col items-center p-2 hover:text-indigo-600 transition"
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Home
          </Link>
          {isDriver && (
            <>
              <Link
                to="/slots"
                className="flex flex-col items-center p-2 hover:text-indigo-600 transition"
              >
                <svg
                  className="w-6 h-6 mb-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Find
              </Link>
              <Link
                to="/active-bookings"
                className="flex flex-col items-center p-2 hover:text-indigo-600 transition"
              >
                <svg
                  className="w-6 h-6 mb-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Activity
              </Link>
            </>
          )}
          <Link
            to="/profile"
            className="flex flex-col items-center p-2 text-indigo-600"
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
            Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
