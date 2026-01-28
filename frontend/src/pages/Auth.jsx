import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:8080/api/auth";

export default function Auth() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");
  const [alert, setAlert] = useState({ message: "", type: "", show: false });

  // Login State
  const [loginData, setLoginData] = useState({ identifier: "", password: "" });

  // Register State
  const [regData, setRegData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const showAlert = (message, type) => {
    setAlert({ message, type, show: true });
    // Auto hide after 3 seconds
    setTimeout(() => setAlert({ ...alert, show: false }), 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("parkease_token", data.token);
        localStorage.setItem("parkease_user", data.username);
        showAlert("Login Successful! Redirecting...", "success");
        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        showAlert(data.message || "Invalid Credentials", "error");
      }
    } catch (error) {
      console.error(error);
      showAlert("Invalid email or password?", "error");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regData),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      if (response.ok) {
        showAlert("Registration Successful! Please Login.", "success");
        setRegData({ name: "", email: "", phone: "", password: "" });
        setTimeout(() => setActiveTab("login"), 1500);
      } else {
        showAlert(data.message || data.error || "Registration Failed", "error");
      }
    } catch (error) {
      console.error(error);
      showAlert("Server connection failed.", "error");
    }
  };

  return (
    <div className="bg-gray-900 flex items-center justify-center min-h-screen p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden fade-in">
        {/* Header */}
        <div className="bg-indigo-600 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500 mb-4 text-white">
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Park Ease
          </h1>
          <p className="text-indigo-200 mt-2 text-sm">
            Smart Parking Management System
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => {
              setActiveTab("login");
              setAlert({ ...alert, show: false });
            }}
            className={`flex-1 py-4 text-sm font-medium focus:outline-none transition-colors ${
              activeTab === "login"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => {
              setActiveTab("register");
              setAlert({ ...alert, show: false });
            }}
            className={`flex-1 py-4 text-sm font-medium focus:outline-none transition-colors ${
              activeTab === "register"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Register
          </button>
        </div>

        {/* Forms Container */}
        <div className="p-8">
          {alert.show && (
            <div
              className={`mb-4 p-3 rounded text-sm text-center ${alert.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
            >
              {alert.message}
            </div>
          )}

          {activeTab === "login" && (
            <form onSubmit={handleLogin} className="space-y-5 fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email or Phone
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="user@example.com"
                  required
                  value={loginData.identifier}
                  onChange={(e) =>
                    setLoginData({ ...loginData, identifier: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="••••••••"
                  required
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center text-gray-600">
                  <input
                    type="checkbox"
                    className="mr-2 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Remember me
                </label>
                <a
                  href="#"
                  className="text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  Forgot Password?
                </a>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg transition transform active:scale-95"
              >
                Sign In
              </button>
            </form>
          )}

          {activeTab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4 fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="John Doe"
                  required
                  value={regData.name}
                  onChange={(e) =>
                    setRegData({ ...regData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="john@example.com"
                  required
                  value={regData.email}
                  onChange={(e) =>
                    setRegData({ ...regData, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="9876543210"
                  required
                  value={regData.phone}
                  onChange={(e) =>
                    setRegData({ ...regData, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Create a password"
                  required
                  value={regData.password}
                  onChange={(e) =>
                    setRegData({ ...regData, password: e.target.value })
                  }
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg transition transform active:scale-95 mt-2"
              >
                Create Account
              </button>
            </form>
          )}
        </div>

        <div className="w-full flex item-center justify-center text-sm py-5">
          <div>
            <span className="px-3 text-gray-700">Partner Registration?</span>
            <Link to="/register-official" className="text-blue-600 underline">
              register as ADMIN or AREA_OWNER
            </Link>
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            &copy; 2025 Park Ease Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
