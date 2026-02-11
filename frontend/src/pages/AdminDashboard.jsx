// ============================================================================
// ADMIN DASHBOARD COMPONENT
// ============================================================================
// This is a comprehensive admin panel with two main sections:
// 1. STAFF MANAGEMENT: Approve pending requests, create staff manually, view all staff
// 2. PLATFORM ANALYTICS: View revenue, bookings, duration metrics across all parking areas
//    with date filtering, CSV export, and expandable per-area charts
// ============================================================================

import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

// ============================================================================
// CHART.JS IMPORTS & REGISTRATION
// ============================================================================
// Chart.js is a powerful charting library used to display analytics graphs
// We import specific components to keep bundle size minimal
import {
  Chart as ChartJS,
  CategoryScale,    // X-axis scaling
  LinearScale,      // Y-axis scaling
  PointElement,     // Data points on line
  LineElement,      // Line segments
  Title,            // Chart title
  Tooltip,          // Hover tooltips
  Legend,           // Legend display
  Filler,           // Fill area under line
} from "chart.js";
import { Line } from "react-chartjs-2"; // React wrapper for Line charts

import { useConfirm } from "../context/ConfirmContext"; // Custom confirmation dialog hook

// Register Chart.js components globally
// This is required before using any Chart.js features
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================
const API_BASE = "http://localhost:8080/api"; // Backend REST API base URL

