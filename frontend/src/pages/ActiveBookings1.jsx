import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";

const API_BASE = "http://localhost:8080/api";
const SOCKET_URL = "ws://localhost:8080/ws";
import { useConfirm } from "../context/ConfirmContext";

// --- INSERT TOAST COMPONENT HERE (OR IMPORT IT) ---
const Toast = ({ show, message, type, onClose }) => {
  if (!show) return null;
  const styles =
    type === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : "bg-red-50 border-red-200 text-red-800";
  return (
    <div
      className={`fixed top-5 right-5 z-[100] flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl ${styles} max-w-xs`}
    >
      <span className="text-lg">{type === "success" ? "✓" : "⚠️"}</span>
      <div className="flex-1">
        <p className="text-sm font-bold">
          {type === "success" ? "Success" : "Error"}
        </p>
        <p className="text-xs opacity-90 mt-0.5">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-gray-800 font-bold text-lg leading-none"
      >
        &times;
      </button>
    </div>
  );
};

export default function ActiveBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now()); // State to trigger re-render for timers

  // --- NEW: Notification State ---
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  // --- NEW: Helper to show Toast ---
  const showToast = (message, type = "error") => {
    setNotification({ show: true, message, type });
    // Auto hide after 4 seconds
    setTimeout(() => setNotification({ ...notification, show: false }), 4000);
  };

  const stompClientRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const token = localStorage.getItem("parkease_token");

  // Helper API Fetch
  const fetchAPI = async (endpoint, method = "GET", body = null) => {
    const headers = {
      "Content-Type": "application/json",
      "X-Auth-Token": token,
    };
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, opts);
    const text = await res.text();

    if (!res.ok) {
      try {
        const json = JSON.parse(text);
        throw new Error(json.error || json.message || text);
      } catch {
        throw new Error(text);
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }

    fetchBookings();
    connectWS();

    // Global Timer Tick (Updates every second to refresh UI timers)
    timerIntervalRef.current = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      if (stompClientRef.current) stompClientRef.current.deactivate();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [token, navigate]);

  const fetchBookings = async () => {
    try {
      const data = await fetchAPI("/bookings/list/active");
      // Filter out completed/cancelled just in case API returns them
      const active = Array.isArray(data)
        ? data.filter(
            (b) => b.status !== "CANCELLED_NO_SHOW" && b.status !== "COMPLETED",
          )
        : [];
      setBookings(active);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const connectWS = () => {
    const client = new Client({
      brokerURL: SOCKET_URL,
      connectHeaders: { "X-Auth-Token": token },
      debug: (str) => console.log(str),
      onConnect: () => {
        console.log("WS Connected");

        // 1. Data Update
        client.subscribe("/user/queue/booking-updates", (msg) => {
          // If status changes (like cancelled), refresh list
          fetchBookings();
        });

        // 2. Notifications
        client.subscribe("/user/queue/notifications", (msg) => {
          fetchBookings();
          // Optional: Toast notification here
        });
      },
    });
    client.activate();
    stompClientRef.current = client;
  };

  const handleArrive = async (id) => {
    if (!window.confirm("Simulate scanning QR code for arrival?")) return;
    try {
      await fetchAPI(`/bookings/${id}/arrive`, "POST");
      fetchBookings();
    } catch (e) {
      alert("Arrival Failed: " + e.message);
    }
  };

  // const handleArrive = async (id) => {
  //   if (!window.confirm("Simulate scanning QR code for arrival?")) return;
  //   try {
  //     await fetchAPI(`/bookings/${id}/arrive`, "POST");
  //     showToast("Arrival Confirmed! Timer Started.", "success"); // ✅ Success Toast
  //     fetchBookings();
  //   } catch (e) {
  //     showToast("Arrival Failed: " + e.message, "error"); // ✅ Error Toast
  //   }
  // };

  const handleExit = async (id) => {
    if (!window.confirm("End parking session and pay?")) return;
    try {
      const receipt = await fetchAPI(`/bookings/${id}/end`, "POST");
      const cost = receipt.amountPaid || receipt.finalParkingFee;
      alert(`✅ Payment Successful!\nAmount: ₹${cost.toFixed(2)}`);
      fetchBookings();
    } catch (e) {
      if (e.message.includes("Insufficient")) {
        if (window.confirm("Insufficient Wallet Balance! Top Up now?")) {
          navigate("/profile");
        }
      } else {
        alert("Exit Failed: " + e.message);
      }
    }
  };

  // Timer Helper
  const getElapsedTime = (startTime) => {
    const start = new Date(startTime).getTime();
    let seconds = Math.floor((now - start) / 1000);
    if (seconds < 0) seconds = 0;

    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const hDisplay = hours > 0 ? `${hours}:` : "";
    const mDisplay = mins.toString().padStart(2, "0");
    const sDisplay = s.toString().padStart(2, "0");

    return `${hDisplay}${mDisplay}:${sDisplay}`;
  };

  const formatStartedAt = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="bg-gray-800 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col pb-20">
        {/* Header */}
        <header className="bg-white p-4 shadow-sm z-20 flex justify-between items-center sticky top-0 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-800">My Activities</h1>
          <Link
            to="/dashboard"
            className="text-xs text-gray-500 font-medium hover:text-indigo-600"
          >
            Back
          </Link>
        </header>

        {/* Main Content */}
        <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
          {loading && (
            <div className="text-center py-10 text-gray-400 text-sm">
              Loading sessions...
            </div>
          )}

          {!loading && bookings.length === 0 && (
            <div className="text-center py-12 mt-4">
              <div className="text-4xl mb-3 opacity-50">😴</div>
              <h3 className="text-sm font-bold text-gray-800">
                No Active Sessions
              </h3>
              <p className="text-xs text-gray-400 mb-4 mt-1">
                You are not parked or reserved anywhere.
              </p>
              <Link
                to="/slots"
                className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-full text-xs font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
              >
                Find Parking
              </Link>
            </div>
          )}

          <div className="space-y-4">
            {bookings.map((b) => {
              const isReserved = b.status === "RESERVED";
              const statusColor = isReserved
                ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-emerald-100 text-emerald-800 border-emerald-200";
              const startTime = isReserved ? b.reservationTime : b.arrivalTime;

              return (
                <div
                  key={b.id}
                  className="bg-gray-400 rounded-2xl shadow-sm border border-gray-100 p-5 fade-in relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-gray-900 px-3 py-2 rounded-2xl">
                      <h3 className="font-bold text-md text-white truncate w-48">
                        {b.areaName || "Unknown Area"}
                      </h3>
                      <div className="text-sm text-white font-mono mt-0.5">
                        Slot: {b.slotNumber}
                      </div>
                    </div>
                    <span
                      className={`px-1 py-1 rounded text-[10px] font-bold uppercase border ${statusColor}`}
                    >
                      {b.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 mb-5 bg-gray-50 p-3 rounded-xl border border-gray-50">
                    <div className="bg-white p-2 rounded-lg shadow-sm text-lg">
                      🚗
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                        Vehicle
                      </div>
                      <div className=" text-md text-gray-800 font-medium">
                        {b.vehicleNumber}
                      </div>
                    </div>
                  </div>

                  <div className="text-center mb-5">
                    <div className="text-[10px] text-black uppercase tracking-widest mb-1">
                      {isReserved ? "Time Reserved" : "Parking Duration"}
                    </div>
                    <div className="text-2xl font-black font-bold text-black tracking-tight">
                      {getElapsedTime(startTime)}
                    </div>
                    <div className="text-[13px] font-bold text-black mt-1">
                      Started: {formatStartedAt(startTime)}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {isReserved ? (
                      <button
                        onClick={() => handleArrive(b.id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        Scan Arrival
                      </button>
                    ) : (
                      <button
                        onClick={() => handleExit(b.id)}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-rose-100 transition transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        Stop & Pay
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
            className="flex flex-col items-center p-2 text-indigo-600"
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            Activity
          </Link>
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
