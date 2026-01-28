import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Client } from "@stomp/stompjs";

const API_BASE = "http://localhost:8080/api";
const SOCKET_URL = "ws://localhost:8080/ws"; // Note: Use 'ws://' for native STOMP or 'http://' if using SockJS adapter, but Client prefers ws

export default function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slotId = searchParams.get("slotId");
  const urlAreaId = searchParams.get("areaId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slotInfo, setSlotInfo] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");

  // Stage Control
  const [stage, setStage] = useState("CONFIRM"); // CONFIRM or LIVE

  // Live State
  const [liveBooking, setLiveBooking] = useState(null);
  const [timerStr, setTimerStr] = useState("00:00");
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
        const errJson = JSON.parse(text);
        throw new Error(errJson.error || text);
      } catch {
        throw new Error(text || `API Error: ${res.status}`);
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
    if (!slotId) {
      setError("Invalid Booking Link. Slot ID missing.");
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const sInfo = await fetchAPI(`/slots/${slotId}/details`);
        setSlotInfo(sInfo);

        const vList = await fetchAPI("/user/vehicles");
        setVehicles(vList);

        // Auto-select primary compatible vehicle
        const compatible = vList.filter((v) => {
          const vType = v.vehicle.vehicleType;
          if (sInfo.type === "SMALL") return vType === "SMALL";
          if (sInfo.type === "MEDIUM")
            return vType === "SMALL" || vType === "MEDIUM";
          return true;
        });

        if (compatible.length > 0) {
          const primary = compatible.find((v) => v.isPrimary);
          setSelectedVehicle(
            primary
              ? primary.vehicle.vehicleId
              : compatible[0].vehicle.vehicleId,
          );
        }

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    init();

    return () => {
      stopTimer();
      if (stompClientRef.current) stompClientRef.current.deactivate();
    };
  }, [slotId, token, navigate]);

  const handleCreateBooking = async (status) => {
    if (!selectedVehicle) {
      alert("Please select a vehicle");
      return;
    }

    // Use areaId from API response if available, else from URL
    const finalAreaId = slotInfo.areaId || urlAreaId;
    if (!finalAreaId) {
      alert("Area ID missing");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchAPI("/bookings/create", "POST", {
        vehicleId: selectedVehicle,
        slotId,
        areaId: finalAreaId,
        initialStatus: status,
      });

      setLiveBooking(res);
      setStage("LIVE");
      connectWS();
      updateLiveUI(res);

      // In original HTML, it redirects. Here we can stay or redirect.
      // HTML said: window.location.href = "active-bookings.html";
      navigate("/active-bookings");
    } catch (e) {
      alert("Booking Failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- WEBSOCKETS ---
  const connectWS = () => {
    // Note: Since you are using @stomp/stompjs in package.json, we use Client
    const client = new Client({
      brokerURL: SOCKET_URL,
      connectHeaders: { "X-Auth-Token": token },
      debug: (str) => console.log(str),
      onConnect: () => {
        client.subscribe("/user/queue/booking-updates", (msg) => {
          const b = JSON.parse(msg.body);
          updateLiveUI(b);
        });
        client.subscribe("/user/queue/notifications", (msg) => {
          alert("🔔 " + msg.body);
          if (msg.body.includes("Cancelled")) navigate("/dashboard");
        });
      },
    });
    client.activate();
    stompClientRef.current = client;
  };

  const updateLiveUI = (booking) => {
    setLiveBooking(booking);
    if (
      booking.status === "COMPLETED" ||
      booking.status === "CANCELLED_NO_SHOW"
    ) {
      stopTimer();
    } else {
      startTimer();
    }
  };

  const startTimer = () => {
    stopTimer();
    let sec = 0;
    timerIntervalRef.current = setInterval(() => {
      sec++;
      const m = Math.floor(sec / 60)
        .toString()
        .padStart(2, "0");
      const s = (sec % 60).toString().padStart(2, "0");
      setTimerStr(`${m}:${s}`);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  if (loading)
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center p-4 font-sans">
      {/* Header */}
      <div className="w-full max-w-lg bg-white rounded-xl shadow-sm p-4 mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="bg-indigo-100 text-indigo-700 p-1.5 rounded text-xs font-bold">
            P
          </span>
          <h1 className="font-bold text-gray-800 text-sm">Booking</h1>
        </div>
        <Link
          to="/dashboard"
          className="text-xs text-white bg-gray-900 font-black px-3 py-1.5 rounded hover:bg-black transition"
        >
          Go Back
        </Link>
      </div>

      {error && (
        <div className="w-full max-w-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm text-center">
          {error}
        </div>
      )}

      {/* STAGE 1: CONFIRMATION */}
      {stage === "CONFIRM" && slotInfo && (
        <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-6">
          <div className="border-b border-gray-100 pb-4 mb-4">
            <h2 className="text-lg font-black text-gray-900 leading-tight">
              {slotInfo.areaName || "Unknown Area"}
            </h2>
            <p className="text-sm text-gray-900 mt-1">
              {slotInfo.address || "Unknown Address"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-100">
              <span className="block text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                Slot No
              </span>
              <span className="font-mono text-xl font-bold text-indigo-600">
                {slotInfo.slotNumber}
              </span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-100">
              <span className="block text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                Type
              </span>
              <span className="font-bold text-gray-700 text-sm">
                {slotInfo.type}
              </span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-100">
              <span className="block text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                Floor
              </span>
              <span className="font-bold text-gray-700 text-sm">
                {slotInfo.floor}
              </span>
            </div>
          </div>

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 mb-6 text-xs text-amber-950">
            <p className="font-bold mb-1">⏱️ Policy Info:</p>
            <p>
              • Arrive within <strong>10 mins</strong>: Reservation is FREE.
            </p>
            <p>
              • Must arrive within <strong>30 mins</strong> or booking cancels.
            </p>
          </div>

          <div className="space-y-2 mb-6 text-sm bg-indigo-50 p-4 rounded-lg border border-indigo-100">
            <div className="flex justify-between">
              <span className="text-indigo-950 font-bold">Parking Rate</span>
              <span className="font-bold text-indigo-900">
                ₹{slotInfo.baseRate}/hr
              </span>
            </div>
            <div className="flex justify-between border-t border-indigo-200 pt-2 mt-2">
              <span className="text-indigo-950 font-bold">
                Reservation Rate
              </span>
              <span className="font-bold text-indigo-900">
                ₹{slotInfo.reservationRate || slotInfo.baseRate}/hr
              </span>
            </div>
          </div>

          <div className="mb-12">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
              Select Vehicle
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition"
            >
              <option value="">-- Select Vehicle --</option>
              {vehicles.map((item) => (
                // Filtering Logic inside map isn't ideal but works for small lists. Better to filter before mapping.
                <option
                  key={item.vehicle.vehicleId}
                  value={item.vehicle.vehicleId}
                >
                  {item.vehicle.model} ({item.vehicle.registerNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleCreateBooking("RESERVED")}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl shadow-sm text-sm transition transform active:scale-95"
            >
              Reserve Slot
            </button>
            <button
              onClick={() => handleCreateBooking("ACTIVE_PARKING")}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-sm text-sm transition transform active:scale-95"
            >
              Park Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
