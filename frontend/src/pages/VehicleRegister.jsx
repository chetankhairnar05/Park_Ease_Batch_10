import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8080/api";

export default function VehicleRegister() {
  const navigate = useNavigate();
  const token = localStorage.getItem("parkease_token");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    plate: "",
    model: "",
    color: "",
    type: "MEDIUM", // Default checked
    isPrimary: false,
  });

  useEffect(() => {
    if (!token) navigate("/auth");
  }, [token, navigate]);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    // Handle radio buttons manually via name or simple id mapping
    if (type === "checkbox") {
      setFormData({ ...formData, isPrimary: checked });
    } else if (type === "radio") {
      setFormData({ ...formData, type: value });
    } else {
      // Map id "v-plate" -> "plate", etc.
      const key = id.replace("v-", "");
      setFormData({ ...formData, [key]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const body = {
      registerNumber: formData.plate,
      model: formData.model,
      color: formData.color,
      type: formData.type,
      isPrimary: formData.isPrimary,
    };

    try {
      const res = await fetch(`${API_BASE}/vehicles/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": token,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        alert("Vehicle Registered Successfully!");
        navigate("/dashboard");
      } else {
        const text = await res.text();
        alert("Error: " + text);
      }
    } catch (err) {
      alert("Connection Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 flex items-center justify-center min-h-screen p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Add Vehicle</h1>
          <Link
            to="/dashboard"
            className="text-md text-gray-950 hover:text-gray-900 bg-gray-300 px-3 py-2 rounded"
          >
            Cancel
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Plate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Plate Number
            </label>
            <input
              type="text"
              id="v-plate"
              value={formData.plate}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono tracking-wider"
              placeholder="MH 02 AB 1234"
              required
            />
          </div>

          {/* Model & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <input
                type="text"
                id="v-model"
                value={formData.model}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Honda City"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="text"
                id="v-color"
                value={formData.color}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="White"
                required
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {["SMALL", "MEDIUM", "LARGE"].map((type) => (
                <label key={type} className="cursor-pointer">
                  <input
                    type="radio"
                    name="v-type"
                    value={type}
                    checked={formData.type === type}
                    onChange={handleChange}
                    className="peer hidden"
                  />
                  <div className="border rounded-lg py-3 text-center text-sm text-gray-500 bg-white peer-checked:bg-indigo-50 peer-checked:border-indigo-500 peer-checked:text-indigo-700 transition">
                    {type === "SMALL"
                      ? "Bike"
                      : type === "MEDIUM"
                        ? "Car"
                        : "SUV"}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Primary Toggle */}
          <div className="flex items-center">
            <input
              id="v-primary"
              type="checkbox"
              checked={formData.isPrimary}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label
              htmlFor="v-primary"
              className="ml-2 block text-sm text-gray-900"
            >
              Set as default vehicle for bookings
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-70"
          >
            {loading ? "Saving..." : "Save Vehicle"}
          </button>
        </form>
      </div>
    </div>
  );
}
