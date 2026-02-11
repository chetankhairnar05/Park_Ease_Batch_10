import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// Configuration: API base for wallet-specific services
const API_BASE = "http://localhost:8080/api";

export default function Pay() {
  // --- STATE & PARAMS MANAGEMENT ---
  const navigate = useNavigate();

  /** * useSearchParams: Extracts variables from the URL.
   * Example: /pay?amount=500 -> amount = 500
   */
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem("parkease_token");

  // Get the amount from the URL and convert it to a float for math/API operations
  const amount = parseFloat(searchParams.get("amount"));

  // UI States: Manage the "In-Progress" and "Success" full-screen overlays
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // --- SECURITY & VALIDATION ---
  useEffect(() => {
    // 1. Redirect if user isn't logged in
    if (!token) navigate("/auth");

    // 2. Prevent payment if amount is missing or invalid (NaN)
    if (!amount || isNaN(amount)) {
      alert("Invalid amount");
      navigate("/profile");
    }
  }, [token, amount, navigate]);

  // --- API CALL LOGIC ---
  const processPayment = async (method) => {
    setProcessing(true); // Triggers the "Processing" loading overlay

    /** * Simulation: We use a manual 2-second delay to mimic the
     * bank's redirection and processing time.
     */
    await new Promise((r) => setTimeout(r, 2000));

    try {
      // POST Request: Updates the user's wallet balance on the backend
      const res = await fetch(`${API_BASE}/wallet/topup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": token, // Identity verification
        },
        body: JSON.stringify({
          amount: amount,
          paymentMethod: method, // "UPI" or "CARD"
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Payment Failed");

      // SUCCESS FLOW
      setProcessing(false); // Hide spinner
      setSuccess(true);     // Show Success checkmark overlay

      // Wait 2 seconds so the user can see the "Success" screen before redirecting
      setTimeout(() => {
        navigate("/profile");
      }, 2000);
    } catch (err) {
      setProcessing(false); // Hide spinner so user can try again
      alert(err.message);
    }
  };

  return (
    <div className="bg-gray-600 min-h-screen flex justify-center items-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden relative">

        {/* Header: Displays the dynamic amount passed from the Profile page */}
        <div className="bg-gray-950 p-6 text-white text-center">
          <h2 className="text-sm font-medium text-gray-200 uppercase tracking-widest">
            Total Payable
          </h2>
          <div className="text-4xl font-bold mt-2">₹{amount?.toFixed(2)}</div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-900 font-bold uppercase mb-2">
            Select Payment Method
          </p>

          {/* UPI Payment Option */}
          <button
            onClick={() => processPayment("UPI")}
            className="w-full flex items-center p-4 border rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition group"
          >
            <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mr-4 group-hover:scale-110 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-800">UPI / BHIM</h3>
              <p className="text-xs text-gray-900">GooglePay, PhonePe, Paytm</p>
            </div>
          </button>

          {/* Card Payment Option */}
          <button
            onClick={() => processPayment("CARD")}
            className="w-full flex items-center p-4 border rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition group"
          >
            <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mr-4 group-hover:scale-110 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-800">Credit / Debit Card</h3>
              <p className="text-xs text-gray-900">Visa, Mastercard, RuPay</p>
            </div>
          </button>

          {/* Cancel: Uses navigate(-1) to go back to the previous screen (Profile) */}
          <button
            onClick={() => navigate(-1)}
            className="w-full text-center text-white bg-gray-900 text-sm font-bold py-3 rounded-2xl mt-4"
          >
            Cancel Transaction
          </button>
        </div>

        {/* PROCESSING OVERLAY:
            Positioned 'absolute' to cover the whole card while the API is working.
        */}
        {processing && (
          <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
            <h3 className="font-bold text-gray-800">Processing Payment...</h3>
            <p className="text-xs text-gray-500">Please do not close this window</p>
          </div>
        )}

        {/* SUCCESS OVERLAY:
            Displayed only after the backend confirms the wallet top-up.
        */}
        {success && (
          <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-4 animate-bounce">
              ✓
            </div>
            <h3 className="text-xl font-bold text-gray-800">Payment Successful!</h3>
            <p className="text-sm text-gray-500 mt-2">Redirecting to profile...</p>
          </div>
        )}
      </div>
    </div>
  );
}