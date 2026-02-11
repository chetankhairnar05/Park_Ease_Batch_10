// ACTIVE BOOKINGS COMPONENT
// This component displays all active parking sessions (both reserved and in-progress)
// It provides real-time updates via WebSocket and allows users to:
// - View their current parking sessions with live timers
// - Simulate arrival (for reserved slots)
// - End parking and process payment

import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs"; // WebSocket client for real-time updates

// CONFIGURATION CONSTANTS
const API_BASE = "http://localhost:8080/api"; // Backend REST API base URL
const SOCKET_URL = "ws://localhost:8080/ws";  // WebSocket endpoint for real-time updates

import { useConfirm } from "../context/ConfirmContext"; // Custom confirmation dialog hook

// TOAST NOTIFICATION COMPONENT
// Displays success/error messages to the user with auto-dismiss functionality
// Props:
// - show: boolean - controls visibility
// - message: string - the notification text
// - type: "success" | "error" - determines styling
// - onClose: function - callback when user closes the toast

const Toast = ({ show, message, type, onClose }) => {
  // Don't render anything if toast is hidden
  if (!show) return null;

  // Conditional styling based on notification type
  const styles =
    type === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800" // Green for success
      : "bg-red-50 border-red-200 text-red-800";             // Red for errors

  return (
    <div
      className={`fixed top-5 right-5 z-[100] flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl ${styles} max-w-xs`}
    >
      {/* Icon: Checkmark for success, Warning for error */}
      <span className="text-lg">{type === "success" ? "✓" : "⚠️"}</span>

      {/* Message content */}
      <div className="flex-1">
        <p className="text-sm font-bold">
          {type === "success" ? "Success" : "Error"}
        </p>
        <p className="text-xs opacity-90 mt-0.5">{message}</p>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-gray-800 font-bold text-lg leading-none"
      >
        &times;
      </button>
    </div>
  );
};

