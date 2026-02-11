// ============================================================================
// ACTIVE BOOKINGS COMPONENT (Standard Confirm Version)
// ============================================================================
// This component displays all active parking sessions (both reserved and in-progress)
// It provides real-time updates via WebSocket and allows users to:
// - View their current parking sessions with live timers
// - Simulate arrival (for reserved slots)
// - End parking and process payment
// NOTE: This version uses window.confirm() instead of custom confirm dialog
// ============================================================================

import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs"; // WebSocket client for real-time updates

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================
const API_BASE = "http://localhost:8080/api"; // Backend REST API base URL
const SOCKET_URL = "ws://localhost:8080/ws";  // WebSocket endpoint for real-time updates

import { useConfirm } from "../context/ConfirmContext"; // Custom confirmation dialog hook (imported but not used in current code)

// ============================================================================
// TOAST NOTIFICATION COMPONENT
// ============================================================================
// Displays success/error messages to the user with auto-dismiss functionality
// Props:
// - show: boolean - controls visibility
// - message: string - the notification text
// - type: "success" | "error" - determines styling
// - onClose: function - callback when user closes the toast
//
// USAGE NOTE: This component is defined but the showToast calls are commented out
// in the current implementation (using alert() instead)
// ============================================================================
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

// ============================================================================
// MAIN COMPONENT: ActiveBookings
// ============================================================================
export default function ActiveBookings() {
  // ---------------------------------------------------------------------------
  // HOOKS & CONTEXT
  // ---------------------------------------------------------------------------
  const navigate = useNavigate(); // For programmatic navigation

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------

  // Bookings array: Stores all active parking sessions
  // Each booking contains: id, areaName, slotNumber, vehicleNumber, status, times, etc.
  const [bookings, setBookings] = useState([]);

  // Loading state: Shows spinner while fetching data
  const [loading, setLoading] = useState(true);

  // Now timestamp: Updated every second to keep timers accurate
  // This triggers re-renders to update the elapsed time display
  const [now, setNow] = useState(Date.now());

  // ---------------------------------------------------------------------------
  // NOTIFICATION STATE (Currently unused - alerts are used instead)
  // ---------------------------------------------------------------------------
  // Notification state: Controls toast visibility and content
  // NOTE: showToast() calls are currently commented out in favor of alert()
  const [notification, setNotification] = useState({
    show: false,      // Visibility toggle
    message: "",      // Notification text
    type: "",         // "success" or "error"
  });

  // ---------------------------------------------------------------------------
  // HELPER: Show Toast Notification (Currently unused)
  // ---------------------------------------------------------------------------
  // Displays a toast message and auto-hides it after 4 seconds
  // Parameters:
  // - message: The text to display
  // - type: "success" or "error" (defaults to "error")
  //
  // NOTE: This function is defined but commented out in actual usage
  // The code currently uses window.confirm() and alert() instead
  // ---------------------------------------------------------------------------
  const showToast = (message, type = "error") => {
    setNotification({ show: true, message, type });

    // Auto-hide after 4 seconds
    setTimeout(() => setNotification({ ...notification, show: false }), 4000);
  };

  // ---------------------------------------------------------------------------
  // REFS (Non-reactive values that persist across renders)
  // ---------------------------------------------------------------------------

  // WebSocket client reference - maintains connection throughout component lifecycle
  const stompClientRef = useRef(null);

  // Timer interval reference - for the 1-second tick that updates 'now'
  const timerIntervalRef = useRef(null);

  // ---------------------------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------------------------
  // Retrieve JWT token from localStorage (set during login)
  const token = localStorage.getItem("parkease_token");

  // ---------------------------------------------------------------------------
  // HELPER: Generic API Fetch Function
  // ---------------------------------------------------------------------------
  // Centralized function for making authenticated API calls
  // Parameters:
  // - endpoint: API path (e.g., "/bookings/list/active")
  // - method: HTTP method (GET, POST, etc.)
  // - body: Request payload (optional, for POST/PUT)
  //
  // Returns: Parsed JSON response or plain text
  // Throws: Error with backend error message if request fails
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // EFFECT: Component Initialization & Cleanup
  // ---------------------------------------------------------------------------
  // Runs once on mount:
  // 1. Checks authentication
  // 2. Fetches initial booking data
  // 3. Establishes WebSocket connection
  // 4. Starts timer interval for live elapsed time
  // 5. Cleans up on unmount
  // ---------------------------------------------------------------------------
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
    // The interval runs continuously while the component is mounted
    timerIntervalRef.current = setInterval(() => {
      setNow(Date.now());
    }, 1000); // Update every 1000ms (1 second)

    // Cleanup function: runs when component unmounts
    return () => {
      // Close WebSocket connection to prevent memory leaks
      if (stompClientRef.current) stompClientRef.current.deactivate();

      // Clear timer interval to prevent memory leaks
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [token, navigate]); // Re-run if token or navigate changes

  // ---------------------------------------------------------------------------
  // API CALL: Fetch Active Bookings
  // ---------------------------------------------------------------------------
  // Retrieves all active parking sessions from the backend
  // Filters out completed/cancelled bookings (defensive programming)
  // Updates the bookings state and loading flag
  //
  // This function is called:
  // - On component mount (initial load)
  // - After user actions (arrive, exit)
  // - When WebSocket messages arrive (real-time updates)
  // ---------------------------------------------------------------------------
  const fetchBookings = async () => {
    try {
      // Call GET /api/bookings/list/active
      // Backend returns all bookings with status RESERVED or PARKED for current user
      const data = await fetchAPI("/bookings/list/active");

      // Filter to ensure only active bookings are displayed
      // Backend should handle this, but we filter defensively
      // CANCELLED_NO_SHOW: User reserved but never arrived
      // COMPLETED: Parking session has ended
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
      // Always hide loading spinner, even if request fails
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // WEBSOCKET: Establish Real-Time Connection
  // ---------------------------------------------------------------------------
  // Creates a WebSocket connection using STOMP protocol over SockJS
  // Subscribes to two channels:
  // 1. /user/queue/booking-updates - for booking status changes
  // 2. /user/queue/notifications - for general notifications
  //
  // Real-time scenarios:
  // - Admin cancels booking → booking-updates message → refresh list
  // - Reservation expires → booking-updates message → refresh list
  // - System notification → notifications message → refresh list
  //
  // When messages arrive, re-fetches bookings to stay in sync
  // ---------------------------------------------------------------------------
  const connectWS = () => {
    // Create STOMP client with configuration
    const client = new Client({
      brokerURL: SOCKET_URL,                    // WebSocket URL (ws://localhost:8080/ws)
      connectHeaders: { "X-Auth-Token": token }, // Auth header for WS handshake
      debug: (str) => console.log(str),         // Log WS messages for debugging

      // Callback when connection is established
      onConnect: () => {
        console.log("WS Connected");

        // SUBSCRIPTION 1: Booking Updates
        // Triggered when booking status changes
        // Examples:
        // - Admin cancels booking
        // - Reservation expires (no-show timeout)
        // - Booking transitions from RESERVED to PARKED
        client.subscribe("/user/queue/booking-updates", (msg) => {
          // Message received - refresh the bookings list to reflect changes
          // We don't parse the message body; we just re-fetch everything
          fetchBookings();
        });

        // SUBSCRIPTION 2: General Notifications
        // Triggered for other events like system messages
        // Examples:
        // - Parking area closing soon
        // - Promotional notifications
        // - Account updates
        client.subscribe("/user/queue/notifications", (msg) => {
          // Refresh bookings (some notifications may affect booking status)
          fetchBookings();

          // TODO: Could parse msg.body and show specific toast notification
          // const notification = JSON.parse(msg.body);
          // showToast(notification.message, notification.type);
        });
      },
    });

    // Activate the WebSocket connection
    // This initiates the connection and triggers onConnect when ready
    client.activate();

    // Store reference for cleanup on unmount
    stompClientRef.current = client;
  };

  // ---------------------------------------------------------------------------
  // ACTION: Handle Arrival (for RESERVED bookings)
  // ---------------------------------------------------------------------------
  // Simulates QR code scan at parking entrance
  // Transitions booking from RESERVED → PARKED status
  // Starts the parking timer (backend records arrivalTime)
  //
  // Flow:
  // 1. User clicks "Scan Arrival" button
  // 2. Confirmation dialog appears
  // 3. If confirmed, API call is made
  // 4. Backend validates reservation is still valid
  // 5. Backend sets status=PARKED, arrivalTime=now
  // 6. Frontend refreshes to show updated status and timer
  //
  // Parameters:
  // - id: Booking ID to mark as arrived
  // ---------------------------------------------------------------------------
  const handleArrive = async (id) => {
    // Show native browser confirmation dialog
    // Returns true if user clicks OK, false if Cancel
    if (!window.confirm("Simulate scanning QR code for arrival?"))
      return; // User cancelled - do nothing

    try {
      // API CALL: Mark arrival
      // POST /api/bookings/{id}/arrive
      // Backend validates:
      // - Booking exists and belongs to current user
      // - Status is RESERVED (not already PARKED or COMPLETED)
      // - Reservation hasn't expired
      await fetchAPI(`/bookings/${id}/arrive`, "POST");

      // Success - refresh bookings to show updated status (PARKED)
      // This will also start showing the parking duration timer
      fetchBookings();

      // ALTERNATIVE (commented out): Show success toast instead of silent refresh
      // showToast("Arrival Confirmed! Timer Started.", "success");
    } catch (e) {
      // Error handling - show alert with error message
      // Possible errors:
      // - Reservation expired
      // - Already marked as arrived
      // - Booking not found
      alert("Arrival Failed: " + e.message);

      // ALTERNATIVE (commented out): Show error toast
      // showToast("Arrival Failed: " + e.message, "error");
    }
  };

  // ALTERNATIVE IMPLEMENTATION (commented out):
  // This version uses Toast notifications instead of alerts
  // Provides better UX with auto-dismissing notifications
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // ACTION: Handle Exit (for PARKED bookings)
  // ---------------------------------------------------------------------------
  // Ends the parking session and processes payment
  //
  // Flow:
  // 1. User clicks "Stop & Pay" button
  // 2. Confirmation dialog appears
  // 3. If confirmed, API call is made
  // 4. Backend calculates final cost based on duration and rates
  // 5. Backend deducts amount from user's wallet
  // 6. Backend returns receipt with payment details
  // 7. Frontend shows success message with amount paid
  //
  // Special case: If wallet has insufficient funds:
  // - Show error message
  // - Offer to navigate to profile page for wallet top-up
  //
  // Parameters:
  // - id: Booking ID to end
  // ---------------------------------------------------------------------------
  const handleExit = async (id) => {
    // Show native browser confirmation dialog
    if (!window.confirm("End parking session and pay?"))
      return; // User cancelled

    try {
      // API CALL: End parking session
      // POST /api/bookings/{id}/end
      // Backend logic:
      // 1. Validate booking is PARKED (not RESERVED or already COMPLETED)
      // 2. Calculate duration: now - arrivalTime
      // 3. Calculate cost based on parking area rates
      // 4. Check wallet balance >= cost
      // 5. Deduct from wallet
      // 6. Set status=COMPLETED
      // 7. Return receipt object
      const receipt = await fetchAPI(`/bookings/${id}/end`, "POST");

      // Extract cost from receipt
      // Try amountPaid first (newer field), fall back to finalParkingFee
      const cost = receipt.amountPaid || receipt.finalParkingFee;

      // Show success alert with formatted amount
      // Using template literals with toFixed(2) for 2 decimal places
      alert(`✅ Payment Successful!\nAmount: ₹${cost.toFixed(2)}`);

      // Refresh bookings list
      // This booking will be removed (status=COMPLETED, so filtered out)
      fetchBookings();
    } catch (e) {
      // SPECIAL CASE: Insufficient wallet balance
      // Backend throws error message containing "Insufficient"
      if (e.message.includes("Insufficient")) {
        // Show confirmation dialog asking if user wants to top up
        if (window.confirm("Insufficient Wallet Balance! Top Up now?")) {
          // User wants to top up - navigate to profile page
          // Profile page has wallet management features
          navigate("/profile");
        }
        // If user declines, do nothing (stay on current page)
      } else {
        // Generic error handling for other failures
        // Examples:
        // - Booking not found
        // - Already completed
        // - Network error
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
  // This function is called for every booking on every render (every second)
  // It's pure and efficient - just math operations on numbers
  //
  // Parameters:
  // - startTime: ISO timestamp string (e.g., "2024-01-15T10:30:00")
  //
  // Returns: Formatted string like "1:23:45" or "23:45"
  //
  // Examples:
  // - Started 45 seconds ago: "00:45"
  // - Started 5 minutes 30 seconds ago: "05:30"
  // - Started 2 hours 15 minutes ago: "2:15:00"
  // ---------------------------------------------------------------------------
  const getElapsedTime = (startTime) => {
    // Convert start time string to milliseconds since epoch
    const start = new Date(startTime).getTime();

    // Calculate difference between now and start time
    // Divide by 1000 to convert milliseconds to seconds
    let seconds = Math.floor((now - start) / 1000);

    // Prevent negative times (in case of clock skew or future timestamps)
    if (seconds < 0) seconds = 0;

    // Break down total seconds into hours, minutes, and remaining seconds
    const hours = Math.floor(seconds / 3600);                // 3600 seconds in an hour
    const mins = Math.floor((seconds % 3600) / 60);         // Remainder after hours, divided by 60
    const s = Math.floor(seconds % 60);                     // Remainder after minutes

    // Format the display string
    // Hours: Only show if > 0 (e.g., "2:" or "")
    const hDisplay = hours > 0 ? `${hours}:` : "";

    // Minutes: Always 2 digits with leading zero if needed (e.g., "05", "23")
    const mDisplay = mins.toString().padStart(2, "0");

    // Seconds: Always 2 digits with leading zero if needed (e.g., "09", "45")
    const sDisplay = s.toString().padStart(2, "0");

    // Combine: "2:05:45" or "05:45" (if hours = 0)
    return `${hDisplay}${mDisplay}:${sDisplay}`;
  };

  // ---------------------------------------------------------------------------
  // HELPER: Format Start Time
  // ---------------------------------------------------------------------------
  // Converts ISO timestamp to localized 12/24-hour time format
  // Example: "2024-01-15T10:30:45" → "10:30:45 AM" (in 12-hour locale)
  //                                → "10:30:45" (in 24-hour locale)
  //
  // Uses browser's locale settings automatically via toLocaleTimeString
  //
  // Parameters:
  // - dateStr: ISO timestamp string
  //
  // Returns: Formatted time string (e.g., "10:30:45 AM")
  // ---------------------------------------------------------------------------
  const formatStartedAt = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",    // 2-digit hour (01-12 or 00-23)
      minute: "2-digit",  // 2-digit minute (00-59)
      second: "2-digit",  // 2-digit second (00-59)
    });
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="bg-gray-800 min-h-screen flex justify-center font-sans">
      {/* Mobile-first container: max width on desktop, full width on mobile */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col pb-20">

        {/* ===================================================================
            HEADER - Sticky top navigation with back button
        =================================================================== */}
        <header className="bg-white p-4 shadow-sm z-20 flex justify-between items-center sticky top-0 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-800">My Activities</h1>
          {/* Back to dashboard link */}
          <Link
            to="/dashboard"
            className="text-xs text-gray-500 font-medium hover:text-indigo-600"
          >
            Back
          </Link>
        </header>

        {/* ===================================================================
            MAIN CONTENT AREA - Scrollable list of bookings
        =================================================================== */}
        <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">

          {/* ---------------------------------------------------------
              LOADING STATE - Shows while fetching initial data
          --------------------------------------------------------- */}
          {loading && (
            <div className="text-center py-10 text-gray-400 text-sm">
              Loading sessions...
            </div>
          )}

          {/* ---------------------------------------------------------
              EMPTY STATE - Shows when user has no active sessions
          --------------------------------------------------------- */}
          {!loading && bookings.length === 0 && (
            <div className="text-center py-12 mt-4">
              {/* Emoji illustration */}
              <div className="text-4xl mb-3 opacity-50">😴</div>

              {/* Empty state message */}
              <h3 className="text-sm font-bold text-gray-800">
                No Active Sessions
              </h3>
              <p className="text-xs text-gray-400 mb-4 mt-1">
                You are not parked or reserved anywhere.
              </p>

              {/* Call-to-action button */}
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
              // -------------------------------------------------------
              // BOOKING CARD LOGIC
              // -------------------------------------------------------

              // Determine if this booking is reserved or actively parked
              const isReserved = b.status === "RESERVED";

              // Set status badge color based on booking state
              // RESERVED: Amber/yellow (waiting to arrive)
              // PARKED: Emerald/green (actively parking)
              const statusColor = isReserved
                ? "bg-amber-100 text-amber-800 border-amber-200"  // Yellow theme
                : "bg-emerald-100 text-emerald-800 border-emerald-200"; // Green theme

              // Determine which timestamp to use for elapsed time calculation
              // RESERVED: Show time since reservation was made
              // PARKED: Show time since user arrived and started parking
              const startTime = isReserved ? b.reservationTime : b.arrivalTime;

              return (
                <div
                  key={b.id}
                  className="bg-gray-400 rounded-2xl shadow-sm border border-gray-100 p-5 fade-in relative overflow-hidden"
                >

                  {/* ---------------------------------------------------------
                      CARD HEADER - Area name, slot number, status badge
                  --------------------------------------------------------- */}
                  <div className="flex justify-between items-start mb-4">
                    {/* Left side: Location info */}
                    <div className="bg-gray-900 px-3 py-2 rounded-2xl">
                      {/* Parking area name */}
                      <h3 className="font-bold text-md text-white truncate w-48">
                        {b.areaName || "Unknown Area"}
                      </h3>
                      {/* Slot number in monospace font for clarity */}
                      <div className="text-sm text-white font-mono mt-0.5">
                        Slot: {b.slotNumber}
                      </div>
                    </div>

                    {/* Right side: Status badge */}
                    <span
                      className={`px-1 py-1 rounded text-[10px] font-bold uppercase border ${statusColor}`}
                    >
                      {/* Replace underscores with spaces for display */}
                      {b.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* ---------------------------------------------------------
                      VEHICLE INFO - Shows registered vehicle number
                  --------------------------------------------------------- */}
                  <div className="flex items-center space-x-3 mb-5 bg-gray-50 p-3 rounded-xl border border-gray-50">
                    {/* Car emoji icon */}
                    <div className="bg-white p-2 rounded-lg shadow-sm text-lg">
                      🚗
                    </div>

                    {/* Vehicle details */}
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
                      Updates every second via 'now' state changes
                  --------------------------------------------------------- */}
                  <div className="text-center mb-5">
                    {/* Label changes based on booking status */}
                    <div className="text-[10px] text-black uppercase tracking-widest mb-1">
                      {isReserved ? "Time Reserved" : "Parking Duration"}
                    </div>

                    {/* Large timer display - re-calculated every second */}
                    <div className="text-2xl font-black font-bold text-black tracking-tight">
                      {getElapsedTime(startTime)}
                    </div>

                    {/* Static start time for reference */}
                    <div className="text-[13px] font-bold text-black mt-1">
                      Started: {formatStartedAt(startTime)}
                    </div>
                  </div>

                  {/* ---------------------------------------------------------
                      ACTION BUTTONS - Different based on booking status
                  --------------------------------------------------------- */}
                  <div className="flex gap-3">
                    {isReserved ? (
                      // RESERVED STATUS: Show "Scan Arrival" button
                      // User needs to physically arrive and scan QR code
                      <button
                        onClick={() => handleArrive(b.id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        Scan Arrival
                      </button>
                    ) : (
                      // PARKED STATUS: Show "Stop & Pay" button
                      // Ends session and processes payment
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
            BOTTOM NAVIGATION BAR - Fixed navigation to main app sections
            Stays at bottom even when scrolling content
        =================================================================== */}
        <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 p-2 flex justify-around items-center text-xs font-medium text-gray-400 z-50">

          {/* -------------------------
              HOME/DASHBOARD LINK
          ------------------------- */}
          <Link
            to="/dashboard"
            className="flex flex-col items-center p-2 hover:text-indigo-600 transition"
          >
            {/* Home icon SVG */}
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

          {/* -------------------------
              FIND PARKING LINK
          ------------------------- */}
          <Link
            to="/slots"
            className="flex flex-col items-center p-2 hover:text-indigo-600 transition"
          >
            {/* Search icon SVG */}
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

          {/* -------------------------
              ACTIVITY LINK (Current Page)
              Highlighted in indigo color
          ------------------------- */}
          <Link
            to="/active-bookings"
            className="flex flex-col items-center p-2 text-indigo-600"
          >
            {/* Clock icon SVG (filled to indicate active page) */}
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

          {/* -------------------------
              PROFILE LINK
          ------------------------- */}
          <Link
            to="/profile"
            className="flex flex-col items-center p-2 hover:text-indigo-600 transition"
          >
            {/* User profile icon SVG */}
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
