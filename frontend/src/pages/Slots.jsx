import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet Icon Issue in React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const blueIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const API_BASE = "http://localhost:8080/api";

export default function Slots() {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  const [allParkingData, setAllParkingData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ name: "", dist: "", id: null });
  const [modalSlots, setModalSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const token = localStorage.getItem("parkease_token");

  // Helper API Fetch
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

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }

    const init = async () => {
      try {
        const user = await fetchAPI("/user/profile");
        if (user.role !== "DRIVER") {
          alert("Only Driver Route");
          navigate("/dashboard");
          return;
        }

        // Initialize Map
        if (!mapInstanceRef.current) {
          const lat = user.latitude || 22.7196;
          const lon = user.longitude || 75.8577;

          const map = L.map(mapContainerRef.current).setView([lat, lon], 13);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "OSM",
          }).addTo(map);

          markersGroupRef.current = L.layerGroup().addTo(map);
          mapInstanceRef.current = map;

          // Add User Marker
          L.marker([lat, lon], { icon: blueIcon })
            .addTo(map)
            .bindPopup("You")
            .openPopup();
        }

        findAllParking();
      } catch (e) {
        console.error(e);
      }
    };

    init();

    // Cleanup map on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [token, navigate]);

  const findAllParking = async () => {
    setLoading(true);
    try {
      const areas = await fetchAPI("/slots/all");
      setAllParkingData(areas);
      setFilteredData(areas);
      renderMapMarkers(areas);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderMapMarkers = (areas) => {
    if (!markersGroupRef.current) return;
    markersGroupRef.current.clearLayers();

    areas.forEach((area) => {
      if (area.latitude && area.longitude) {
        const marker = L.marker([area.latitude, area.longitude], {
          icon: redIcon,
        });

        // Create a popup DOM element so we can attach React-like events (or just native JS)
        const popupContent = document.createElement("div");
        popupContent.innerHTML = `
          <b>${area.name}</b><br>
          <button id="popup-btn-${area.areaId}" class="text-indigo-600 font-bold text-xs mt-1 underline">View Slots</button>
        `;

        marker.bindPopup(popupContent);
        marker.on("popupopen", () => {
          const btn = document.getElementById(`popup-btn-${area.areaId}`);
          if (btn) {
            btn.onclick = () =>
              openSlotsModal(area.areaId, area.name, area.distanceKm);
          }
        });

        markersGroupRef.current.addLayer(marker);
      }
    });
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    const tokens = query.split(" ").filter((t) => t.trim() !== "");
    if (tokens.length === 0) {
      setFilteredData(allParkingData);
      renderMapMarkers(allParkingData);
      return;
    }

    const filtered = allParkingData.filter((area) => {
      const searchString = (area.name + " " + area.address).toLowerCase();
      return tokens.every((token) => searchString.includes(token));
    });

    setFilteredData(filtered);
    renderMapMarkers(filtered);
  };

  const openSlotsModal = async (id, name, dist) => {
    setModalData({ name, dist, id });
    setShowModal(true);
    setLoadingSlots(true);
    setModalSlots([]);

    try {
      const slots = await fetchAPI(`/slots/area/${id}`);
      setModalSlots(slots);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSlotClick = (slot) => {
    if (slot.status === "AVAILABLE") {
      navigate(`/booking?slotId=${slot.slotId}&areaId=${modalData.id}`);
    }
  };

  return (
    <div className="bg-gray-800 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col pb-20">
        {/* Header */}
        <header className="bg-white p-3 shadow-sm z-20 sticky top-0">
          <h1 className="font-bold text-gray-800 shrink-0 pl-3">
            Find Parking
          </h1>
          <div className="flex gap-3 items-center mt-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search area or address..."
                className="w-full bg-gray-100 text-xs px-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="absolute right-3 top-2 text-gray-400">
                <svg
                  className="w-4 h-4"
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
              </div>
            </div>
            <button
              onClick={findAllParking}
              className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-full font-bold shadow hover:bg-indigo-700 flex items-center gap-1 shrink-0"
            >
              Refresh
            </button>
          </div>
        </header>

        {/* Map */}
        <div
          ref={mapContainerRef}
          className="w-full h-[450px] bg-gray-200 z-0"
        />

        {/* Results List */}
        <div className="flex-1 bg-gray-600 p-4 overflow-y-auto rounded-t-3xl -mt-4 relative z-10">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>

          {loading && (
            <div className="text-center py-10 text-gray-400 text-sm">
              Searching nearby...
            </div>
          )}

          <div className="space-y-4">
            {!loading && filteredData.length === 0 && (
              <p className="text-center text-gray-400 text-sm">
                No matching parking found.
              </p>
            )}

            {filteredData.map((area) => (
              <div
                key={area.areaId}
                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between mb-1">
                  <h3 className="font-black text-gray-800 text-base truncate w-3/4">
                    {area.name}
                  </h3>
                  <span className="text-xs bg-indigo-900 text-white px-2 py-0.5 rounded-full font-bold">
                    {area.distanceKm}km
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3 truncate">
                  {area.address || "No Address"}
                </p>
                <div className="flex gap-2 mb-3 text-center">
                  <div className="flex-1 bg-gray-50 rounded p-1">
                    <div className="text-[10px] text-gray-400">S</div>
                    <div className="text-xs font-bold text-gray-700">
                      {area.availableSmall}
                    </div>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded p-1">
                    <div className="text-[10px] text-gray-400">M</div>
                    <div className="text-xs font-bold text-gray-700">
                      {area.availableMedium}
                    </div>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded p-1">
                    <div className="text-[10px] text-gray-400">L</div>
                    <div className="text-xs font-bold text-gray-700">
                      {area.availableLarge}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    openSlotsModal(area.areaId, area.name, area.distanceKm)
                  }
                  className="w-full bg-gray-900 text-white text-xs font-bold py-2 rounded-lg hover:bg-black transition"
                >
                  View Slots
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <div>
                  <h2 className="font-bold text-gray-800">{modalData.name}</h2>
                  <p className="text-xs text-gray-500">{modalData.dist} km</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-200 hover:bg-gray-300 rounded-full p-1 text-gray-600"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-4 overflow-y-auto grid grid-cols-4 gap-2 bg-gray-50 flex-1">
                {loadingSlots ? (
                  <div className="col-span-full text-center py-4 text-gray-400 text-xs">
                    Loading...
                  </div>
                ) : modalSlots.length === 0 ? (
                  <div className="col-span-full text-center py-4 text-gray-400 text-xs">
                    No slots available.
                  </div>
                ) : (
                  modalSlots.map((s) => {
                    let color =
                      "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed";
                    if (s.status === "AVAILABLE")
                      color =
                        "bg-green-50 text-green-700 border-green-200 cursor-pointer hover:bg-green-100";
                    else if (s.status === "OCCUPIED")
                      color =
                        "bg-red-50 text-red-300 border-red-100 cursor-not-allowed";
                    else if (s.status === "RESERVED")
                      color =
                        "bg-yellow-50 text-yellow-600 border-yellow-100 cursor-not-allowed";

                    return (
                      <div
                        key={s.slotId}
                        onClick={() => handleSlotClick(s)}
                        className={`border rounded p-1 text-center ${color}`}
                      >
                        <div className="text-[13px] font-bold">
                          {s.slotNumber}
                        </div>
                        <div className="text-[10px] ">{s.status}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

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
            className="flex flex-col items-center p-2 text-indigo-600"
          >
            <svg
              className="w-6 h-6 mb-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
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
