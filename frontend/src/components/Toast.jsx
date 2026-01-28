const Toast = ({ show, message, type, onClose }) => {
  if (!show) return null;

  const styles =
    type === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : "bg-red-50 border-red-200 text-red-800";

  const icon = type === "success" ? "✓" : "⚠️";

  return (
    <div
      className={`fixed top-5 right-5 z-[100] flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl transition-all duration-300 animate-slide-in ${styles} max-w-xs`}
    >
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-bold">
          {type === "success" ? "Success" : "Error"}
        </p>
        <p className="text-xs opacity-90 mt-0.5">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 font-bold text-lg leading-none"
      >
        &times;
      </button>
    </div>
  );
};