// MAIN COMPONENT: ActiveBookings
export default function ActiveBookings() {

  // HOOKS & CONTEXT
  const navigate = useNavigate();    // For programmatic navigation
  const confirm = useConfirm();       // Custom confirmation dialog

  // STATE MANAGEMENT

  // Bookings array: Stores all active parking sessions
  // Each booking contains: id, areaName, slotNumber, vehicleNumber, status, times, etc.
  const [bookings, setBookings] = useState([]);

  // Loading state: Shows spinner while fetching data
  const [loading, setLoading] = useState(true);

  // Now timestamp: Updated every second to keep timers accurate
  // This triggers re-renders to update the elapsed time display
  const [now, setNow] = useState(Date.now());

  // Notification state: Controls toast visibility and content
  const [notification, setNotification] = useState({
    show: false,      // Visibility toggle
    message: "",      // Notification text
    type: "",         // "success" or "error"
  });

  // REFS (Non-reactive values that persist across renders)

  // WebSocket client reference - maintains connection throughout component lifecycle
  const stompClientRef = useRef(null);

  // Timer interval reference - for the 1-second tick that updates 'now'
  const timerIntervalRef = useRef(null);

  // AUTHENTICATION
  // Retrieve JWT token from localStorage (set during login)
  const token = localStorage.getItem("parkease_token");

  // HELPER: Show Toast Notification

  // Displays a toast message and auto-hides it after 4 seconds
  // Parameters:
  // - message: The text to display
  // - type: "success" or "error" (defaults to "error")
  const showToast = (message, type = "error") => {
    setNotification({ show: true, message, type });

    // Auto-hide after 4 seconds
    setTimeout(() => setNotification({ ...notification, show: false }), 4000);
  };

  // HELPER: Generic API Fetch Function
  // Centralized function for making authenticated API calls
  // Parameters:
  // - endpoint: API path (e.g., "/bookings/list/active")
  // - method: HTTP method (GET, POST, etc.)
  // - body: Request payload (optional, for POST/PUT)
  //
  // Returns: Parsed JSON response or plain text
  // Throws: Error with backend error message if request fails

  const fetchAPI = async (endpoint, method = "GET", body = null) => {
    // Set headers with authentication token
    const headers = {
      "Content-Type": "application/json",
      "X-Auth-Token": token, // JWT token for authentication
    };

    // Build fetch options
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    // Make the request
    const res = await fetch(`${API_BASE}${endpoint}`, opts);
    const text = await res.text();

    // Handle non-OK responses (4xx, 5xx)
    if (!res.ok) {
      try {
        // Try to parse error as JSON
        const json = JSON.parse(text);
        throw new Error(json.error || json.message || text);
      } catch {
        // If parsing fails, throw raw text
        throw new Error(text);
      }
    }

    // Parse successful response
    try {
      return JSON.parse(text);
    } catch {
      // Return plain text if not JSON
      return text;
    }
  };

  // EFFECT: Component Initialization & Cleanup
  // Runs once on mount:
  // 1. Checks authentication
  // 2. Fetches initial booking data
  // 3. Establishes WebSocket connection
  // 4. Starts timer interval for live elapsed time
  // 5. Cleans up on unmount

  useEffect(() => {
    // Redirect to auth page if no token found
    if (!token) {
      navigate("/auth");
      return;
    }

    // Fetch initial bookings data
    fetchBookings();

    // Establish WebSocket connection for real-time updates
    connectWS();

    // Start interval to update 'now' every second
    // This causes re-renders and updates the timer displays
    timerIntervalRef.current = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    // Cleanup function: runs when component unmounts
    return () => {
      // Close WebSocket connection
      if (stompClientRef.current) stompClientRef.current.deactivate();

      // Clear timer interval
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [token, navigate]); // Re-run if token or navigate changes

  // API CALL: Fetch Active Bookings------------------
  // Retrieves all active parking sessions from the backend
  // Filters out completed/cancelled bookings (defensive programming)
  // Updates the bookings state and loading flag

  const fetchBookings = async () => {
    try {
      // Call GET /api/bookings/list/active
      const data = await fetchAPI("/bookings/list/active");

      // Filter to ensure only active bookings are displayed
      // Backend should handle this, but we filter defensively
      const active = Array.isArray(data)
        ? data.filter(
            (b) => b.status !== "CANCELLED_NO_SHOW" && b.status !== "COMPLETED",
          )
        : [];

      // Update state with filtered bookings
      setBookings(active);
    } catch (e) {
      // Log error but don't break UI (could show error toast here)
      console.error(e);
    } finally {
      // Always hide loading spinner
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // WEBSOCKET: Establish Real-Time Connection
  // ---------------------------------------------------------------------------
  // Creates a WebSocket connection using STOMP protocol
  // Subscribes to two channels:
  // 1. /user/queue/booking-updates - for booking status changes
  // 2. /user/queue/notifications - for general notifications
  //
  // When messages arrive, re-fetches bookings to stay in sync
  // ---------------------------------------------------------------------------
  const connectWS = () => {
    // Create STOMP client with configuration
    const client = new Client({
      brokerURL: SOCKET_URL,                    // WebSocket URL
      connectHeaders: { "X-Auth-Token": token }, // Auth header for WS handshake
      debug: (str) => console.log(str),         // Log WS messages for debugging

      // Callback when connection is established
      onConnect: () => {
        console.log("WS Connected");

        // SUBSCRIPTION 1: Booking Updates
        // Triggered when booking status changes (e.g., admin cancels, slot expires)
        client.subscribe("/user/queue/booking-updates", (msg) => {
          // Refresh the bookings list to reflect changes
          fetchBookings();
        });

        // SUBSCRIPTION 2: General Notifications
        // Triggered for other events (e.g., system messages, warnings)
        client.subscribe("/user/queue/notifications", (msg) => {
          // Refresh bookings and optionally show a toast
          fetchBookings();
          // TODO: Could parse msg.body and show specific toast notification
        });
      },
    });

    // Activate the WebSocket connection
    client.activate();

    // Store reference for cleanup on unmount
    stompClientRef.current = client;
  };

  // ---------------------------------------------------------------------------
  // ACTION: Handle Arrival (for RESERVED bookings)
  // ---------------------------------------------------------------------------
  // Simulates QR code scan at parking entrance
  // Transitions booking from RESERVED -> PARKED status
  // Starts the parking timer
  //
  // Parameters:
  // - id: Booking ID to mark as arrived
  // ---------------------------------------------------------------------------
  const handleArrive = async (id) => {
    // Show confirmation dialog before proceeding
    if (
      !(await confirm(
        "Simulate scanning QR code for arrival?",
        "Confirm Arrival",
      ))
    )
      return; // User cancelled

    try {
      // Call POST /api/bookings/{id}/arrive
      await fetchAPI(`/bookings/${id}/arrive`, "POST");

      // Refresh bookings to show updated status (PARKED)
      fetchBookings();

      // Optional: Show success toast (currently commented out)
      // showToast("Arrival Confirmed! Timer Started.", "success");
    } catch (e) {
      // Show error alert if arrival fails
      alert("Arrival Failed: " + e.message);

      // Optional: Show error toast (currently commented out)
      // showToast("Arrival Failed: " + e.message, "error");
    }
  };

  // ---------------------------------------------------------------------------
  // ACTION: Handle Exit (for PARKED bookings)
  // ---------------------------------------------------------------------------
  // Ends the parking session and processes payment
  // Flow:
  // 1. User confirms exit
  // 2. Backend calculates final cost
  // 3. Deducts from wallet
  // 4. Returns receipt
  // 5. Shows payment confirmation
  //
  // Special case: If wallet has insufficient funds, prompts top-up
  //
  // Parameters:
  // - id: Booking ID to end
  // ---------------------------------------------------------------------------
  const handleExit = async (id) => {
    // Show confirmation dialog
    if (!(await confirm("End parking session and pay?", "Confirm Exit")))
      return; // User cancelled

    try {
      // Call POST /api/bookings/{id}/end
      // Backend returns a receipt object with payment details
      const receipt = await fetchAPI(`/bookings/${id}/end`, "POST");

      // Extract cost from receipt
      const cost = receipt.amountPaid || receipt.finalParkingFee;

      // Show success alert with amount paid
      alert(`✅ Payment Successful!\nAmount: ₹${cost.toFixed(2)}`);

      // Refresh bookings (this one will be removed from active list)
      fetchBookings();
    } catch (e) {
      // Handle specific error: Insufficient wallet balance
      if (e.message.includes("Insufficient")) {
        // Ask if user wants to top up wallet
        if (
          await confirm(
            "Insufficient Wallet Balance! Top Up now?",
            "Low Balance",
          )
        ) {
          // Navigate to profile page (where wallet top-up is available)
          navigate("/profile");
        }
      } else {
        // Generic error handling
        alert("Exit Failed: " + e.message);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // HELPER: Calculate Elapsed Time
  // ---------------------------------------------------------------------------
  // Converts a start timestamp into a human-readable elapsed time string
  // Format: "HH:MM:SS" or "MM:SS" (hours only shown if >= 1 hour)
  //
  // Parameters:
  // - startTime: ISO timestamp string (e.g., "2024-01-15T10:30:00")
  //
  // Returns: Formatted string like "1:23:45" or "23:45"
  // ---------------------------------------------------------------------------
  const getElapsedTime = (startTime) => {
    // Convert start time to milliseconds
    const start = new Date(startTime).getTime();

    // Calculate difference in seconds
    let seconds = Math.floor((now - start) / 1000);

    // Prevent negative times (in case of clock skew)
    if (seconds < 0) seconds = 0;

    // Break down into hours, minutes, seconds
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    // Format: Only show hours if > 0
    const hDisplay = hours > 0 ? `${hours}:` : "";
    const mDisplay = mins.toString().padStart(2, "0");  // Always 2 digits
    const sDisplay = s.toString().padStart(2, "0");     // Always 2 digits

    return `${hDisplay}${mDisplay}:${sDisplay}`;
  };

  // ---------------------------------------------------------------------------
  // HELPER: Format Start Time
  // ---------------------------------------------------------------------------
  // Converts ISO timestamp to 12/24-hour time format
  // Example: "2024-01-15T10:30:45" -> "10:30:45"
  //
  // Parameters:
  // - dateStr: ISO timestamp string
  //
  // Returns: Formatted time string
  // ---------------------------------------------------------------------------
  const formatStartedAt = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="bg-gray-800 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col pb-20">

        {/* ===================================================================
            HEADER - Sticky top navigation
        =================================================================== */}
        <header className="bg-white p-4 shadow-sm z-20 flex justify-between items-center sticky top-0 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-800">My Activities</h1>
          <Link
            to="/dashboard"
            className="text-xs text-gray-500 font-medium hover:text-indigo-600"
          >
            Back
          </Link>
        </header>

        {/* MAIN CONTENT AREA - Scrollable list of bookings*/}
        <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">

          {/* LOADING STATE: Show while fetching data */}
          {loading && (
            <div className="text-center py-10 text-gray-400 text-sm">
              Loading sessions...
            </div>
          )}

          {/* EMPTY STATE: Show when no active bookings */}
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

          {/* ===============================================================
              BOOKINGS LIST - Map through active sessions
          =============================================================== */}
          <div className="space-y-4">
            {bookings.map((b) => {
              // Determine if this booking is reserved or actively parked
              const isReserved = b.status === "RESERVED";

              // Set color scheme based on status
              const statusColor = isReserved
                ? "bg-amber-100 text-amber-800 border-amber-200"  // Yellow for reserved
                : "bg-emerald-100 text-emerald-800 border-emerald-200"; // Green for parked

              // Determine which timestamp to use for timer
              // - RESERVED: Show time since reservation
              // - PARKED: Show time since arrival
              const startTime = isReserved ? b.reservationTime : b.arrivalTime;

              return (
                <div
                  key={b.id}
                  className="bg-gray-400 rounded-2xl shadow-sm border border-gray-100 p-5 fade-in relative overflow-hidden"
                >

                  {/* ---------------------------------------------------------
                      BOOKING HEADER - Area name, slot number, status
                  --------------------------------------------------------- */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-gray-900 px-3 py-2 rounded-2xl">
                      {/* Parking area name */}
                      <h3 className="font-bold text-md text-white truncate w-48">
                        {b.areaName || "Unknown Area"}
                      </h3>
                      {/* Slot number */}
                      <div className="text-sm text-white font-mono mt-0.5">
                        Slot: {b.slotNumber}
                      </div>
                    </div>

                    {/* Status badge (RESERVED or PARKED) */}
                    <span
                      className={`px-1 py-1 rounded text-[10px] font-bold uppercase border ${statusColor}`}
                    >
                      {b.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* ---------------------------------------------------------
                      VEHICLE INFO - Shows registered vehicle number
                  --------------------------------------------------------- */}
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

                  {/* ---------------------------------------------------------
                      TIMER DISPLAY - Live elapsed time counter
                  --------------------------------------------------------- */}
                  <div className="text-center mb-5">
                    {/* Label changes based on status */}
                    <div className="text-[10px] text-black uppercase tracking-widest mb-1">
                      {isReserved ? "Time Reserved" : "Parking Duration"}
                    </div>

                    {/* Large timer display (updates every second via 'now' state) */}
                    <div className="text-2xl font-black font-bold text-black tracking-tight">
                      {getElapsedTime(startTime)}
                    </div>

                    {/* Static start time for reference */}
                    <div className="text-[13px] font-bold text-black mt-1">
                      Started: {formatStartedAt(startTime)}
                    </div>
                  </div>

                  {/* ---------------------------------------------------------
                      ACTION BUTTONS - Different based on status
                  --------------------------------------------------------- */}
                  <div className="flex gap-3">
                    {isReserved ? (
                      // RESERVED STATUS: Show "Scan Arrival" button
                      <button
                        onClick={() => handleArrive(b.id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        Scan Arrival
                      </button>
                    ) : (
                      // PARKED STATUS: Show "Stop & Pay" button
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

        {/* ===================================================================
            BOTTOM NAVIGATION BAR - Fixed navigation to other sections
        =================================================================== */}
        <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 p-2 flex justify-around items-center text-xs font-medium text-gray-400 z-50">

          {/* Home link */}
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

          {/* Find parking link */}
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

          {/* Activity link (current page - highlighted) */}
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

          {/* Profile link */}
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
