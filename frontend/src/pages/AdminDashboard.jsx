import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useConfirm } from "../context/ConfirmContext";

// Register ChartJS components
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

const API_BASE = "http://localhost:8080/api";

export default function AdminDashboard() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("staff");
  const [adminName, setAdminName] = useState("Admin");

  // Staff State
  const [pendingRequests, setPendingRequests] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [createStaffForm, setCreateStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "AREA_OWNER",
  });
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState([]);
  const [globalStats, setGlobalStats] = useState({
    revenue: 0,
    bookings: 0,
    active: 0,
    avgDuration: 0,
  });
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });

  // Graph State (Track which row is expanded)
  const [expandedAreaId, setExpandedAreaId] = useState(null);
  const [areaChartData, setAreaChartData] = useState(null);

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

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }

    const init = async () => {
      try {
        const user = await fetchAPI("/user/profile");
        if (user.role !== "ADMIN") {
          alert("Access Denied: Admins Only");
          navigate("/dashboard");
          return;
        }
        setAdminName(user.name);
        loadAllStaffData();
      } catch (e) {
        console.error(e);
        navigate("/auth");
      }
    };

    init();
  }, [token, navigate]);

  // --- STAFF FUNCTIONS ---
  const loadAllStaffData = async () => {
    setLoadingStaff(true);
    try {
      const pending = await fetchAPI("/admin/pending-approvals");
      setPendingRequests(pending);

      const staff = await fetchAPI("/admin/get-all-staff/");
      setStaffList(staff);
    } catch (e) {
      console.error("Error loading staff data", e);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleApprove = async (userId) => {
    // if (!window.confirm("Enable this user's account?")) return;
    if (!(await confirm("Enable this user's account?", "Approve User"))) return;
    try {
      const res = await fetchAPI(`/admin/approve/${userId}`, "PUT");
      alert(res.message || "User approved");
      loadAllStaffData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchAPI(
        "/admin/create-staff",
        "POST",
        createStaffForm,
      );
      alert(res.message || "Staff created");
      setCreateStaffForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "AREA_OWNER",
      });
      loadAllStaffData();
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  // --- ANALYTICS FUNCTIONS ---
  const loadAnalytics = async () => {
    let query = "";
    if (dateFilter.start && dateFilter.end) {
      query = `?start=${dateFilter.start}T00:00:00&end=${dateFilter.end}T23:59:59`;
    }

    try {
      const data = await fetchAPI(`/admin/analytics/all-areas${query}`);
      setAnalyticsData(data);

      // Calculate Global Stats
      const totalRev = data.reduce((s, i) => s + i.totalEarnings, 0);
      const totalBook = data.reduce((s, i) => s + i.totalBookings, 0);
      const totalActive = data.reduce((s, i) => s + i.activeBookings, 0);
      const totalDur = data.reduce(
        (s, i) => s + i.avgDuration * i.totalBookings,
        0,
      );
      const avgDur = totalBook > 0 ? totalDur / totalBook : 0;

      setGlobalStats({
        revenue: totalRev,
        bookings: totalBook,
        active: totalActive,
        avgDuration: avgDur,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleGraph = async (areaId) => {
    if (expandedAreaId === areaId) {
      setExpandedAreaId(null);
      setAreaChartData(null);
      return;
    }

    setExpandedAreaId(areaId);
    setAreaChartData(null); // Clear previous chart data while loading

    // Fetch Charts
    let query = "";
    if (dateFilter.start && dateFilter.end) {
      query = `?start=${dateFilter.start}T00:00:00&end=${dateFilter.end}T23:59:59`;
    }

    try {
      const data = await fetchAPI(
        `/admin/analytics/area/${areaId}/charts${query}`,
      );
      // Choose Hourly or Daily based on backend logic
      const points =
        data.hourlyData && data.hourlyData.length > 0
          ? data.hourlyData
          : data.dailyData;
      setAreaChartData(points);
    } catch (e) {
      console.error(e);
    }
  };

  // Chart Helper
  const getChartOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: title },
    },
    scales: { x: { display: false } },
  });

  const getChartData = (label, dataPoints, color) => ({
    labels: dataPoints.map((_, i) => i),
    datasets: [
      {
        label,
        data: dataPoints,
        borderColor: color,
        backgroundColor: color + "20",
        tension: 0.4,
        fill: true,
      },
    ],
  });

  // Export Logic
  const handleExport = () => {
    if (!analyticsData.length) return;

    // Flat Data
    const flatData = analyticsData.map((item) => ({
      "Area ID": item.areaId,
      Name: item.name,
      Owner: item.owner,
      Revenue: item.totalEarnings.toFixed(2),
      Bookings: item.totalBookings,
      "Avg Duration": item.avgDuration.toFixed(1),
    }));

    // CSV Generation
    const headers = Object.keys(flatData[0]);
    const csvContent = [
      headers.join(","),
      ...flatData.map((row) =>
        headers.map((fieldName) => JSON.stringify(row[fieldName])).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Admin_Analytics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gray-900 min-h-screen font-sans">
      {/* Header */}
      <header className="bg-indigo-950 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-pink-600 p-1.5 rounded-lg">⚡</div>
            <h1 className="font-bold text-lg tracking-wide">Admin Console</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white font-medium hidden sm:block">
              {adminName}
            </span>
            <Link
              to="/profile"
              className="text-sm bg-gray-950 text-white hover:bg-gray-900 px-3 py-1.5 rounded-lg transition"
            >
              Back to User View
            </Link>
          </div>
        </div>
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("staff")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "staff" ? "border-pink-500 text-pink-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Staff Management
            </button>
            <button
              onClick={() => {
                setActiveTab("analytics");
                loadAnalytics();
              }}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "analytics" ? "border-pink-500 text-pink-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Platform Analytics
            </button>
          </nav>
        </div>
      </header>

      {/* STAFF TAB */}
      {activeTab === "staff" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-6">
              {/* Pending Approvals */}
              <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
                <div className="px-6 py-3 border-b border-orange-100 bg-orange-50 flex justify-between items-center">
                  <h2 className="text-sm font-bold text-orange-800 uppercase tracking-wider">
                    🔔 Pending Requests
                  </h2>
                  <span className="bg-orange-200 text-orange-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {pendingRequests.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                  {pendingRequests.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-xs">
                      No pending requests.
                    </div>
                  ) : (
                    pendingRequests.map((u) => (
                      <div
                        key={u.userId}
                        className="p-4 flex items-center justify-between hover:bg-orange-50/50 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-800">
                              {u.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-gray-200 text-gray-600">
                              {u.role}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {u.email}
                          </div>
                        </div>
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

              {/* Create Staff Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  Create Staff Manually
                </h2>
                <p className="text-xs text-gray-500 mb-6">
                  Create new Admins or Area Owners directly.
                </p>
                <form onSubmit={handleCreateStaff} className="space-y-4">
                  {/* Role Radios */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Role
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["AREA_OWNER", "ADMIN"].map((r) => (
                        <label key={r} className="cursor-pointer">
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
                  {/* Inputs */}
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
                  <div className="grid grid-cols-2 gap-3">
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
                  <button
                    type="submit"
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-lg shadow-md transition transform active:scale-95 text-sm mt-2"
                  >
                    Create / Promote User
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Staff List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                <div className="divide-y divide-gray-100">
                  {loadingStaff ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      Loading staff members...
                    </div>
                  ) : staffList.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      No active staff found.
                    </div>
                  ) : (
                    staffList.map((u) => (
                      <div
                        key={u.userId}
                        className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center space-x-4">
                          <div
                            className={`h-10 w-10 ${u.role === "ADMIN" ? "bg-pink-600" : "bg-amber-600"} text-white rounded-full flex items-center justify-center font-bold text-sm`}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {u.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {u.email} • {u.phone}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${u.role === "ADMIN" ? "bg-pink-100 text-pink-700 border-pink-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}
                          >
                            {u.role.replace("_", " ")}
                          </span>
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

      {/* ANALYTICS TAB */}
      {activeTab === "analytics" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Controls */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
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
            <div className="flex gap-2">
              <button
                onClick={loadAnalytics}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded"
              >
                Apply Filter
              </button>
              <button
                onClick={() => {
                  setDateFilter({ start: "", end: "" });
                  setTimeout(loadAnalytics, 100);
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-bold px-4 py-2 rounded"
              >
                All Time
              </button>
              <button
                onClick={handleExport}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded flex items-center gap-1"
              >
                CSV
              </button>
            </div>
          </div>

          {/* Global Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-xs text-gray-500 uppercase font-bold">
                Total Revenue
              </p>
              <h3 className="text-2xl font-bold text-gray-900">
                ₹{globalStats.revenue.toFixed(2)}
              </h3>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-xs text-blue-600 uppercase font-bold">
                Total Bookings
              </p>
              <h3 className="text-2xl font-bold text-gray-900">
                {globalStats.bookings}
              </h3>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-xs text-purple-600 uppercase font-bold">
                Active Now
              </p>
              <h3 className="text-2xl font-bold text-gray-900">
                {globalStats.active}
              </h3>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-xs text-orange-600 uppercase font-bold">
                Avg Duration
              </p>
              <h3 className="text-2xl font-bold text-gray-900">
                {globalStats.avgDuration.toFixed(1)}h
              </h3>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
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
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.map((area) => (
                  <>
                    <tr
                      key={area.areaId}
                      onClick={() => toggleGraph(area.areaId)}
                      className="hover:bg-gray-50 transition cursor-pointer border-b border-gray-100"
                    >
                      <td className="px-6 py-4 font-bold text-sm text-gray-900">
                        {area.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {area.owner}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-mono font-bold text-green-600">
                        ₹{area.totalEarnings.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-700">
                        {area.totalBookings}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-mono text-orange-600">
                        {area.avgDuration.toFixed(1)}h
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <button className="text-indigo-600 hover:text-indigo-900 text-xs font-bold uppercase">
                          Toggle Graphs
                        </button>
                      </td>
                    </tr>
                    {expandedAreaId === area.areaId && (
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td colSpan="6" className="p-4">
                          {areaChartData ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-64">
                              <div className="bg-white p-2 rounded shadow-sm relative">
                                <Line
                                  options={getChartOptions("Revenue")}
                                  data={getChartData(
                                    "Revenue",
                                    areaChartData.map((p) => p.revenue),
                                    "#059669",
                                  )}
                                />
                              </div>
                              <div className="bg-white p-2 rounded shadow-sm relative">
                                <Line
                                  options={getChartOptions("Bookings")}
                                  data={getChartData(
                                    "Bookings",
                                    areaChartData.map((p) => p.bookingCount),
                                    "#4F46E5",
                                  )}
                                />
                              </div>
                              <div className="bg-white p-2 rounded shadow-sm relative">
                                <Line
                                  options={getChartOptions("Avg Duration")}
                                  data={getChartData(
                                    "Avg Duration",
                                    areaChartData.map((p) => p.avgDurationHrs),
                                    "#D97706",
                                  )}
                                />
                              </div>
                            </div>
                          ) : (
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
