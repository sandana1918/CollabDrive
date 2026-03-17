import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "../../context/ToastContext";

const palette = {
  success: "bg-emerald-500/95",
  error: "bg-rose-500/95"
};

export const ToastViewport = () => {
  const { toasts } = useToast();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className={`pointer-events-auto rounded-3xl px-4 py-3 text-sm font-medium text-white shadow-card ${palette[toast.type]}`}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
