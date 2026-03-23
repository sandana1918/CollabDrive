import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";

export const Modal = ({
  open,
  title,
  description,
  children,
  onClose,
  sizeClassName = "max-w-lg",
  bodyClassName = ""
}) => {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/30 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={clsx(
              "flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-[28px] bg-white p-6 shadow-card",
              sizeClassName
            )}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 shrink-0">
              <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
              {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
            </div>
            <div className={clsx("min-h-0 flex-1", bodyClassName)}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
