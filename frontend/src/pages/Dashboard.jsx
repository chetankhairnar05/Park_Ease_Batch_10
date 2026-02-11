// ============================================================================
// USER DASHBOARD COMPONENT
// ============================================================================
// Main landing page showing: wallet balance, active session, vehicles, history
// Features: Role-based console links, CSV export, booking history with details
// ============================================================================

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8080/api";

export default function Dashboard() {
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const navigate = useNavigate();

  // User profile data
  const [user, setUser] = useState({
    name: "User",
    walletBalance: 0,
    role: "",
  });

  // Current active booking (if any)
  const [activeBooking, setActiveBooking] = useState(null);

  // User's registered vehicles
  const [vehicles, setVehicles] = useState([]);

  // Booking history (completed/cancelled sessions)
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Expanded history item ID (for details view)
  const [expandedHistId, setExpandedHistId] = useState(null);

  // Date range for CSV export filtering
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const token = localStorage.getItem("parkease_token");

  // ---------------------------------------------------------------------------
  // HELPER: API Fetch
  // ---------------------------------------------------------------------------
  const fetchAPI = async (endpoint) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": token,
      },
    });
    if (!res.ok) throw new Error("API Error");
    return res.json();
  };

  // ---------------------------------------------------------------------------
  // EFFECT: Initialize Dashboard Data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }

    const init = async () => {
      try {
        // 1. Load user profile
        const userData = await fetchAPI("/user/profile");
        setUser(userData);

        // Role-based navigation (can be enabled if needed)
        if (userData.role === "AREA_OWNER") {
          console.log("Redirect to Owner Dashboard");
          // navigate("/owner-dashboard");
        } else if (userData.role === "ADMIN") {
          console.log("Redirect to Admin Dashboard");
          // navigate("/admin-dashboard");
        }

        // 2. Load user vehicles
        try {
          const vehs = await fetchAPI("/user/vehicles");
          setVehicles(vehs);
        } catch (e) {
          console.error("Error loading vehicles", e);
        }

        // 3. Load booking history
        try {
          const histData = await fetchAPI("/bookings/list/history");
          setHistory(histData);
        } catch (e) {
          console.error("Failed to load history");
        } finally {
          setLoadingHistory(false);
        }

        // 4. Check for active booking
        try {
          const res = await fetch(`${API_BASE}/bookings/active`, {
            headers: { "X-Auth-Token": token },
          });
          if (res.status === 200) {
            const booking = await res.json();
            setActiveBooking(booking);
          }
        } catch (e) {
          console.log("No active session");
        }
      } catch (error) {
        console.error("Init failed", error);
      }
    };

    init();
  }, [token, navigate]);

  // ---------------------------------------------------------------------------
  // EXPORT: Generate CSV from History
  // ---------------------------------------------------------------------------
  // Filters by date range and exports booking data
  const handleExport = () => {
    const { start, end } = dateRange;
    if (!history.length) return;

    // Filter by date range
    const filtered = history.filter((item) => {
      if (!start && !end) return true;
      const itemDate = new Date(item.reservationTime || item.bookingTime);
      const startDate = start ? new Date(start) : new Date("1970-01-01");
      const endDate = end ? new Date(end) : new Date("2100-01-01");
      endDate.setHours(23, 59, 59, 999); // Include full end day
      return itemDate >= startDate && itemDate <= endDate;
    });

    // Transform to flat structure for CSV
    const flatData = filtered.map((b) => {
      const time = new Date(
        b.reservationTime || b.bookingTime,
      ).toLocaleString();

      // Calculate final amount based on status
      let finalAmount = 0;
      if (b.status === "COMPLETED")
        finalAmount = (b.finalReservationFee || 0) + (b.finalParkingFee || 0);
      else if (b.amountPaid > 0) finalAmount = b.amountPaid;
      else finalAmount = b.amountPending || 0;

      return {
        "Booking ID": b.id,
        Date: time,
        Area: b.areaName,
        Vehicle: b.vehicleNumber,
        Slot: b.slotNumber,
        Status: b.status,
        "Amount (INR)": finalAmount.toFixed(2),
      };
    });

    // Generate CSV string
    const headers = [
      "Booking ID",
      "Date",
      "Area",
      "Vehicle",
      "Slot",
      "Status",
      "Amount (INR)",
    ];
    const csvContent = [
      headers.join(","),
      ...flatData.map((row) =>
        headers
          .map((fieldName) => JSON.stringify(row[fieldName] || ""))
          .join(","),
      ),
    ].join("\n");

    // Trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "parking_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------------------------------------------------------------------------
  // HELPER: Toggle History Item Details
  // ---------------------------------------------------------------------------
  const toggleDetails = (id) => {
    setExpandedHistId(expandedHistId === id ? null : id);
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="bg-gray-800 min-h-screen flex justify-center font-sans">
      {/* Mobile-first container */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col pb-20">

        {/* ===================================================================
            HEADER - App branding and user greeting
        =================================================================== */}
        <header className="bg-indigo-500 flex items-center justify-between text-white mb-1 px-9 py-2 rounded-3xl shadow-lg z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 p-1.5 rounded-lg text-lg">🅿️</span>
              <h1 className="text-xl font-bold tracking-tight">Park Ease</h1>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-indigo-200 text-xs">Welcome back,</p>
            <h2 className="text-2xl font-bold">{user.name.split(" ")[0]}</h2>
          </div>
        </header>

        {/* ===================================================================
            WALLET BALANCE DISPLAY
        =================================================================== */}
        <div className="mx-4 px-2 py-1 rounded-full text-sm font-medium bg-gray-600/40">
          <span>Your Wallet Balance is : </span>
          <span>₹{(user.walletBalance || 0).toFixed(2)}</span>
        </div>

        {/* ===================================================================
            MAIN CONTENT - Cards, vehicles, quick actions
        =================================================================== */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">

          {/* ---------------------------------------------------------
              ACTIVE BOOKING CARD (shown if user has ongoing session)
          --------------------------------------------------------- */}
          {activeBooking && (
            <div className="bg-indigo-200 border border-indigo-100 p-4 rounded-xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-70 text-6xl">
                ⏱️
              </div>
              <h3 className="text-indigo-900 font-bold text-lg mb-1">
                Active Session
              </h3>
              <p className="text-indigo-600 text-xs mb-3">
                Status: {activeBooking.status}
              </p>
              <Link
                to="/active-bookings"
                className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition"
              >
                View Timer & Pay
              </Link>
            </div>
          )}

          {/* ---------------------------------------------------------
              ROLE-BASED CONSOLES
              Shows management dashboard links for staff roles
          --------------------------------------------------------- */}
          {(user.role === "ADMIN" ||
            user.role === "AREA_OWNER" ||
            user.role === "GUARD") && (
            <div className="bg-gray-200 p-3 rounded-2xl">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Management for {user.role}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Area Owner Console */}
                {(user.role === "AREA_OWNER" || user.role === "ADMIN") && (
                  <Link
                    to="/owner-dashboard"
                    className="flex flex-col items-center justify-center p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-bold text-xs shadow-sm hover:bg-amber-100"
                  >
                    <span>🏢</span> Area-Owner Console
                  </Link>
                )}

                {/* Admin Dashboard */}
                {user.role === "ADMIN" && (
                  <Link
                    to="/admin-dashboard"
                    className="flex flex-col items-center justify-center p-4 bg-pink-50 border border-pink-200 rounded-xl text-pink-800 font-bold text-xs shadow-sm hover:bg-pink-100"
                  >
                    <span>⚡</span> Admin Dashboard
                  </Link>
                )}

                {/* Guard Dashboard */}
                {user.role === "GUARD" && (
                  <Link
                    to="/guard-dashboard"
                    className="flex flex-col items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 font-bold text-xs shadow-sm hover:bg-blue-100"
                  >
                    <span>👮</span> Guard Dashboard
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------
              FIND PARKING PROMO CARD
          --------------------------------------------------------- */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-5 rounded-2xl shadow-lg">
            <h3 className="font-bold text-lg mb-1">Find Parking Near You</h3>
            <p className="text-gray-400 text-xs mb-4">
              Real-time availability map.
            </p>
            <Link
              to="/slots"
              className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 transition inline-block"
            >
              Search Map
            </Link>
          </div>

          {/* ---------------------------------------------------------
              MY VEHICLES SECTION
          --------------------------------------------------------- */}
          <div className="mx-0 px-4 py-7 rounded-2xl bg-gray-400">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900 text-sm">My Vehicles</h3>
              <Link
                to="/vehicle-register"
                className="text-xs bg-indigo-700 text-white px-2 py-1 rounded font-bold"
              >
                + Add
              </Link>
            </div>
            <div className="space-y-2">
              {vehicles.length === 0 ? (
                <p className="text-xs text-center text-gray-400 py-2">
                  Loading...
                </p>
              ) : (
                vehicles.map((i, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-3 rounded-lg border border-gray-100 flex justify-between items-center shadow-sm"
                  >
                    <div>
                      {/* Vehicle model with star for primary */}
                      <div className="font-bold text-gray-800 text-sm">
                        {i.vehicle.model} {i.isPrimary ? "⭐" : ""}
                      </div>
                      {/* Registration number */}
                      <div className="text-xs text-gray-500 font-mono">
                        {i.vehicle.registerNumber}
                      </div>
                    </div>
                    {/* Vehicle type badge */}
                    <span className="text-[10px] bg-gray-100 px-2 py-1 rounded font-bold text-gray-600 uppercase">
                      {i.vehicle.vehicleType}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ===================================================================
            HISTORY & REPORTS SECTION
        =================================================================== */}
        <div className="h-96 p-3 m-1 overflow-auto border-2 border-gray-600 bg-gray-300 rounded-3xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="mt-4 border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                History & Reports
              </h2>
            </div>

            {/* CSV Export Controls */}
            <div className="bg-gray-50 p-3 rounded-xl mb-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-2 font-bold">
                Generate CSV Report
              </p>
              <div className="flex gap-2 mb-2">
                {/* Start date */}
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400">From</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, start: e.target.value })
                    }
                    className="w-full text-xs p-1 rounded border border-gray-300"
                  />
                </div>
                {/* End date */}
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400">To</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, end: e.target.value })
                    }
                    className="w-full text-xs p-1 rounded border border-gray-300"
                  />
                </div>
              </div>
              {/* Export button */}
              <button
                onClick={handleExport}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded flex justify-center items-center gap-1"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download CSV
              </button>
            </div>

            {/* Loading state */}
            {loadingHistory && (
              <div className="text-center py-4 text-xs text-gray-400">
                Loading recent history...
              </div>
            )}

            {/* History list */}
            <div className="space-y-3 pb-4">
              {/* Empty state */}
              {!loadingHistory && history.length === 0 && (
                <div className="text-center text-xs text-gray-400">
                  No past bookings found.
                </div>
              )}

              {/* Map through history items */}
              {history.map((b) => {
                const isCompleted = b.status === "COMPLETED";
                const fResFee = b.finalReservationFee || 0;
                const fParkFee = b.finalParkingFee || 0;
                const amtPaid = b.amountPaid || 0;
                const amtPending = b.amountPending || 0;

                // Status badge color
                const statusColor =
                  amtPending > 0
                    ? "text-red-600 bg-red-50"
                    : "text-green-600 bg-green-50";

                // Calculate display amount based on status
                let displayAmount;
                if (isCompleted) {
                  displayAmount = (
                    <span className="font-bold text-gray-950">
                      ₹{(fResFee + fParkFee).toFixed(2)}
                    </span>
                  );
                } else if (
                  b.status === "CANCELLED_NO_SHOW" ||
                  b.status === "DEFAULTED"
                ) {
                  if (amtPaid > 0)
                    displayAmount = (
                      <span className="font-bold text-red-600">
                        Penalty Paid: ₹{amtPaid.toFixed(2)}
                      </span>
                    );
                  else
                    displayAmount = (
                      <span className="font-bold text-red-600">
                        Pending: ₹{amtPending.toFixed(2)}
                      </span>
                    );
                }

                const displayTime =
                  b.bookingTime ||
                  b.reservationTime ||
                  new Date().toISOString();
                const isExpanded = expandedHistId === b.id;

                return (
                  <div
                    key={b.id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                  >
                    {/* Summary row (clickable) */}
                    <div
                      className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
                      onClick={() => toggleDetails(b.id)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Status icon */}
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center text-md font-bold ${statusColor}`}
                        >
                          {amtPending > 0 ? "✕" : "✓"}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-950">
                            {b.areaName || "Unknown"}
                          </h4>
                          <div className="text-[12px] text-gray-950">
                            {new Date(displayTime).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold">
                          {b.status.replace(/_/g, " ")}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          ID: {b.id} ▼
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="bg-gray-50 p-4 border-t border-gray-100 text-sm text-gray-950">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {/* Vehicle */}
                          <div>
                            <span className="block text-gray-950 text-[10px]">
                              Vehicle
                            </span>
                            {b.vehicleNumber || "--"}
                          </div>
                          {/* Slot */}
                          <div>
                            <span className="block text-gray-950 text-[10px]">
                              Slot
                            </span>
                            {b.slotNumber || "--"}
                          </div>
                          {/* Reservation fee */}
                          <div>
                            <span className="block text-gray-950 text-[10px]">
                              Reservation Fee
                            </span>
                            ₹{fResFee.toFixed(2)}
                          </div>
                          {/* Parking fee */}
                          <div>
                            <span className="block text-gray-950 text-[10px]">
                              Parking Fee
                            </span>
                            ₹{fParkFee.toFixed(2)}
                          </div>
                        </div>
                        {/* Total */}
                        <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                          <span className="font-bold">Session Total:</span>
                          {displayAmount}
                        </div>
                        {/* Debt warning */}
                        {!isCompleted && amtPending > 0 && (
                          <div className="mt-2 text-[12px] text-amber-950 bg-amber-50 p-2 rounded border border-amber-100">
                            ⚠️ Debt added. Will be deducted in next booking.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===================================================================
            BOTTOM NAVIGATION BAR
        =================================================================== */}
        <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 p-2 flex justify-around items-center text-xs font-medium text-gray-400 z-50">
          {/* Home (active) */}
          <Link
            to="/dashboard"
            className="flex flex-col items-center p-2 text-indigo-600"
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Home
          </Link>

          {/* Find parking */}
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

          {/* Activity */}
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

          {/* Profile */}
          <Link
            to="/profile"
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
