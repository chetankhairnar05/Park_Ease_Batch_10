import React, { useState, useEffect, useRef, useMemo } from "react";

// --- CONFIGURATION & UTILS ---
const API_BASE = "http://localhost:8080/api";
const SOCKET_URL = "http://localhost:8080/ws";

// Helper to load external scripts (Leaflet, ChartJS, SockJS) dynamically
const useExternalScript = (url: string) => {
  useEffect(() => {
    if (!document.querySelector(`script[src="${url}"]`)) {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      document.body.appendChild(script);
    }
  }, [url]);
};

const useExternalStyle = (url: string) => {
  useEffect(() => {
    if (!document.querySelector(`link[href="${url}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }
  }, [url]);
};

// Export Utils Logic
const ExportUtils = {
  filterByDate: (
    data: any[],
    dateKey: string,
    startDate: string,
    endDate: string,
  ) => {
    if (!startDate && !endDate) return data;
    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

    return data.filter((item) => {
      const itemDateStr =
        item[dateKey] || item.reservationTime || item.time || item.bookingTime;
      if (!itemDateStr) return false;
      const itemTime = new Date(itemDateStr).getTime();
      if (start && itemTime < start) return false;
      if (end && itemTime > end) return false;
      return true;
    });
  },
  downloadCSV: (
    data: any[],
    headers: string[],
    keys: string[],
    filename: string,
  ) => {
    if (!data || !data.length) {
      alert("No data to export.");
      return;
    }
    const csvRows = [];
    csvRows.push(headers.join(","));
    data.forEach((row) => {
      const values = keys.map((key) => {
        let val = row[key];
        if (val === null || val === undefined) val = "";
        const stringVal = String(val);
        return stringVal.includes(",") ? `"${stringVal}"` : stringVal;
      });
      csvRows.push(values.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },
};

// --- COMPONENTS ---

// 1. Navigation & Icons
const Icons = {
  Home: () => (
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
  ),
  Search: () => (
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
  ),
  Clock: () => (
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
  ),
  User: () => (
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
  ),
  Back: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  ),
};

const BottomNav = ({ setView, currentView, role }: any) => {
  if (role === "ADMIN" || role === "AREA_OWNER") return null; // No bottom nav for admin/owners usually
  return (
    <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 p-2 flex justify-around items-center text-xs font-medium text-gray-400 z-50">
      <button
        onClick={() => setView("dashboard")}
        className={`flex flex-col items-center p-2 ${currentView === "dashboard" ? "text-indigo-600" : "hover:text-indigo-600"}`}
      >
        <Icons.Home /> Home
      </button>
      <button
        onClick={() => setView("slots")}
        className={`flex flex-col items-center p-2 ${currentView === "slots" ? "text-indigo-600" : "hover:text-indigo-600"}`}
      >
        <Icons.Search /> Find
      </button>
      <button
        onClick={() => setView("active-bookings")}
        className={`flex flex-col items-center p-2 ${currentView === "active-bookings" ? "text-indigo-600" : "hover:text-indigo-600"}`}
      >
        <Icons.Clock /> Activity
      </button>
      <button
        onClick={() => setView("profile")}
        className={`flex flex-col items-center p-2 ${currentView === "profile" ? "text-indigo-600" : "hover:text-indigo-600"}`}
      >
        <Icons.User /> Profile
      </button>
    </div>
  );
};

// --- AUTH PAGE ---
const AuthPage = ({ setToken, setUser, setView }: any) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isOfficial, setIsOfficial] = useState(false);
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
    name: "",
    email: "",
    phone: "",
    role: "AREA_OWNER",
  });
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = isLogin
      ? "/auth/login"
      : isOfficial
        ? "/auth/register-official"
        : "/auth/register";

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({ message: "Auth failed" }));

      if (res.ok && isLogin) {
        localStorage.setItem("parkease_token", data.token);
        setToken(data.token);
        // Fetch profile to set user
        const profileRes = await fetch(`${API_BASE}/user/profile`, {
          headers: { "X-Auth-Token": data.token },
        });
        const profile = await profileRes.json();
        setUser(profile);

        if (profile.role === "ADMIN") setView("admin-dashboard");
        else if (profile.role === "AREA_OWNER") setView("owner-dashboard");
        else setView("dashboard");
      } else if (res.ok) {
        alert("Registration Successful! Please Login.");
        setIsLogin(true);
        setIsOfficial(false);
      } else {
        alert(data.message || "Error occurred");
      }
    } catch (err) {
      alert("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 flex items-center justify-center min-h-screen p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-indigo-900">Park Ease</h1>
          <p className="text-gray-500 text-sm">
            {isOfficial ? "Partner Access" : "Smart Parking System"}
          </p>
        </div>

        <div className="flex border-b mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 pb-2 font-bold ${isLogin ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-400"}`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 pb-2 font-bold ${!isLogin ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-400"}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full p-3 border rounded-lg"
                required
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 border rounded-lg"
                required
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <input
                type="tel"
                placeholder="Phone"
                className="w-full p-3 border rounded-lg"
                required
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
              {isOfficial && (
                <select
                  className="w-full p-3 border rounded-lg"
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  <option value="AREA_OWNER">Area Owner</option>
                  <option value="ADMIN">Admin</option>
                </select>
              )}
            </>
          )}
          {isLogin ? (
            <input
              type="text"
              placeholder="Email or Phone"
              className="w-full p-3 border rounded-lg"
              required
              onChange={(e) =>
                setFormData({ ...formData, identifier: e.target.value })
              }
            />
          ) : null}
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border rounded-lg"
            required
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
          >
            {loading ? "Processing..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs">
          {!isLogin && !isOfficial && (
            <button
              onClick={() => setIsOfficial(true)}
              className="text-blue-600 hover:underline"
            >
              Register as Partner (Admin/Owner)
            </button>
          )}
          {!isLogin && isOfficial && (
            <button
              onClick={() => setIsOfficial(false)}
              className="text-blue-600 hover:underline"
            >
              Register as User
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- DASHBOARD (USER) ---
const Dashboard = ({ user, setView, token }: any) => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Vehicles
        const vRes = await fetch(`${API_BASE}/user/vehicles`, {
          headers: { "X-Auth-Token": token },
        });
        if (vRes.ok) setVehicles(await vRes.json());

        // History
        const hRes = await fetch(`${API_BASE}/bookings/list/history`, {
          headers: { "X-Auth-Token": token },
        });
        if (hRes.ok) setHistory(await hRes.json());

        // Active Session
        const aRes = await fetch(`${API_BASE}/bookings/active`, {
          headers: { "X-Auth-Token": token },
        });
        if (aRes.ok) setActiveSession(await aRes.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, [token]);

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col pb-20">
      <header className="bg-indigo-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Hi, {user.name.split(" ")[0]}</h1>
          <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-mono">
            ₹{user.walletBalance?.toFixed(2) || "0.00"}
          </div>
        </div>
        {activeSession && (
          <div
            onClick={() => setView("active-bookings")}
            className="bg-white/10 p-4 rounded-xl border border-white/20 cursor-pointer hover:bg-white/20 transition"
          >
            <h3 className="font-bold text-sm mb-1">Active Session</h3>
            <p className="text-xs opacity-80">{activeSession.status}</p>
            <div className="mt-2 text-xs font-bold text-indigo-100 flex items-center gap-1">
              View Timer & Pay &rarr;
            </div>
          </div>
        )}
      </header>

      <div className="p-5 space-y-6 flex-1 overflow-y-auto">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setView("slots")}
            className="bg-white p-4 rounded-xl shadow-sm text-left hover:shadow-md transition"
          >
            <div className="bg-indigo-100 w-10 h-10 rounded-full flex items-center justify-center text-indigo-600 mb-2">
              <Icons.Search />
            </div>
            <div className="font-bold text-gray-800 text-sm">Find Parking</div>
            <div className="text-xs text-gray-400">Map view</div>
          </button>
          <button
            onClick={() => setView("vehicle-register")}
            className="bg-white p-4 rounded-xl shadow-sm text-left hover:shadow-md transition"
          >
            <div className="bg-green-100 w-10 h-10 rounded-full flex items-center justify-center text-green-600 mb-2">
              🚗
            </div>
            <div className="font-bold text-gray-800 text-sm">Add Vehicle</div>
            <div className="text-xs text-gray-400">Manage fleet</div>
          </button>
        </div>

        {/* Vehicles */}
        <div>
          <h3 className="font-bold text-gray-700 text-sm mb-3">My Vehicles</h3>
          <div className="space-y-2">
            {vehicles.length === 0 ? (
              <p className="text-xs text-gray-400">No vehicles added.</p>
            ) : (
              vehicles.map((v: any, i) => (
                <div
                  key={i}
                  className="bg-white p-3 rounded-lg border border-gray-100 flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold text-sm text-gray-800">
                      {v.vehicle.model} {v.isPrimary && "⭐"}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {v.vehicle.registerNumber}
                    </div>
                  </div>
                  <span className="text-[10px] bg-gray-100 px-2 py-1 rounded font-bold text-gray-600">
                    {v.vehicle.vehicleType}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* History Export */}
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <h3 className="font-bold text-gray-700 text-sm mb-2">
            Export History
          </h3>
          <div className="flex gap-2">
            <input
              type="date"
              id="exp-start"
              className="flex-1 border rounded p-1 text-xs"
            />
            <input
              type="date"
              id="exp-end"
              className="flex-1 border rounded p-1 text-xs"
            />
          </div>
          <button
            onClick={() => {
              const s = (
                document.getElementById("exp-start") as HTMLInputElement
              ).value;
              const e = (document.getElementById("exp-end") as HTMLInputElement)
                .value;
              const filtered = ExportUtils.filterByDate(
                history,
                "bookingTime",
                s,
                e,
              );
              const flat = filtered.map((b: any) => ({
                ID: b.id,
                Date: b.bookingTime,
                Area: b.areaName,
                Status: b.status,
                Amount: b.amountPaid || b.amountPending,
              }));
              ExportUtils.downloadCSV(
                flat,
                ["ID", "Date", "Area", "Status", "Amount"],
                ["ID", "Date", "Area", "Status", "Amount"],
                "history.csv",
              );
            }}
            className="w-full bg-indigo-600 text-white text-xs font-bold py-2 rounded mt-2"
          >
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
};

// --- SLOTS (MAP) ---
const SlotsMap = ({ setView, setBookingParams, token }: any) => {
  useExternalStyle("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
  useExternalScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(`${API_BASE}/slots/all`, {
          headers: { "X-Auth-Token": token },
        });
        const data = await res.json();
        setAreas(Array.isArray(data) ? data : []);
        setLoading(false);
      } catch (e) {
        setLoading(false);
      }
    };
    init();
  }, [token]);

  // Leaflet Init
  useEffect(() => {
    if ((window as any).L && !mapRef.current && !loading) {
      const map = (window as any).L.map("map-container").setView(
        [22.7196, 75.8577],
        12,
      );
      (window as any).L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ).addTo(map);

      areas.forEach((area) => {
        if (area.latitude && area.longitude) {
          (window as any).L.marker([area.latitude, area.longitude])
            .addTo(map)
            .bindPopup(
              `<b>${area.name}</b><br>${area.address}<br><button onclick="window.selectArea(${area.areaId})" style="color:blue;font-weight:bold">View Slots</button>`,
            );
        }
      });
      mapRef.current = map;
    }
  }, [loading, areas]);

  // Global handler for popup click (hack for Leaflet inside React)
  useEffect(() => {
    (window as any).selectArea = (areaId: number) => {
      const area = areas.find((a) => a.areaId === areaId);
      if (area) handleViewSlots(area);
    };
  }, [areas]);

  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [areaSlots, setAreaSlots] = useState<any[]>([]);

  const handleViewSlots = async (area: any) => {
    setSelectedArea(area);
    const res = await fetch(`${API_BASE}/slots/area/${area.areaId}`, {
      headers: { "X-Auth-Token": token },
    });
    setAreaSlots(await res.json());
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-white p-4 shadow-sm z-10 flex justify-between items-center">
        <h1 className="font-bold text-lg">Find Parking</h1>
        <button
          onClick={() => setView("dashboard")}
          className="text-sm text-gray-500"
        >
          Back
        </button>
      </div>
      <div id="map-container" className="flex-1 bg-gray-200 z-0 relative" />

      {/* Search Overlay */}
      <div className="absolute top-20 left-4 right-4 z-[400]">
        <input
          type="text"
          placeholder="Search area..."
          className="w-full p-3 rounded-full shadow-lg border border-gray-200 text-sm outline-none"
          onChange={(e) => {
            // Basic search logic could go here
          }}
        />
      </div>

      {selectedArea && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="font-bold">{selectedArea.name}</h2>
              <button onClick={() => setSelectedArea(null)}>✕</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {areaSlots.map((s: any) => (
                <button
                  key={s.slotId}
                  disabled={s.status !== "AVAILABLE"}
                  onClick={() => {
                    setBookingParams({
                      slotId: s.slotId,
                      areaId: selectedArea.areaId,
                      slotInfo: s,
                      areaInfo: selectedArea,
                    });
                    setView("booking");
                  }}
                  className={`p-2 rounded border text-center text-xs ${
                    s.status === "AVAILABLE"
                      ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      : s.status === "OCCUPIED"
                        ? "bg-red-50 border-red-200 text-red-400"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <div className="font-bold">{s.slotNumber}</div>
                  <div className="text-[10px]">{s.status}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- BOOKING PAGE ---
const BookingPage = ({ params, setView, token }: any) => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/user/vehicles`, { headers: { "X-Auth-Token": token } })
      .then((r) => r.json())
      .then(setVehicles);
  }, []);

  const handleBooking = async (status: string) => {
    if (!selectedVehicle) return alert("Select a vehicle");
    try {
      const res = await fetch(`${API_BASE}/bookings/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": token },
        body: JSON.stringify({
          vehicleId: selectedVehicle,
          slotId: params.slotId,
          areaId: params.areaId,
          initialStatus: status,
        }),
      });
      if (res.ok) {
        setView("active-bookings");
      } else {
        const err = await res.json();
        alert(err.message || "Booking Failed");
      }
    } catch (e) {
      alert("Error");
    }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Confirm Booking</h2>
        <div className="mb-4">
          <p className="text-sm text-gray-500">Area</p>
          <p className="font-bold">{params.areaInfo?.name}</p>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-500">Slot</p>
          <p className="text-2xl font-mono text-indigo-600 font-bold">
            {params.slotInfo?.slotNumber}
          </p>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-500">Rate</p>
          <p className="font-bold">₹{params.slotInfo?.baseHourlyRate}/hr</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-500 mb-2">
            Select Vehicle
          </label>
          <select
            className="w-full p-3 border rounded-lg bg-white"
            onChange={(e) => setSelectedVehicle(e.target.value)}
          >
            <option value="">-- Choose --</option>
            {vehicles.map((v: any) => (
              <option key={v.vehicle.vehicleId} value={v.vehicle.vehicleId}>
                {v.vehicle.model} ({v.vehicle.registerNumber})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleBooking("RESERVED")}
            className="flex-1 bg-amber-500 text-white py-3 rounded-lg font-bold"
          >
            Reserve
          </button>
          <button
            onClick={() => handleBooking("ACTIVE_PARKING")}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold"
          >
            Park Now
          </button>
        </div>
        <button
          onClick={() => setView("slots")}
          className="w-full mt-4 text-gray-500 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// --- ACTIVE BOOKINGS (WebSockets) ---
const ActiveBookings = ({ token, setView }: any) => {
  useExternalScript(
    "https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.6.1/sockjs.min.js",
  );
  useExternalScript(
    "https://cdnjs.cloudflare.com/ajax/libs/stomp.js/2.3.3/stomp.min.js",
  );

  const [active, setActive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState("00:00");

  useEffect(() => {
    const fetchActive = async () => {
      try {
        const res = await fetch(`${API_BASE}/bookings/active`, {
          headers: { "X-Auth-Token": token },
        });
        if (res.ok) setActive(await res.json());
        else setActive(null);
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };
    fetchActive();

    // WS Connection
    let stompClient: any = null;
    const connectWS = () => {
      if (!(window as any).SockJS || !(window as any).Stomp) return;
      const socket = new (window as any).SockJS(SOCKET_URL);
      stompClient = (window as any).Stomp.over(socket);
      stompClient.debug = null;
      stompClient.connect({ "X-Auth-Token": token }, () => {
        stompClient.subscribe("/user/queue/booking-updates", (msg: any) => {
          const b = JSON.parse(msg.body);
          setActive(b);
        });
      });
    };
    const interval = setInterval(() => {
      if ((window as any).SockJS) {
        connectWS();
        clearInterval(interval);
      }
    }, 1000);

    return () => {
      if (stompClient) stompClient.disconnect();
    };
  }, [token]);

  // Timer Logic
  useEffect(() => {
    if (!active) return;
    const start = new Date(
      active.reservationTime || active.arrivalTime || active.bookingTime,
    ).getTime();
    const tInt = setInterval(() => {
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setTimer(`${h}:${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`);
    }, 1000);
    return () => clearInterval(tInt);
  }, [active]);

  const handleAction = async (action: string) => {
    try {
      const res = await fetch(`${API_BASE}/bookings/${active.id}/${action}`, {
        method: "POST",
        headers: { "X-Auth-Token": token },
      });
      if (res.ok) {
        if (action === "end") {
          const receipt = await res.json();
          alert(`Payment Successful! Amount: ₹${receipt.amountPaid}`);
          setView("dashboard");
        } else {
          // Refresh
          const upd = await fetch(`${API_BASE}/bookings/active`, {
            headers: { "X-Auth-Token": token },
          });
          setActive(await upd.json());
        }
      }
    } catch (e) {
      alert("Action Failed");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (
    !active ||
    active.status === "COMPLETED" ||
    active.status === "CANCELLED_NO_SHOW"
  )
    return (
      <div className="p-8 text-center flex flex-col items-center h-screen justify-center">
        <div className="text-4xl mb-4">😴</div>
        <h3 className="font-bold text-gray-800">No Active Session</h3>
        <button
          onClick={() => setView("slots")}
          className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-full font-bold"
        >
          Find Parking
        </button>
      </div>
    );

  return (
    <div className="bg-gray-800 min-h-screen p-4 flex justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative flex flex-col h-fit">
        <div
          className={`p-6 text-center text-white ${active.status === "RESERVED" ? "bg-amber-500" : "bg-emerald-600"}`}
        >
          <h2 className="text-2xl font-black">
            {active.status.replace("_", " ")}
          </h2>
          <div className="text-4xl font-mono mt-2 font-bold">{timer}</div>
        </div>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-lg">{active.areaName}</h3>
              <p className="text-sm text-gray-500">
                Slot:{" "}
                <span className="font-mono text-black font-bold">
                  {active.slotNumber}
                </span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Vehicle</div>
              <div className="font-bold">{active.vehicleNumber}</div>
            </div>
          </div>

          {active.status === "RESERVED" ? (
            <button
              onClick={() => handleAction("arrive")}
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg"
            >
              Scan Arrival QR
            </button>
          ) : (
            <button
              onClick={() => handleAction("end")}
              className="w-full bg-rose-600 text-white font-bold py-3 rounded-xl shadow-lg"
            >
              Stop Timer & Pay
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- ADMIN DASHBOARD ---
const AdminDashboard = ({ token, setView }: any) => {
  useExternalScript("https://cdn.jsdelivr.net/npm/chart.js");
  const [stats, setStats] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [tab, setTab] = useState("staff"); // staff | analytics

  useEffect(() => {
    fetch(`${API_BASE}/admin/analytics/all-areas`, {
      headers: { "X-Auth-Token": token },
    })
      .then((r) => r.json())
      .then(setStats);
    fetch(`${API_BASE}/admin/pending-approvals`, {
      headers: { "X-Auth-Token": token },
    })
      .then((r) => r.json())
      .then(setPending);
    fetch(`${API_BASE}/admin/get-all-staff/`, {
      headers: { "X-Auth-Token": token },
    })
      .then((r) => r.json())
      .then(setStaff);
  }, [token]);

  const approve = async (id: number) => {
    await fetch(`${API_BASE}/admin/approve/${id}`, {
      method: "PUT",
      headers: { "X-Auth-Token": token },
    });
    alert("User Approved");
    setPending(pending.filter((u) => u.userId !== id));
  };

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100">
      <header className="bg-indigo-950 p-4 shadow-lg flex justify-between items-center">
        <h1 className="font-bold text-lg">⚡ Admin Console</h1>
        <button
          onClick={() => setView("auth")}
          className="text-xs bg-gray-800 px-3 py-1 rounded"
        >
          Logout
        </button>
      </header>
      <div className="flex border-b border-gray-700 bg-gray-800">
        <button
          onClick={() => setTab("staff")}
          className={`flex-1 py-3 text-sm font-bold ${tab === "staff" ? "text-pink-500 border-b-2 border-pink-500" : ""}`}
        >
          Staff
        </button>
        <button
          onClick={() => setTab("analytics")}
          className={`flex-1 py-3 text-sm font-bold ${tab === "analytics" ? "text-pink-500 border-b-2 border-pink-500" : ""}`}
        >
          Analytics
        </button>
      </div>

      <div className="p-4 max-w-7xl mx-auto">
        {tab === "staff" && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pending */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="font-bold text-orange-400 mb-4 flex justify-between">
                Pending Requests{" "}
                <span className="bg-orange-500 text-white px-2 rounded-full text-xs py-0.5">
                  {pending.length}
                </span>
              </h3>
              {pending.map((u) => (
                <div
                  key={u.userId}
                  className="flex justify-between items-center bg-gray-700 p-3 rounded mb-2"
                >
                  <div>
                    <div className="font-bold text-sm">{u.name}</div>
                    <div className="text-xs text-gray-400">
                      {u.role} • {u.email}
                    </div>
                  </div>
                  <button
                    onClick={() => approve(u.userId)}
                    className="bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                </div>
              ))}
              {pending.length === 0 && (
                <p className="text-gray-500 text-xs">No pending requests.</p>
              )}
            </div>
            {/* Staff */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="font-bold text-white mb-4">Active Staff</h3>
              <div className="space-y-2 h-96 overflow-y-auto">
                {staff.map((u) => (
                  <div
                    key={u.userId}
                    className="flex justify-between items-center p-2 border-b border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${u.role === "ADMIN" ? "bg-pink-600" : "bg-amber-600"}`}
                      >
                        {u.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-bold">{u.name}</div>
                        <div className="text-xs text-gray-400">{u.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "analytics" && (
          <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-900 text-gray-200 uppercase text-xs">
                <tr>
                  <th className="p-4">Area</th>
                  <th className="p-4">Owner</th>
                  <th className="p-4 text-right">Revenue</th>
                  <th className="p-4 text-right">Bookings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {stats.map((area) => (
                  <tr key={area.areaId} className="hover:bg-gray-700/50">
                    <td className="p-4 font-bold text-white">{area.name}</td>
                    <td className="p-4">{area.owner}</td>
                    <td className="p-4 text-right text-green-400 font-mono font-bold">
                      ₹{area.totalEarnings.toFixed(2)}
                    </td>
                    <td className="p-4 text-right">{area.totalBookings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// --- OWNER DASHBOARD ---
const OwnerDashboard = ({ token, setView }: any) => {
  const [areas, setAreas] = useState<any[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/area-owner/my-areas`, {
      headers: { "X-Auth-Token": token },
    })
      .then((r) => r.json())
      .then((data) => {
        setAreas(data);
        if (data.length > 0) selectArea(data[0].areaId);
      });
  }, [token]);

  const selectArea = async (id: number) => {
    setSelectedArea(id);
    const res = await fetch(`${API_BASE}/area-owner/area/${id}/slots`, {
      headers: { "X-Auth-Token": token },
    });
    setSlots(await res.json());
  };

  const createArea = async (e: any) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      name: form.name.value,
      address: form.addr.value,
      latitude: parseFloat(form.lat.value),
      longitude: parseFloat(form.lon.value),
      capacitySmall: parseInt(form.cs.value),
      capacityMedium: parseInt(form.cm.value),
      capacityLarge: parseInt(form.cl.value),
      baseRateSmall: parseFloat(form.rs.value),
      baseRateMedium: parseFloat(form.rm.value),
      baseRateLarge: parseFloat(form.rl.value),
    };
    await fetch(`${API_BASE}/area-owner/create-area`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Token": token },
      body: JSON.stringify(payload),
    });
    alert("Area Created");
    setModalOpen(false);
    // Refresh logic skipped for brevity
  };

  return (
    <div className="bg-gray-800 min-h-screen">
      <header className="bg-amber-900 text-white p-4 shadow flex justify-between items-center">
        <h1 className="font-bold flex items-center gap-2">🏢 Owner Console</h1>
        <button
          onClick={() => setView("auth")}
          className="text-xs hover:underline"
        >
          Logout
        </button>
      </header>

      <div className="p-4 grid lg:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-xl overflow-hidden shadow">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="font-bold text-gray-700">My Properties</h3>
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold"
            >
              + New
            </button>
          </div>
          <div className="divide-y">
            {areas.map((a) => (
              <div
                key={a.areaId}
                onClick={() => selectArea(a.areaId)}
                className={`p-3 cursor-pointer hover:bg-amber-50 ${selectedArea === a.areaId ? "border-l-4 border-amber-500 bg-amber-50" : ""}`}
              >
                <div className="font-bold text-sm text-gray-800">{a.name}</div>
                <div className="text-xs text-gray-500 truncate">
                  {a.address}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedArea && (
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold text-lg mb-4 text-gray-800">
                Slot Management
              </h2>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {slots.map((s) => (
                  <div
                    key={s.slotId}
                    className={`p-2 rounded text-center border text-xs cursor-pointer hover:scale-105 transition
                                    ${
                                      s.status === "AVAILABLE"
                                        ? "bg-green-100 text-green-800 border-green-200"
                                        : s.status === "OCCUPIED"
                                          ? "bg-red-100 text-red-800 border-red-200"
                                          : s.status === "RESERVED"
                                            ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                            : "bg-gray-200 text-gray-500 border-gray-300"
                                    }`}
                  >
                    <div className="font-bold">{s.slotNumber}</div>
                    <div className="text-[10px]">
                      {s.status.substring(0, 4)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm z-50">
          <form
            onSubmit={createArea}
            className="bg-white rounded-xl p-6 w-full max-w-lg space-y-3"
          >
            <h3 className="font-bold text-lg">Create New Area</h3>
            <input
              name="name"
              placeholder="Name"
              className="w-full border p-2 rounded text-sm"
              required
            />
            <input
              name="addr"
              placeholder="Address"
              className="w-full border p-2 rounded text-sm"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                name="lat"
                placeholder="Latitude"
                defaultValue="22.7"
                className="border p-2 rounded text-sm"
              />
              <input
                name="lon"
                placeholder="Longitude"
                defaultValue="75.8"
                className="border p-2 rounded text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                name="cs"
                type="number"
                placeholder="Cap S"
                className="border p-2 rounded text-sm"
                required
              />
              <input
                name="cm"
                type="number"
                placeholder="Cap M"
                className="border p-2 rounded text-sm"
                required
              />
              <input
                name="cl"
                type="number"
                placeholder="Cap L"
                className="border p-2 rounded text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                name="rs"
                type="number"
                placeholder="Rate S"
                className="border p-2 rounded text-sm"
                required
              />
              <input
                name="rm"
                type="number"
                placeholder="Rate M"
                className="border p-2 rounded text-sm"
                required
              />
              <input
                name="rl"
                type="number"
                placeholder="Rate L"
                className="border p-2 rounded text-sm"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-amber-600 text-white font-bold py-2 rounded"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="w-full text-gray-500 text-sm"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

// --- MISC PAGES ---
const VehicleRegister = ({ token, setView }: any) => {
  const handleSave = async (e: any) => {
    e.preventDefault();
    const data = {
      registerNumber: e.target.plate.value,
      model: e.target.model.value,
      color: e.target.color.value,
      type: e.target.type.value,
      isPrimary: e.target.primary.checked,
    };
    await fetch(`${API_BASE}/vehicles/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Token": token },
      body: JSON.stringify(data),
    });
    setView("dashboard");
  };
  return (
    <div className="p-4 bg-gray-100 min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSave}
        className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm space-y-4"
      >
        <h2 className="font-bold text-xl">Add Vehicle</h2>
        <input
          name="plate"
          placeholder="Plate No (MH 04...)"
          className="w-full border p-2 rounded"
          required
        />
        <input
          name="model"
          placeholder="Model"
          className="w-full border p-2 rounded"
          required
        />
        <input
          name="color"
          placeholder="Color"
          className="w-full border p-2 rounded"
          required
        />
        <div className="flex gap-4">
          <label>
            <input type="radio" name="type" value="SMALL" /> Bike
          </label>
          <label>
            <input type="radio" name="type" value="MEDIUM" defaultChecked /> Car
          </label>
          <label>
            <input type="radio" name="type" value="LARGE" /> SUV
          </label>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="primary" /> Set Default
        </label>
        <button className="w-full bg-indigo-600 text-white font-bold py-2 rounded">
          Save
        </button>
        <button
          type="button"
          onClick={() => setView("dashboard")}
          className="w-full text-gray-500"
        >
          Cancel
        </button>
      </form>
    </div>
  );
};

const Profile = ({ user, token, setUser, setView }: any) => {
  const [amount, setAmount] = useState("");
  const topUp = async () => {
    if (!amount) return;
    await fetch(`${API_BASE}/wallet/topup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Token": token },
      body: JSON.stringify({
        amount: parseFloat(amount),
        paymentMethod: "UPI",
      }),
    });
    const res = await fetch(`${API_BASE}/user/profile`, {
      headers: { "X-Auth-Token": token },
    });
    setUser(await res.json());
    setAmount("");
    alert("Wallet Updated");
  };
  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xl">
            {user.name[0]}
          </div>
          <div>
            <h2 className="font-bold text-lg">{user.name}</h2>
            <div className="text-gray-500 text-sm">{user.email}</div>
          </div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 text-white">
          <div className="text-xs text-gray-400">Wallet Balance</div>
          <div className="text-3xl font-bold mb-4">
            ₹{user.walletBalance.toFixed(2)}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-gray-800 border-none rounded text-white p-2 w-full text-sm"
            />
            <button
              onClick={topUp}
              className="bg-indigo-600 px-4 py-2 rounded text-sm font-bold"
            >
              Add
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem("parkease_token");
            setView("auth");
          }}
          className="w-full border border-red-200 text-red-600 py-3 rounded-xl font-bold hover:bg-red-50"
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

// --- MAIN APP ---
function App1() {
  const [view, setView] = useState("auth");
  const [token, setToken] = useState(localStorage.getItem("parkease_token"));
  const [user, setUser] = useState<any>(null);
  const [bookingParams, setBookingParams] = useState<any>(null);

  // Initial Auth Check
  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/user/profile`, { headers: { "X-Auth-Token": token } })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then((u) => {
          setUser(u);
          if (view === "auth") {
            if (u.role === "ADMIN") setView("admin-dashboard");
            else if (u.role === "AREA_OWNER") setView("owner-dashboard");
            else setView("dashboard");
          }
        })
        .catch(() => {
          setToken(null);
          localStorage.removeItem("parkease_token");
          setView("auth");
        });
    } else {
      setView("auth");
    }
  }, [token]);

  const renderView = () => {
    switch (view) {
      case "auth":
        return (
          <AuthPage setToken={setToken} setUser={setUser} setView={setView} />
        );
      case "dashboard":
        return <Dashboard user={user} setView={setView} token={token} />;
      case "slots":
        return (
          <SlotsMap
            setView={setView}
            setBookingParams={setBookingParams}
            token={token}
          />
        );
      case "booking":
        return (
          <BookingPage params={bookingParams} setView={setView} token={token} />
        );
      case "active-bookings":
        return <ActiveBookings token={token} setView={setView} />;
      case "vehicle-register":
        return <VehicleRegister token={token} setView={setView} />;
      case "profile":
        return (
          <Profile
            user={user}
            token={token}
            setUser={setUser}
            setView={setView}
          />
        );
      case "admin-dashboard":
        return <AdminDashboard token={token} setView={setView} />;
      case "owner-dashboard":
        return <OwnerDashboard token={token} setView={setView} />;
      default:
        return <div className="p-10 text-center">Page Not Found</div>;
    }
  };

  return (
    <div className="font-sans text-gray-900 bg-gray-50 min-h-screen">
      {renderView()}
      {user && view !== "auth" && (
        <BottomNav setView={setView} currentView={view} role={user.role} />
      )}
    </div>
  );
}

export default App1;