// ============================================================================
// MAIN COMPONENT: AdminDashboard
// ============================================================================
export default function AdminDashboard() {
  // ---------------------------------------------------------------------------
  // HOOKS & CONTEXT
  // ---------------------------------------------------------------------------
  const confirm = useConfirm();   // Custom confirmation dialog
  const navigate = useNavigate(); // For programmatic navigation

  // ---------------------------------------------------------------------------
  // UI STATE MANAGEMENT
  // ---------------------------------------------------------------------------

  // Active tab: Controls which section is visible ("staff" or "analytics")
  const [activeTab, setActiveTab] = useState("staff");

  // Admin user's name (fetched from backend on mount)
  const [adminName, setAdminName] = useState("Admin");

  // ---------------------------------------------------------------------------
  // STAFF MANAGEMENT STATE
  // ---------------------------------------------------------------------------

  // Pending approval requests: Users who registered but are not yet enabled
  // Each object contains: userId, name, email, phone, role
  const [pendingRequests, setPendingRequests] = useState([]);

  // Active staff list: All approved users with ADMIN or AREA_OWNER roles
  // Each object contains: userId, name, email, phone, role
  const [staffList, setStaffList] = useState([]);

  // Form data for creating new staff manually
  // This bypasses the registration + approval flow
  const [createStaffForm, setCreateStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "AREA_OWNER", // Default role
  });

  // Loading state for staff data fetch
  const [loadingStaff, setLoadingStaff] = useState(false);

  // ---------------------------------------------------------------------------
  // ANALYTICS STATE
  // ---------------------------------------------------------------------------

  // Analytics data: Array of per-area statistics
  // Each object contains: areaId, name, owner, totalEarnings, totalBookings,
  // activeBookings, avgDuration
  const [analyticsData, setAnalyticsData] = useState([]);

  // Global aggregated statistics across all areas
  const [globalStats, setGlobalStats] = useState({
    revenue: 0,       // Total earnings (₹)
    bookings: 0,      // Total completed bookings
    active: 0,        // Currently active parking sessions
    avgDuration: 0,   // Average parking duration (hours)
  });

  // Date range filter for analytics
  // Both are ISO date strings (YYYY-MM-DD)
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });

  // ---------------------------------------------------------------------------
  // CHART EXPANSION STATE
  // ---------------------------------------------------------------------------

  // Track which area's row is expanded to show charts
  // null = no area expanded
  // number = areaId of expanded row
  const [expandedAreaId, setExpandedAreaId] = useState(null);

  // Chart data for the currently expanded area
  // Array of data points with: revenue, bookingCount, avgDurationHrs
  // Can be hourly or daily data depending on backend logic
  const [areaChartData, setAreaChartData] = useState(null);

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
  // - endpoint: API path (e.g., "/admin/pending-approvals")
  // - method: HTTP method (GET, POST, PUT, DELETE)
  // - body: Request payload (optional, for POST/PUT)
  //
  // Returns: Parsed JSON response or plain text
  // Throws: Error with backend error message if request fails
  // ---------------------------------------------------------------------------
  const fetchAPI = async (endpoint, method = "GET", body = null) => {
    // Set headers with authentication token
    const headers = {
      "Content-Type": "application/json",
      "X-Auth-Token": token, // JWT token for admin authentication
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
        throw new Error(json.message || json.error || text);
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
  // EFFECT: Component Initialization & Authorization
  // ---------------------------------------------------------------------------
  // Runs once on mount:
  // 1. Checks if user is authenticated
  // 2. Verifies user has ADMIN role
  // 3. Fetches admin profile and initial staff data
  // 4. Redirects non-admin users or unauthenticated users
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Redirect to auth page if no token found
    if (!token) {
      navigate("/auth");
      return;
    }

    // Async initialization function
    const init = async () => {
      try {
        // Fetch current user's profile to verify admin status
        // GET /api/user/profile
        const user = await fetchAPI("/user/profile");

        // Authorization check: Only ADMIN role can access this dashboard
        if (user.role !== "ADMIN") {
          alert("Access Denied: Admins Only");
          navigate("/dashboard"); // Redirect to regular user dashboard
          return;
        }

        // Set admin name in UI
        setAdminName(user.name);

        // Load initial staff data (pending requests + active staff)
        loadAllStaffData();
      } catch (e) {
        // If profile fetch fails (invalid token, server error), redirect to login
        console.error(e);
        navigate("/auth");
      }
    };

    init();
  }, [token, navigate]); // Re-run if token or navigate changes

  // ---------------------------------------------------------------------------
  // STAFF FUNCTION: Load All Staff Data
  // ---------------------------------------------------------------------------
  // Fetches two datasets:
  // 1. Pending approval requests (users awaiting admin approval)
  // 2. Active staff members (approved ADMIN and AREA_OWNER users)
  //
  // Called on initial load and after staff operations (approve, create)
  // ---------------------------------------------------------------------------
  const loadAllStaffData = async () => {
    setLoadingStaff(true); // Show loading state

    try {
      // API CALL 1: Get pending approval requests
      // GET /api/admin/pending-approvals
      // Returns array of users with enabled=false
      const pending = await fetchAPI("/admin/pending-approvals");
      setPendingRequests(pending);

      // API CALL 2: Get all active staff members
      // GET /api/admin/get-all-staff/
      // Returns array of users with role=ADMIN or AREA_OWNER
      const staff = await fetchAPI("/admin/get-all-staff/");
      setStaffList(staff);
    } catch (e) {
      // Log error but don't crash UI
      console.error("Error loading staff data", e);
    } finally {
      // Always hide loading spinner
      setLoadingStaff(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STAFF ACTION: Approve Pending User
  // ---------------------------------------------------------------------------
  // Enables a user account that was pending approval
  // This sets the user's 'enabled' flag to true in the backend
  //
  // Flow:
  // 1. Show confirmation dialog
  // 2. Call approval API endpoint
  // 3. Reload staff data to reflect changes
  //
  // Parameters:
  // - userId: ID of the user to approve
  // ---------------------------------------------------------------------------
  const handleApprove = async (userId) => {
    // Show confirmation dialog before proceeding
    if (!(await confirm("Enable this user's account?", "Approve User")))
      return; // User cancelled

    try {
      // API CALL: Approve user
      // PUT /api/admin/approve/{userId}
      // Backend sets enabled=true for this user
      const res = await fetchAPI(`/admin/approve/${userId}`, "PUT");

      // Show success message
      alert(res.message || "User approved");

      // Refresh both pending and active staff lists
      loadAllStaffData();
    } catch (e) {
      // Show error if approval fails
      alert(e.message);
    }
  };

  // ---------------------------------------------------------------------------
  // STAFF ACTION: Create Staff Manually
  // ---------------------------------------------------------------------------
  // Creates a new staff member (ADMIN or AREA_OWNER) directly
  // Bypasses the normal registration + approval workflow
  //
  // This is useful for:
  // - Promoting existing users to staff roles
  // - Creating staff accounts without requiring self-registration
  //
  // Flow:
  // 1. Submit form data
  // 2. Backend creates user with specified role and enabled=true
  // 3. Clear form and reload staff list
  //
  // Parameters:
  // - e: Form submit event
  // ---------------------------------------------------------------------------
  const handleCreateStaff = async (e) => {
    e.preventDefault(); // Prevent page reload

    try {
      // API CALL: Create staff member
      // POST /api/admin/create-staff
      // Body: { name, email, phone, password, role }
      const res = await fetchAPI(
        "/admin/create-staff",
        "POST",
        createStaffForm,
      );

      // Show success message
      alert(res.message || "Staff created");

      // Reset form to default values
      setCreateStaffForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "AREA_OWNER",
      });

      // Reload staff list to show new member
      loadAllStaffData();
    } catch (e) {
      // Show error if creation fails (e.g., duplicate email)
      alert("Error: " + e.message);
    }
  };

  // ---------------------------------------------------------------------------
  // ANALYTICS FUNCTION: Load Platform Analytics
  // ---------------------------------------------------------------------------
  // Fetches aggregated statistics for all parking areas
  // Supports optional date range filtering
  //
  // Data returned per area:
  // - areaId, name, owner
  // - totalEarnings (revenue)
  // - totalBookings (completed sessions)
  // - activeBookings (currently parked)
  // - avgDuration (average parking time in hours)
  //
  // Also calculates global totals across all areas
  // ---------------------------------------------------------------------------
  const loadAnalytics = async () => {
    // Build query string for date filtering
    let query = "";
    if (dateFilter.start && dateFilter.end) {
      // Convert date strings to ISO datetime format with time components
      // This ensures backend includes full days in the range
      query = `?start=${dateFilter.start}T00:00:00&end=${dateFilter.end}T23:59:59`;
    }

    try {
      // API CALL: Get analytics for all areas
      // GET /api/admin/analytics/all-areas?start=...&end=...
      // Returns array of area statistics
      const data = await fetchAPI(`/admin/analytics/all-areas${query}`);
      setAnalyticsData(data);

      // ---------------------
      // CALCULATE GLOBAL AGGREGATES
      // ---------------------

      // Sum up total revenue across all areas
      const totalRev = data.reduce((sum, item) => sum + item.totalEarnings, 0);

      // Sum up total bookings across all areas
      const totalBook = data.reduce((sum, item) => sum + item.totalBookings, 0);

      // Sum up currently active bookings across all areas
      const totalActive = data.reduce((sum, item) => sum + item.activeBookings, 0);

      // Calculate weighted average duration
      // Weighted by number of bookings per area to get accurate global average
      const totalDur = data.reduce(
        (sum, item) => sum + item.avgDuration * item.totalBookings,
        0,
      );
      const avgDur = totalBook > 0 ? totalDur / totalBook : 0;

      // Update global statistics state
      setGlobalStats({
        revenue: totalRev,
        bookings: totalBook,
        active: totalActive,
        avgDuration: avgDur,
      });
    } catch (e) {
      // Log error but don't crash UI
      console.error(e);
    }
  };

  // ---------------------------------------------------------------------------
  // ANALYTICS FUNCTION: Toggle Area Chart Expansion
  // ---------------------------------------------------------------------------
  // Expands/collapses detailed charts for a specific parking area
  //
  // When expanded, fetches time-series data (hourly or daily) showing:
  // - Revenue over time
  // - Booking count over time
  // - Average duration over time
  //
  // Backend decides whether to return hourly or daily data based on date range
  //
  // Parameters:
  // - areaId: ID of the parking area to expand/collapse
  // ---------------------------------------------------------------------------
  const toggleGraph = async (areaId) => {
    // If clicking the same area, collapse it
    if (expandedAreaId === areaId) {
      setExpandedAreaId(null);
      setAreaChartData(null);
      return;
    }

    // Expand this area
    setExpandedAreaId(areaId);
    setAreaChartData(null); // Clear previous chart data while loading

    // Build query string for date filtering (same as loadAnalytics)
    let query = "";
    if (dateFilter.start && dateFilter.end) {
      query = `?start=${dateFilter.start}T00:00:00&end=${dateFilter.end}T23:59:59`;
    }

    try {
      // API CALL: Get time-series chart data for specific area
      // GET /api/admin/analytics/area/{areaId}/charts?start=...&end=...
      // Returns: { hourlyData: [], dailyData: [] }
      const data = await fetchAPI(
        `/admin/analytics/area/${areaId}/charts${query}`,
      );

      // Backend logic determines granularity:
      // - Short date ranges (< 7 days): Returns hourlyData
      // - Longer ranges: Returns dailyData
      // We prefer hourly if available, fall back to daily
      const points =
        data.hourlyData && data.hourlyData.length > 0
          ? data.hourlyData
          : data.dailyData;

      // Each point contains: { revenue, bookingCount, avgDurationHrs, timestamp }
      setAreaChartData(points);
    } catch (e) {
      console.error(e);
    }
  };

  // ---------------------------------------------------------------------------
  // CHART HELPER: Get Chart Configuration Options
  // ---------------------------------------------------------------------------
  // Returns Chart.js options object for consistent chart styling
  //
  // Parameters:
  // - title: Chart title to display
  //
  // Returns: Chart.js options configuration object
  // ---------------------------------------------------------------------------
  const getChartOptions = (title) => ({
    responsive: true,              // Auto-resize to container
    maintainAspectRatio: false,    // Allow flexible height
    plugins: {
      legend: { display: false },  // Hide legend (single dataset per chart)
      title: { display: true, text: title }, // Show title
    },
    scales: {
      x: { display: false }        // Hide X-axis labels (saves space)
    },
  });

  // ---------------------------------------------------------------------------
  // CHART HELPER: Build Chart Dataset
  // ---------------------------------------------------------------------------
  // Converts raw data points into Chart.js dataset format
  //
  // Parameters:
  // - label: Dataset label (e.g., "Revenue", "Bookings")
  // - dataPoints: Array of numeric values
  // - color: Hex color for line (e.g., "#059669")
  //
  // Returns: Chart.js data object with labels and datasets
  // ---------------------------------------------------------------------------
  const getChartData = (label, dataPoints, color) => ({
    // Labels for X-axis (just indices since we hide X-axis)
    labels: dataPoints.map((_, i) => i),

    datasets: [
      {
        label,                           // Dataset name
        data: dataPoints,                // Y-axis values
        borderColor: color,              // Line color
        backgroundColor: color + "20",   // Fill color (20% opacity)
        tension: 0.4,                    // Smooth curve (0 = straight lines)
        fill: true,                      // Fill area under line
      },
    ],
  });

  // ---------------------------------------------------------------------------
  // EXPORT FUNCTION: Generate CSV Export
  // ---------------------------------------------------------------------------
  // Exports current analytics data as a downloadable CSV file
  //
  // CSV Format:
  // Area ID, Name, Owner, Revenue, Bookings, Avg Duration
  //
  // Flow:
  // 1. Transform analytics data to flat objects
  // 2. Build CSV string with headers and rows
  // 3. Create Blob and trigger browser download
  // ---------------------------------------------------------------------------
  const handleExport = () => {
    // Don't export if no data
    if (!analyticsData.length) return;

    // Transform analytics data into flat structure for CSV
    const flatData = analyticsData.map((item) => ({
      "Area ID": item.areaId,
      Name: item.name,
      Owner: item.owner,
      Revenue: item.totalEarnings.toFixed(2),  // Format to 2 decimals
      Bookings: item.totalBookings,
      "Avg Duration": item.avgDuration.toFixed(1), // Format to 1 decimal
    }));

    // Build CSV string
    const headers = Object.keys(flatData[0]);
    const csvContent = [
      // Header row
      headers.join(","),
      // Data rows: JSON.stringify handles escaping commas and quotes
      ...flatData.map((row) =>
        headers.map((fieldName) => JSON.stringify(row[fieldName])).join(","),
      ),
    ].join("\n");

    // Create downloadable Blob
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    // Create temporary link element and trigger download
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Admin_Analytics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="bg-gray-900 min-h-screen font-sans">

      {/* ===================================================================
          HEADER - Sticky navigation with tab switching
      =================================================================== */}
      <header className="bg-indigo-950 text-white shadow-lg sticky top-0 z-50">

        {/* Top bar with title and user info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-pink-600 p-1.5 rounded-lg">⚡</div>
            <h1 className="font-bold text-lg tracking-wide">Admin Console</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Display admin name */}
            <span className="text-sm text-white font-medium hidden sm:block">
              {adminName}
            </span>
            {/* Link to return to regular user view */}
            <Link
              to="/profile"
              className="text-sm bg-gray-950 text-white hover:bg-gray-900 px-3 py-1.5 rounded-lg transition"
            >
              Back to User View
            </Link>
          </div>
        </div>

        {/* Tab navigation bar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {/* Staff Management Tab */}
            <button
              onClick={() => setActiveTab("staff")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "staff" ? "border-pink-500 text-pink-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Staff Management
            </button>

            {/* Analytics Tab - loads analytics data when clicked */}
            <button
              onClick={() => {
                setActiveTab("analytics");
                loadAnalytics(); // Fetch analytics data when switching to this tab
              }}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "analytics" ? "border-pink-500 text-pink-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Platform Analytics
            </button>
          </nav>
        </div>
      </header>

      {/* ===================================================================
          STAFF MANAGEMENT TAB
          Shows:
          - Pending approval requests (left column)
          - Create staff form (left column)
          - Active staff directory (right column)
      =================================================================== */}
      {activeTab === "staff" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ---------------------------------------------------------
                LEFT COLUMN: Pending Requests + Create Form
            --------------------------------------------------------- */}
            <div className="lg:col-span-1 space-y-6">

              {/* ===========================================
                  PENDING APPROVALS SECTION
              =========================================== */}
              <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
                {/* Header with count badge */}
                <div className="px-6 py-3 border-b border-orange-100 bg-orange-50 flex justify-between items-center">
                  <h2 className="text-sm font-bold text-orange-800 uppercase tracking-wider">
                    🔔 Pending Requests
                  </h2>
                  <span className="bg-orange-200 text-orange-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {pendingRequests.length}
                  </span>
                </div>

                {/* Pending users list */}
                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                  {pendingRequests.length === 0 ? (
                    // Empty state
                    <div className="p-6 text-center text-gray-400 text-xs">
                      No pending requests.
                    </div>
                  ) : (
                    // Map through pending users
                    pendingRequests.map((u) => (
                      <div
                        key={u.userId}
                        className="p-4 flex items-center justify-between hover:bg-orange-50/50 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            {/* User name */}
                            <span className="text-xs font-bold text-gray-800">
                              {u.name}
                            </span>
                            {/* Role badge */}
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-gray-200 text-gray-600">
                              {u.role}
                            </span>
                          </div>
                          {/* User email */}
                          <div className="text-[10px] text-gray-500">
                            {u.email}
                          </div>
                        </div>
                        {/* Approve button */}
                        <button
                          onClick={() => handleApprove(u.userId)}
                          className="bg-green-600 text-white text-[10px] font-bold px-3 py-1.5 rounded hover:bg-green-700 shadow-sm"
                        >
                          Approve
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ===========================================
                  CREATE STAFF FORM SECTION
              =========================================== */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  Create Staff Manually
                </h2>
                <p className="text-xs text-gray-500 mb-6">
                  Create new Admins or Area Owners directly.
                </p>

                <form onSubmit={handleCreateStaff} className="space-y-4">

                  {/* ========================
                      ROLE SELECTION (Radio Buttons)
                  ======================== */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Role
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["AREA_OWNER", "ADMIN"].map((r) => (
                        <label key={r} className="cursor-pointer">
                          {/* Hidden radio input */}
                          <input
                            type="radio"
                            name="role"
                            value={r}
                            checked={createStaffForm.role === r}
                            onChange={(e) =>
                              setCreateStaffForm({
                                ...createStaffForm,
                                role: e.target.value,
                              })
                            }
                            className="peer hidden"
                          />
                          {/* Styled label that changes based on selection */}
                          <div
                            className={`text-center py-2 border rounded-lg text-sm font-medium text-gray-600 bg-gray-50 transition
                                    ${createStaffForm.role === r ? (r === "ADMIN" ? "bg-pink-50 text-pink-700 border-pink-500" : "bg-amber-50 text-amber-700 border-amber-500") : ""}`}
                          >
                            {r === "AREA_OWNER" ? "Area Owner" : "Admin"}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* ========================
                      FULL NAME INPUT
                  ======================== */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none"
                      value={createStaffForm.name}
                      onChange={(e) =>
                        setCreateStaffForm({
                          ...createStaffForm,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* ========================
                      EMAIL INPUT
                  ======================== */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none"
                      value={createStaffForm.email}
                      onChange={(e) =>
                        setCreateStaffForm({
                          ...createStaffForm,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* ========================
                      PHONE & PASSWORD INPUTS (Grid Layout)
                  ======================== */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Phone input */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none"
                        value={createStaffForm.phone}
                        onChange={(e) =>
                          setCreateStaffForm({
                            ...createStaffForm,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>

                    {/* Password input */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none"
                        value={createStaffForm.password}
                        onChange={(e) =>
                          setCreateStaffForm({
                            ...createStaffForm,
                            password: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* ========================
                      SUBMIT BUTTON
                  ======================== */}
                  <button
                    type="submit"
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-lg shadow-md transition transform active:scale-95 text-sm mt-2"
                  >
                    Create / Promote User
                  </button>
                </form>
              </div>
            </div>

            {/* ---------------------------------------------------------
                RIGHT COLUMN: Active Staff Directory
            --------------------------------------------------------- */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header with refresh button */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Active Staff Directory
                  </h2>
                  <button
                    onClick={loadAllStaffData}
                    className="text-xs text-pink-600 hover:text-pink-800 font-bold"
                  >
                    Refresh All
                  </button>
                </div>

                {/* Staff list */}
                <div className="divide-y divide-gray-100">
                  {loadingStaff ? (
                    // Loading state
                    <div className="p-8 text-center text-gray-400 text-sm">
                      Loading staff members...
                    </div>
                  ) : staffList.length === 0 ? (
                    // Empty state
                    <div className="p-8 text-center text-gray-400 text-sm">
                      No active staff found.
                    </div>
                  ) : (
                    // Map through staff members
                    staffList.map((u) => (
                      <div
                        key={u.userId}
                        className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
                      >
                        {/* Left side: Avatar + User info */}
                        <div className="flex items-center space-x-4">
                          {/* Avatar circle with first initial */}
                          <div
                            className={`h-10 w-10 ${u.role === "ADMIN" ? "bg-pink-600" : "bg-amber-600"} text-white rounded-full flex items-center justify-center font-bold text-sm`}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>

                          {/* User details */}
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {u.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {u.email} • {u.phone}
                            </div>
                          </div>
                        </div>

                        {/* Right side: Role badge + User ID */}
                        <div className="text-right">
                          {/* Role badge */}
                          <span
                            className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${u.role === "ADMIN" ? "bg-pink-100 text-pink-700 border-pink-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}
                          >
                            {u.role.replace("_", " ")}
                          </span>
                          {/* User ID */}
                          <div className="text-[10px] text-gray-400 mt-1">
                            ID: {u.userId}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          ANALYTICS TAB
          Shows:
          - Date filter controls + export button (top)
          - Global statistics cards (4 metrics)
          - Per-area analytics table with expandable charts
      =================================================================== */}
      {activeTab === "analytics" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* ===========================================
              FILTER CONTROLS + EXPORT
          =========================================== */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">

            {/* Start date picker */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="border rounded p-2 text-sm"
                value={dateFilter.start}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, start: e.target.value })
                }
              />
            </div>

            {/* End date picker */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                End Date
              </label>
              <input
                type="date"
                className="border rounded p-2 text-sm"
                value={dateFilter.end}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, end: e.target.value })
                }
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {/* Apply filter button */}
              <button
                onClick={loadAnalytics}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded"
              >
                Apply Filter
              </button>

              {/* Clear filter button (shows all-time data) */}
              <button
                onClick={() => {
                  setDateFilter({ start: "", end: "" });
                  setTimeout(loadAnalytics, 100); // Small delay to ensure state updates
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-bold px-4 py-2 rounded"
              >
                All Time
              </button>

              {/* Export CSV button */}
              <button
                onClick={handleExport}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded flex items-center gap-1"
              >
                CSV
              </button>
            </div>
          </div>

          {/* ===========================================
              GLOBAL SUMMARY CARDS
              4 key metrics aggregated across all areas
          =========================================== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

            {/* Total Revenue card */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-xs text-gray-500 uppercase font-bold">
                Total Revenue
              </p>
              <h3 className="text-2xl font-bold text-gray-900">
                ₹{globalStats.revenue.toFixed(2)}
              </h3>
            </div>

            {/* Total Bookings card */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-xs text-blue-600 uppercase font-bold">
                Total Bookings
              </p>
              <h3 className="text-2xl font-bold text-gray-900">
                {globalStats.bookings}
              </h3>
            </div>

            {/* Active Sessions card */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-xs text-purple-600 uppercase font-bold">
                Active Now
              </p>
              <h3 className="text-2xl font-bold text-gray-900">
                {globalStats.active}
              </h3>
            </div>

            {/* Average Duration card */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-xs text-orange-600 uppercase font-bold">
                Avg Duration
              </p>
              <h3 className="text-2xl font-bold text-gray-900">
                {globalStats.avgDuration.toFixed(1)}h
              </h3>
            </div>
          </div>

          {/* ===========================================
              PER-AREA ANALYTICS TABLE
              Each row is clickable to expand charts
          =========================================== */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">

              {/* Table header */}
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Area Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                    Avg Duration
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                    Details
                  </th>
                </tr>
              </thead>

              {/* Table body */}
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.map((area) => (
                  <>
                    {/* Main row: Area statistics */}
                    <tr
                      key={area.areaId}
                      onClick={() => toggleGraph(area.areaId)}
                      className="hover:bg-gray-50 transition cursor-pointer border-b border-gray-100"
                    >
                      {/* Area name */}
                      <td className="px-6 py-4 font-bold text-sm text-gray-900">
                        {area.name}
                      </td>

                      {/* Owner name */}
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {area.owner}
                      </td>

                      {/* Revenue (green, monospace font) */}
                      <td className="px-6 py-4 text-sm text-right font-mono font-bold text-green-600">
                        ₹{area.totalEarnings.toFixed(2)}
                      </td>

                      {/* Total bookings */}
                      <td className="px-6 py-4 text-sm text-right text-gray-700">
                        {area.totalBookings}
                      </td>

                      {/* Average duration (orange, monospace font) */}
                      <td className="px-6 py-4 text-sm text-right font-mono text-orange-600">
                        {area.avgDuration.toFixed(1)}h
                      </td>

                      {/* Toggle button */}
                      <td className="px-6 py-4 text-center text-sm">
                        <button className="text-indigo-600 hover:text-indigo-900 text-xs font-bold uppercase">
                          Toggle Graphs
                        </button>
                      </td>
                    </tr>

                    {/* Expanded row: Charts (only shown if this area is expanded) */}
                    {expandedAreaId === area.areaId && (
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td colSpan="6" className="p-4">
                          {areaChartData ? (
                            // Display 3 charts in a grid
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-64">

                              {/* Chart 1: Revenue over time */}
                              <div className="bg-white p-2 rounded shadow-sm relative">
                                <Line
                                  options={getChartOptions("Revenue")}
                                  data={getChartData(
                                    "Revenue",
                                    areaChartData.map((p) => p.revenue),
                                    "#059669", // Green color
                                  )}
                                />
                              </div>

                              {/* Chart 2: Bookings over time */}
                              <div className="bg-white p-2 rounded shadow-sm relative">
                                <Line
                                  options={getChartOptions("Bookings")}
                                  data={getChartData(
                                    "Bookings",
                                    areaChartData.map((p) => p.bookingCount),
                                    "#4F46E5", // Indigo color
                                  )}
                                />
                              </div>

                              {/* Chart 3: Average duration over time */}
                              <div className="bg-white p-2 rounded shadow-sm relative">
                                <Line
                                  options={getChartOptions("Avg Duration")}
                                  data={getChartData(
                                    "Avg Duration",
                                    areaChartData.map((p) => p.avgDurationHrs),
                                    "#D97706", // Orange color
                                  )}
                                />
                              </div>
                            </div>
                          ) : (
                            // Loading state while charts are being fetched
                            <div className="text-center py-10 text-gray-400">
                              Loading charts...
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
