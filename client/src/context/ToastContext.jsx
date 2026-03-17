import { createContext, useContext, useState } from "react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const pushToast = (toast) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, ...toast }]);
    setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id));
    }, 3200);
  };

  const value = {
    toasts,
    success: (message) => pushToast({ type: "success", message }),
    error: (message) => pushToast({ type: "error", message })
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = () => useContext(ToastContext);
