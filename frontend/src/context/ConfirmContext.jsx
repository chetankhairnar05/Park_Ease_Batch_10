import { createContext, useContext, useState, useRef } from "react";

const ConfirmContext = createContext();

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState({
    isOpen: false,
    message: "",
    title: "Confirm Action",
  });
  const fnRef = useRef({});

  const confirm = (message, title = "Are you sure?") => {
    return new Promise((resolve) => {
      setState({ isOpen: true, message, title });
      fnRef.current = { resolve };
    });
  };

  const handleAction = (choice) => {
    setState({ ...state, isOpen: false });
    if (fnRef.current.resolve) fnRef.current.resolve(choice);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {/* Global Modal UI */}
      {state.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform scale-100 transition-all">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {state.title}
            </h3>
            <p className="text-gray-600 text-sm mb-6">{state.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleAction(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(true)}
                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmContext);
