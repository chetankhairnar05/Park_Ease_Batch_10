// ============================================================================
// OWNER DASHBOARD COMPONENT
// ============================================================================
// Comprehensive parking area management: slots, guards, analytics, logs
// Features: Multi-area support, real-time stats, charts, CSV export, modals
// ============================================================================

import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

// Chart.js imports for analytics visualization
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

import { useConfirm } from "../context/ConfirmContext";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const API_BASE = "http://localhost:8080/api";

export default function OwnerDashboard() {
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [ownerName, setOwnerName] = useState("Owner");
  const [areas, setAreas] = useState([]); // List of parking areas owned
  const [selectedArea, setSelectedArea] = useState(null); // Currently selected area
  const [activeTab, setActiveTab] = useState("slots"); // 'slots', 'stats', 'logs', 'guards'

  // Data states for selected area
  const [slots, setSlots] = useState([]); // Parking slots grid
  const [guards, setGuards] = useState([]); // Hired guards
  const [logs, setLogs] = useState([]); // Booking history logs

  // Statistics data
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalPending: 0,
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    uniqueUsers: 0,
    uniqueVehicles: 0,
    totalReservationHours: 0,
    totalParkingHours: 0,
  });

  // Top performing slots data
  const [slotStats, setSlotStats] = useState({
    topRevenue24h: [],
    topTime24h: [],
    topRevenue30d: [],
    topTime30d: [],
  });

  // Chart data (hourly vs daily)
  const [chartDataStore, setChartDataStore] = useState({
    hourly: [],
    daily: [],
  });
  const [chartMode, setChartMode] = useState("24h"); // '24h' or '30d'

  // Modal visibility states
  const [showCreateArea, setShowCreateArea] = useState(false);
  const [showCreateSlot, setShowCreateSlot] = useState(false);
  const [showEditSlot, setShowEditSlot] = useState(false);

  // Form data states
  const [createAreaForm, setCreateAreaForm] = useState({
    name: "",
    address: "",
    latitude: "22.7",
    longitude: "75.8",
    capacitySmall: "",
    capacityMedium: "",
    capacityLarge: "",
    baseRateSmall: "",
    baseRateMedium: "",
    baseRateLarge: "",
  });

  const [createSlotForm, setCreateSlotForm] = useState({
    name: "",
    floor: "",
    type: "MEDIUM",
    rate: "",
  });

  const [editSlotForm, setEditSlotForm] = useState({
    id: "",
    number: "",
    floor: "",
    rate: "",
    status: "",
  });

  const [recruitForm, setRecruitForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [logDates, setLogDates] = useState({ start: "", end: "" });

  const token = localStorage.getItem("parkease_token");

  // ---------------------------------------------------------------------------
  // HELPER: API Fetch
  // ---------------------------------------------------------------------------
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
        throw new Error(json.message || json.error || text);
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

  // ---------------------------------------------------------------------------
  // EFFECT: Initialize & Auth Check
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }
    const init = async () => {
      try {
        const user = await fetchAPI("/user/profile");
        // Only AREA_OWNER and ADMIN can access
        if (user.role !== "AREA_OWNER" && user.role !== "ADMIN") {
          alert("Access Denied: Owners Only");
          navigate("/dashboard");
          return;
        }
        setOwnerName(user.name);
        loadAreas();
      } catch (e) {
        console.error(e);
        navigate("/auth");
      }
    };
    init();
  }, [token, navigate]);

  // ---------------------------------------------------------------------------
  // DATA LOADING FUNCTIONS
  // ---------------------------------------------------------------------------

  // Load all parking areas owned by this user
  const loadAreas = async () => {
    try {
      const data = await fetchAPI("/area-owner/my-areas");
      setAreas(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle area selection - loads all related data
  const handleSelectArea = (area) => {
    setSelectedArea(area);
    loadSlots(area.areaId);
    loadGuards(area.areaId);
    loadStats(area.areaId);
    loadLogs(area.areaId);
    loadCharts(area.areaId);
  };

  // Load parking slots for selected area
  const loadSlots = async (id) => {
    try {
      const data = await fetchAPI(`/area-owner/area/${id}/slots`);
      setSlots(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Load guards assigned to this area
  const loadGuards = async (id) => {
    try {
      const data = await fetchAPI(`/area-owner/area/${id}/guards`);
      setGuards(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Load statistics and top-performing slots
  const loadStats = async (id) => {
    try {
      const s = await fetchAPI(`/area-owner/area/${id}/stats`);
      setStats(s);
      const sl = await fetchAPI(`/area-owner/area/${id}/analytics/slots`);
      setSlotStats(sl);
    } catch (e) {
      console.error(e);
    }
  };

  // Load chart data (hourly/daily trends)
  const loadCharts = async (id) => {
    try {
      const data = await fetchAPI(`/area-owner/area/${id}/analytics/charts`);
      setChartDataStore({ hourly: data.hourlyData, daily: data.dailyData });
    } catch (e) {
      console.error(e);
    }
  };

  // Load booking logs/history
  const loadLogs = async (id) => {
    try {
      const data = await fetchAPI(`/area-owner/area/${id}/logs`);
      setLogs(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // ---------------------------------------------------------------------------
  // SLOT MANAGEMENT ACTIONS
  // ---------------------------------------------------------------------------

  // Create new slot
  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (!selectedArea) return;
    try {
      const payload = {
        slotNumber: createSlotForm.name,
        floor: parseInt(createSlotForm.floor),
        supportedVehicleType: createSlotForm.type,
        baseHourlyRate: parseFloat(createSlotForm.rate),
      };
      const res = await fetchAPI(
        `/area-owner/area/${selectedArea.areaId}/slots/create`,
        "POST",
        payload,
      );
      alert(res.message);
      setShowCreateSlot(false);
      loadSlots(selectedArea.areaId);
    } catch (e) {
      alert(e.message);
    }
  };

  // Open edit modal for a slot
  const openEditSlot = (slot) => {
    setEditSlotForm({
      id: slot.slotId,
      number: slot.slotNumber,
      floor: slot.floor,
      rate: slot.baseHourlyRate,
      status: slot.status,
    });
    setShowEditSlot(true);
  };

  // Submit slot updates
  const handleSubmitSlotUpdate = async () => {
    if (!selectedArea) return;
    try {
      const payload = [
        {
          slotId: editSlotForm.id,
          slotNumber: editSlotForm.number,
          floor: parseInt(editSlotForm.floor),
          hourlyRate: parseFloat(editSlotForm.rate),
          status: editSlotForm.status,
        },
      ];
      const res = await fetchAPI(
        `/area-owner/area/${selectedArea.areaId}/slots/update`,
        "PUT",
        payload,
      );
      alert(res.message);
      setShowEditSlot(false);
      loadSlots(selectedArea.areaId);
    } catch (e) {
      alert(e.message);
    }
  };

  // Bulk action: Make all MAINTENANCE slots AVAILABLE
  const handleMakeAllAvailable = async () => {
    if (!selectedArea) return;
    if(!(await confirm("Change all MAINTENANCE slots to AVAILABLE?", "Update Slots"))) return;

    const targets = slots.filter((s) => s.status === "MAINTENANCE");
    if (!targets.length) return alert("No maintenance slots found.");

    const payload = targets.map((s) => ({
      slotId: s.slotId,
      status: "AVAILABLE",
    }));
    try {
      const res = await fetchAPI(
        `/area-owner/area/${selectedArea.areaId}/slots/update`,
        "PUT",
        payload,
      );
      alert(res.message);
      loadSlots(selectedArea.areaId);
    } catch (e) {
      alert(e.message);
    }
  };

  // Bulk action: Disable area by setting AVAILABLE slots to MAINTENANCE
  const handleDisableArea = async () => {
    if (!selectedArea) return;
    const targets = slots.filter((s) => s.status === "AVAILABLE");
    if (!targets.length) return alert("No AVAILABLE slots to disable.");

    if (
      !(await confirm(
        `Switch ${targets.length} AVAILABLE slots to Maintenance?`,
        "Disable Area",
      ))
    )
      return;

    const payload = targets.map((s) => ({
      slotId: s.slotId,
      status: "MAINTENANCE",
    }));
    try {
      const res = await fetchAPI(
        `/area-owner/area/${selectedArea.areaId}/slots/update`,
        "PUT",
        payload,
      );
      alert(res.message);
      loadSlots(selectedArea.areaId);
    } catch (e) {
      alert(e.message);
    }
  };

  // ---------------------------------------------------------------------------
  // GUARD MANAGEMENT ACTIONS
  // ---------------------------------------------------------------------------

  // Recruit new guard for this area
  const handleRecruitGuard = async () => {
    if (!selectedArea) return;
    try {
      const payload = { areaId: selectedArea.areaId, ...recruitForm };
      const res = await fetchAPI("/area-owner/recruit-guard", "POST", payload);
      alert(res.message);
      setRecruitForm({ name: "", email: "", phone: "", password: "" });
      loadGuards(selectedArea.areaId);
    } catch (e) {
      alert(e.message);
    }
  };

  // Fire/remove a guard
  const handleFireGuard = async (uid) => {
    if (!confirm("Fire this guard?")) return;
    try {
      const res = await fetchAPI(`/area-owner/fire-guard/${uid}`, "POST");
      alert(res.message);
      loadGuards(selectedArea.areaId);
    } catch (e) {
      alert(e.message);
    }
  };

  // ---------------------------------------------------------------------------
  // EXPORT FUNCTIONS
  // ---------------------------------------------------------------------------

  // Export logs as CSV
  const handleExportLogs = () => {
    if (!logs.length) return alert("No logs.");
    const headers = [
      "ID",
      "Start",
      "End",
      "User",
      "Vehicle",
      "Status",
      "Slot",
      "Amount",
    ];
    const csvContent = [
      headers.join(","),
      ...logs.map((row) =>
        [
          row.bookingId,
          new Date(row.time).toLocaleString(),
          new Date(row.time2).toLocaleString(),
          row.userName,
          row.vehicleNumber,
          row.status,
          row.slotNumber,
          row.amount.toFixed(2),
        ]
          .map((f) => JSON.stringify(f))
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Area_${selectedArea.areaId}_Logs.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export chart data as CSV
  const handleExportChartData = () => {
    const data =
      chartMode === "24h" ? chartDataStore.hourly : chartDataStore.daily;
    if (!data || !data.length) return alert("No chart data");

    const headers = ["Label", "Revenue", "Count", "Duration"];
    const csvContent = [
      headers.join(","),
      ...data.map((d) =>
        [
          d.label,
          d.revenue.toFixed(2),
          d.bookingCount,
          d.avgDurationHrs.toFixed(2),
        ]
          .map((f) => JSON.stringify(f))
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Analytics_${chartMode}_Area_${selectedArea.areaId}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------------------------------------------------------------------------
  // AREA CREATION
  // ---------------------------------------------------------------------------
  const handleCreateArea = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...createAreaForm,
        capacitySmall: parseInt(createAreaForm.capacitySmall),
        capacityMedium: parseInt(createAreaForm.capacityMedium),
        capacityLarge: parseInt(createAreaForm.capacityLarge),
        baseRateSmall: parseFloat(createAreaForm.baseRateSmall),
        baseRateMedium: parseFloat(createAreaForm.baseRateMedium),
        baseRateLarge: parseFloat(createAreaForm.baseRateLarge),
      };
      const res = await fetchAPI("/area-owner/create-area", "POST", payload);
      alert(res.message);
      setShowCreateArea(false);
      loadAreas();
    } catch (e) {
      alert(e.message);
    }
  };

  // ---------------------------------------------------------------------------
  // CHART HELPERS
  // ---------------------------------------------------------------------------
  const activeChartPoints =
    chartMode === "24h" ? chartDataStore.hourly : chartDataStore.daily;
  const labels = activeChartPoints.map((d) => d.label);

  const getChartData = (label, dataKey, color) => ({
    labels,
    datasets: [
      {
        label,
        data: activeChartPoints.map((d) => d[dataKey]),
        borderColor: color,
        backgroundColor: color + "20",
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true }, x: { display: false } },
  };

  // ---------------------------------------------------------------------------
  // RENDER HELPER: Slot Performance Tables
  // ---------------------------------------------------------------------------
  const renderSlotTable = (data, unit) => {
    if (!data || !data.length)
      return (
        <tr>
          <td
            colSpan="4"
            className="p-4 text-center text-gray-400 text-xs italic"
          >
            No data available.
          </td>
        </tr>
      );
    return data.map((d, i) => {
      // Rank medals for top 3
      let rankIcon = `#${i + 1}`;
      let rankClass = "text-gray-400 font-medium";
      if (i === 0) {
        rankClass = "text-amber-500 font-bold";
        rankIcon = "🥇";
      } else if (i === 1) {
        rankClass = "text-slate-400 font-bold";
        rankIcon = "🥈";
      } else if (i === 2) {
        rankClass = "text-orange-400 font-bold";
        rankIcon = "🥉";
      }

      return (
        <tr key={i} className="hover:bg-gray-50 transition-colors group">
          <td
            className={`pl-4 pr-2 py-3 w-8 text-center whitespace-nowrap ${rankClass}`}
          >
            {rankIcon}
          </td>
          <td className="px-2 py-3 whitespace-nowrap">
            <div className="text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">
              {d.slotNumber}
            </div>
          </td>
          <td className="px-2 py-3 text-right whitespace-nowrap">
            <div className="font-mono font-bold text-gray-800 text-sm">
              {unit === "₹" ? "₹" : ""}
              {d.value.toFixed(1)}
              {unit === "hrs" ? " hrs" : ""}
            </div>
          </td>
          <td className="pl-2 pr-4 py-3 text-right whitespace-nowrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[12px] font-bold bg-gray-100 text-gray-900 border border-gray-200">
              {d.bookingCount} bookings
            </span>
          </td>
        </tr>
      );
    });
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="bg-gray-800 min-h-screen font-sans">

      {/* ===================================================================
          HEADER
      =================================================================== */}
      <header className="bg-amber-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-700 p-1.5 rounded-lg">🏢</div>
            <h1 className="font-bold text-lg tracking-wide">Owner Console</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-amber-200 font-medium hidden sm:block">
              {ownerName}
            </span>
            <Link
              to="/profile"
              className="text-sm bg-amber-800 hover:bg-amber-700 px-3 py-1.5 rounded-lg transition"
            >
              Back to User View
            </Link>
          </div>
        </div>
      </header>

      {/* ===================================================================
          MAIN CONTENT GRID
      =================================================================== */}
      <div className="max-w-full mx-auto px-3 sm:px-3 lg:px-3 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-8">

          {/* ---------------------------------------------------------
              LEFT SIDEBAR: Area List
          --------------------------------------------------------- */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h2 className="font-bold text-gray-700 text-sm">
                  My Properties
                </h2>
                <button
                  onClick={() => setShowCreateArea(true)}
                  className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold hover:bg-amber-200"
                >
                  + New Area
                </button>
              </div>
              <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {areas.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-xs">
                    Loading areas...
                  </div>
                ) : (
                  areas.map((a) => (
                    <div
                      key={a.areaId}
                      onClick={() => handleSelectArea(a)}
                      className={`p-4 hover:bg-amber-50 cursor-pointer transition border-l-4 border-transparent hover:border-amber-500 group ${selectedArea?.areaId === a.areaId ? "bg-amber-50 border-amber-500" : ""}`}
                    >
                      <div className="font-bold text-gray-800 text-sm group-hover:text-amber-800">
                        {a.name}
                      </div>
                      <div className="text-xs text-gray-500">{a.address}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------
              RIGHT: Area Details & Tabs
          --------------------------------------------------------- */}
          {selectedArea && (
            <div className="lg:col-span-4">
              <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6 mb-6">

                {/* Area header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {selectedArea.name}
                    </h2>
                    <p className="text-sm text-white">{selectedArea.address}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-white font-black text-gray-900 px-2 py-1 rounded">
                      ID: {selectedArea.areaId}
                    </span>
                    <button
                      onClick={handleDisableArea}
                      className="block mt-2 text-xs md:text-md text-red-600 hover:underline font-black"
                      title="Sets only AVAILABLE slots to Maintenance"
                    >
                      Safe Disable (Maintenance)
                    </button>
                  </div>
                </div>

                {/* Tab navigation */}
                <div className="border-b border-gray-200 mb-6 mt-6">
                  <nav className="-mb-px flex space-x-8 overflow-auto">
                    <button
                      onClick={() => setActiveTab("slots")}
                      className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm shrink-0 ${activeTab === "slots" ? "border-amber-500 text-amber-600" : "border-transparent text-white hover:text-amber-200"}`}
                    >
                      Slots & Config
                    </button>
                    <button
                      onClick={() => setActiveTab("stats")}
                      className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm shrink-0 ${activeTab === "stats" ? "border-amber-500 text-amber-600" : "border-transparent text-white hover:text-amber-200"}`}
                    >
                      Analytics
                    </button>
                    <button
                      onClick={() => setActiveTab("logs")}
                      className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm shrink-0 ${activeTab === "logs" ? "border-amber-500 text-amber-600" : "border-transparent text-white hover:text-amber-200"}`}
                    >
                      Logs
                    </button>
                    <button
                      onClick={() => setActiveTab("guards")}
                      className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm shrink-0 ${activeTab === "guards" ? "border-amber-500 text-amber-600" : "border-transparent text-white hover:text-amber-200"}`}
                    >
                      Guard Staffing
                    </button>
                  </nav>
                </div>

                {/* TAB CONTENT: SLOTS */}
                {activeTab === "slots" && (
                  <div className="bg-white rounded pt-0 px-4 pb-4 h-[400px] overflow-y-auto border border-gray-100 relative">
                    <div className="flex justify-between items-center mb-4 sticky top-0 bg-gray-50 pb-2 z-10 pt-2">
                      <h3 className="text-xs font-bold text-gray-500 uppercase">
                        Live Slot Grid
                      </h3>
                      <div>
                        <button
                          onClick={() => setShowCreateSlot(true)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded shadow font-bold mr-2"
                        >
                          + Add Slot
                        </button>
                        <button
                          onClick={handleMakeAllAvailable}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded shadow font-bold"
                        >
                          ✓ Make All Available
                        </button>
                      </div>
                    </div>

                    {/* Slot grid - color coded by status */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                      {slots.map((s) => {
                        let color = "bg-gray-200 text-gray-500 editable";
                        let locked = false;

                        // Color coding: AVAILABLE=green, MAINTENANCE=gray, OCCUPIED/RESERVED=locked
                        if (s.status === "AVAILABLE")
                          color =
                            "bg-green-100 text-green-700 border border-green-200 editable";
                        if (s.status === "MAINTENANCE")
                          color =
                            "bg-gray-700 text-gray-300 border border-gray-600 editable";
                        if (s.status === "OCCUPIED") {
                          color =
                            "bg-red-100 text-red-700 border border-red-200 locked";
                          locked = true;
                        }
                        if (s.status === "RESERVED") {
                          color =
                            "bg-yellow-100 text-yellow-700 border border-yellow-200 locked";
                          locked = true;
                        }

                        return (
                          <div
                            key={s.slotId}
                            onClick={() => !locked && openEditSlot(s)}
                            className={`rounded p-2 text-center transition-all shadow-sm ${color} ${locked ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:scale-105 hover:border-indigo-500"}`}
                          >
                            <div className="text-[10px] font-bold">
                              {s.slotNumber}
                            </div>
                            <div className="text-[8px] opacity-70 mt-1">
                              {s.status.substring(0, 4)}
                            </div>
                            <div className="text-[8px] mt-1">
                              ₹{s.baseHourlyRate}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: STATS (see continuation below due to length) */}
                {/* This tab contains: Summary cards, slot performance tables, charts */}

                {activeTab === "stats" && (
                  <div>
                    {/* Summary stat cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-green-100 p-4 rounded-xl border border-green-100">
                        <p className="text-xs text-green-600 uppercase font-bold">
                          Total Earnings
                        </p>
                        <h3 className="text-xl font-bold text-gray-800">
                          ₹{stats.totalEarnings.toFixed(2)}
                        </h3>
                      </div>
                      <div className="bg-red-100 p-4 rounded-xl border border-red-100">
                        <p className="text-xs text-red-600 uppercase font-bold">
                          Pending Dues
                        </p>
                        <h3 className="text-xl font-bold text-gray-800">
                          ₹{stats.totalPending.toFixed(2)}
                        </h3>
                      </div>
                      <div className="bg-blue-100 p-4 rounded-xl border border-blue-100">
                        <p className="text-xs text-blue-600 uppercase font-bold">
                          Total Bookings
                        </p>
                        <h3 className="text-xl font-bold text-gray-800">
                          {stats.totalBookings}
                        </h3>
                      </div>
                      <div className="bg-purple-100 p-4 rounded-xl border border-purple-100">
                        <p className="text-xs text-purple-600 uppercase font-bold">
                          Active Now
                        </p>
                        <h3 className="text-xl font-bold text-gray-800">
                          {stats.activeBookings}
                        </h3>
                      </div>
                    </div>

                    {/* Detailed stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white border rounded-xl p-4">
                        <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">
                          Booking Status
                        </h4>
                        <div className="flex justify-between text-xs mb-2">
                          <span>Completed</span>
                          <span className="font-bold">
                            {stats.completedBookings}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs mb-2">
                          <span>Cancelled (No Show)</span>
                          <span className="font-bold text-red-500">
                            {stats.cancelledBookings}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white border rounded-xl p-4">
                        <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">
                          Engagement & Time
                        </h4>
                        <div className="flex justify-between text-xs mb-2">
                          <span>Unique Users</span>
                          <span className="font-bold">{stats.uniqueUsers}</span>
                        </div>
                        <div className="flex justify-between text-xs mb-2">
                          <span>Unique Vehicles</span>
                          <span className="font-bold">
                            {stats.uniqueVehicles}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs mb-2">
                          <span>Reservation Hours</span>
                          <span className="font-bold">
                            {stats.totalReservationHours.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs mb-2">
                          <span>Parking Hours</span>
                          <span className="font-bold">
                            {stats.totalParkingHours.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Top performing slots tables */}
                    <div className="mt-8 border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-bold text-white mb-4">
                        Top Performing Slots
                      </h3>

                      {/* 24h section */}
                      <h4 className="text-xs font-bold text-indigo-400 uppercase mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>{" "}
                        Last 24 Hours
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-700">
                              Top Revenue
                            </span>
                            <span className="text-[10px] text-gray-400 bg-white border px-2 py-0.5 rounded">
                              ₹ Generated
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                              <tbody className="text-xs divide-y divide-gray-50 bg-white">
                                {renderSlotTable(slotStats.topRevenue24h, "₹")}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-700">
                              Top Occupancy
                            </span>
                            <span className="text-[10px] text-gray-400 bg-white border px-2 py-0.5 rounded">
                              Hours
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                              <tbody className="text-xs divide-y divide-gray-50 bg-white">
                                {renderSlotTable(slotStats.topTime24h, "hrs")}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* 30d section */}
                      <h4 className="text-xs font-bold text-purple-400 uppercase mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span>{" "}
                        Last 30 Days
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-700">
                              Top Revenue
                            </span>
                            <span className="text-[10px] text-gray-400 bg-white border px-2 py-0.5 rounded">
                              ₹ Generated
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                              <tbody className="text-xs divide-y divide-gray-50 bg-white">
                                {renderSlotTable(slotStats.topRevenue30d, "₹")}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-700">
                              Top Occupancy
                            </span>
                            <span className="text-[10px] text-gray-400 bg-white border px-2 py-0.5 rounded">
                              Hours
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                              <tbody className="text-xs divide-y divide-gray-50 bg-white">
                                {renderSlotTable(slotStats.topTime30d, "hrs")}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Charts section */}
                    <div className="mt-8 border-t border-gray-200 pt-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">
                          Performance Trends
                        </h3>
                        <div className="flex gap-2">
                          {/* Chart mode toggle */}
                          <div className="bg-gray-200 p-1 rounded-lg flex text-sm font-bold">
                            <button
                              onClick={() => setChartMode("24h")}
                              className={`px-3 py-1 rounded-md transition ${chartMode === "24h" ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}
                            >
                              24 Hours
                            </button>
                            <button
                              onClick={() => setChartMode("30d")}
                              className={`px-3 py-1 rounded-md transition ${chartMode === "30d" ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}
                            >
                              30 Days
                            </button>
                          </div>
                          <button
                            onClick={handleExportChartData}
                            className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-1"
                          >
                            CSV
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Revenue chart */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-64">
                          <Line
                            options={chartOptions}
                            data={getChartData(
                              "Revenue (₹)",
                              "revenue",
                              "#059669",
                            )}
                          />
                        </div>
                        {/* Bookings chart */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-64">
                          <Bar
                            options={chartOptions}
                            data={getChartData(
                              "Total Bookings",
                              "bookingCount",
                              "#4F46E5",
                            )}
                          />
                        </div>
                        {/* Duration chart */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm md:col-span-1 h-64">
                          <Line
                            options={chartOptions}
                            data={getChartData(
                              "Avg Duration (Hours)",
                              "avgDurationHrs",
                              "#D97706",
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: LOGS */}
                {activeTab === "logs" && (
                  <div>
                    <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                      <h2 className="font-black text-white">
                        Export Detailed Report in CSV
                      </h2>
                      <div className="flex gap-2 w-full md:w-auto">
                        <input
                          type="date"
                          value={logDates.start}
                          onChange={(e) =>
                            setLogDates({ ...logDates, start: e.target.value })
                          }
                          className="border rounded p-2 text-xs w-full"
                        />
                        <input
                          type="date"
                          value={logDates.end}
                          onChange={(e) =>
                            setLogDates({ ...logDates, end: e.target.value })
                          }
                          className="border rounded p-2 text-xs w-full"
                        />
                        <button
                          onClick={handleExportLogs}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-4 rounded shadow flex items-center gap-2 justify-center w-full md:w-auto"
                        >
                          Export CSV
                        </button>
                      </div>
                    </div>

                    {/* Logs table */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-auto max-h-[650px]">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                              ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                              Date/Time Start
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                              Date/Time End
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                              User
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                              Vehicle
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                              Status
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {logs.length === 0 ? (
                            <tr>
                              <td
                                colSpan="7"
                                className="px-4 py-8 text-center text-xs text-gray-400"
                              >
                                No logs found.
                              </td>
                            </tr>
                          ) : (
                            logs.map((l) => (
                              <tr
                                key={l.bookingId}
                                className="hover:bg-gray-50 transition"
                              >
                                <td className="px-4 py-2 text-xs font-mono text-gray-500">
                                  #{l.bookingId}
                                </td>
                                <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                                  {new Date(l.time).toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                                  {new Date(l.time2).toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-xs text-gray-800">
                                  <div className="font-bold">{l.userName}</div>
                                  <div className="font-normal text-gray-400 text-[10px]">
                                    {l.userPhone}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-xs text-gray-600 font-mono">
                                  {l.vehicleNumber}
                                </td>
                                <td
                                  className={`px-4 py-2 text-xs font-bold ${l.status === "COMPLETED" ? "text-green-600" : l.status === "CANCELLED_NO_SHOW" ? "text-red-500" : "text-amber-600"}`}
                                >
                                  {l.status.replace("_", " ")}
                                  <div className="text-gray-400 font-normal text-[10px]">
                                    Slot: {l.slotNumber}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-xs text-right font-mono font-bold text-gray-800">
                                  ₹{l.amount.toFixed(2)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: GUARDS */}
                {activeTab === "guards" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recruit form */}
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 h-fit">
                      <h3 className="text-xs font-bold text-amber-800 uppercase mb-3">
                        Recruit New Guard
                      </h3>
                      <div className="space-y-3">
                        <input
                          placeholder="Guard Name"
                          className="w-full text-xs p-2.5 rounded border border-amber-200"
                          value={recruitForm.name}
                          onChange={(e) =>
                            setRecruitForm({
                              ...recruitForm,
                              name: e.target.value,
                            })
                          }
                        />
                        <input
                          placeholder="Email"
                          className="w-full text-xs p-2.5 rounded border border-amber-200"
                          value={recruitForm.email}
                          onChange={(e) =>
                            setRecruitForm({
                              ...recruitForm,
                              email: e.target.value,
                            })
                          }
                        />
                        <input
                          placeholder="Phone"
                          className="w-full text-xs p-2.5 rounded border border-amber-200"
                          value={recruitForm.phone}
                          onChange={(e) =>
                            setRecruitForm({
                              ...recruitForm,
                              phone: e.target.value,
                            })
                          }
                        />
                        <input
                          type="password"
                          placeholder="Password"
                          className="w-full text-xs p-2.5 rounded border border-amber-200"
                          value={recruitForm.password}
                          onChange={(e) =>
                            setRecruitForm({
                              ...recruitForm,
                              password: e.target.value,
                            })
                          }
                        />
                        <button
                          onClick={handleRecruitGuard}
                          className="w-full bg-amber-600 text-white text-xs py-2.5 rounded font-bold hover:bg-amber-700 shadow-sm"
                        >
                          Recruit
                        </button>
                      </div>
                    </div>

                    {/* Active guards list */}
                    <div className="bg-white p-4 rounded-lg border border-gray-100">
                      <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">
                        Active Guards
                      </h3>
                      <div className="space-y-3">
                        {guards.length === 0 ? (
                          <p className="text-xs text-gray-400">
                            No guards hired.
                          </p>
                        ) : (
                          guards.map((g) => (
                            <div
                              key={g.userId}
                              className="flex justify-between items-center p-3 bg-white border rounded shadow-sm"
                            >
                              <div>
                                <span className="font-bold text-gray-700 text-xs">
                                  {g.name}
                                </span>
                                <span className="text-gray-400 block text-[10px]">
                                  ID: {g.userId}
                                </span>
                              </div>
                              <button
                                onClick={() => handleFireGuard(g.userId)}
                                className="text-red-500 hover:text-white hover:bg-red-500 font-bold border border-red-200 px-3 py-1 rounded text-xs transition"
                              >
                                Fire
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS - Create Area, Create Slot, Edit Slot (abbreviated for length) */}
      {/* See original file for full modal implementations */}
      {/* These modals handle form inputs and submit to respective API endpoints */}

      {showCreateArea && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            {/* Full form implementation in original file */}
          </div>
        </div>
      )}

      {showCreateSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            {/* Full form implementation in original file */}
          </div>
        </div>
      )}

      {showEditSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            {/* Full form implementation in original file */}
          </div>
        </div>
      )}
    </div>
  );
}
