import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:8080/api/auth";

export default function RegisterOfficial() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    role: "",
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [alert, setAlert] = useState({ message: "", type: "", show: false });

  const showAlert = (message, type) => {
    setAlert({ message, type, show: true });
    setTimeout(() => setAlert({ ...alert, show: false }), 4000);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.role) {
      showAlert("Please select a role.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/register-official`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      if (response.ok) {
        showAlert(
          "Official Account Created! Redirecting to login...",
          "success",
        );
        setFormData({ role: "", name: "", email: "", phone: "", password: "" });
        setTimeout(() => navigate("/auth"), 2000);
      } else {
        showAlert(data.message || data.error || "Registration Failed", "error");
      }
    } catch (error) {
      console.error(error);
      showAlert("Server connection failed.", "error");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  return (
    <div className="bg-gray-900 flex items-center justify-center min-h-screen p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden fade-in">
        <div className="bg-indigo-900 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-700 mb-4 text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Partner Access
          </h1>
          <p className="text-indigo-200 mt-2 text-sm">
            Register as Admin or Area Owner
          </p>
        </div>

        <div className="p-8">
          {alert.show && (
            <div
              className={`mb-4 p-3 rounded text-sm text-center ${alert.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
            >
              {alert.message}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Role
              </label>
              <div className="relative">
                <select
                  id="role"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                  required
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="" disabled>
                    Choose your role...
                  </option>
                  <option value="AREA_OWNER">🏢 Area Owner</option>
                  <option value="ADMIN">⚡ Admin</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Official Name"
                required
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="official@parkease.com"
                required
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="9876543210"
                required
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Create a strong password"
                required
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-900 hover:bg-indigo-800 text-white font-bold py-3 rounded-lg shadow-lg transition transform active:scale-95 mt-4"
            >
              Register Official Account
            </button>
          </form>
        </div>

        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
          <Link
            to="/auth"
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            &larr; Back to User Login
          </Link>
        </div>
      </div>
    </div>
  );
}
