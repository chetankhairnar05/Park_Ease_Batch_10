import { useEffect, useState } from "react";

export default function GlobalToast() {
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    // 1. Save the original browser alert (just in case)
    const originalAlert = window.alert;

    // 2. Override window.alert with our custom logic
    window.alert = (message) => {
      // Determine type based on message keywords (optional smart logic)
      let type = "success";
      if (
        message &&
        (message.toLowerCase().includes("fail") ||
          message.toLowerCase().includes("error") ||
          message.toLowerCase().includes("invalid") ||
          message.toLowerCase().includes("missing"))
      ) {
        type = "error";
      }

      setToast({ show: true, message, type });

      // Auto-hide after 3 seconds
      setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 3000);
    };

    // 3. Cleanup: Restore original alert when app unmounts (rare in single page apps)
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  if (!toast.show) return null;

  // UI Styles
  const styles =
    toast.type === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : "bg-red-50 border-red-200 text-red-800";
  const icon = toast.type === "success" ? "✓" : "⚠️";

  return (
    <div
      className={`fixed top-5 right-5 z-[9999] flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl transition-all duration-300 animate-bounce-in ${styles} max-w-xs`}
    >
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-bold">
          {toast.type === "success" ? "Notification" : "Alert"}
        </p>
        <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>
      </div>
      <button
        onClick={() => setToast({ ...toast, show: false })}
        className="text-gray-400 hover:text-gray-600 font-bold text-lg leading-none"
      >
        &times;
      </button>
    </div>
  );
}
