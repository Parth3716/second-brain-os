"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, CheckCircle2, Info } from "lucide-react";

type ToastType = "error" | "success" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "error") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onRemove={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 5000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const config = {
    error: {
      icon: <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />,
      border: "border-red-500/30",
      bg: "bg-red-500/10",
      bar: "bg-red-500",
    },
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/10",
      bar: "bg-emerald-500",
    },
    info: {
      icon: <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />,
      border: "border-blue-500/30",
      bg: "bg-blue-500/10",
      bar: "bg-blue-500",
    },
  }[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      className={`pointer-events-auto bg-[#0c1222] border ${config.border} rounded-2xl shadow-2xl overflow-hidden`}
    >
      <div className="flex items-start gap-3 p-4">
        {config.icon}
        <p className="text-sm text-slate-200 flex-1 leading-relaxed">
          {toast.message}
        </p>
        <button
          onClick={onRemove}
          className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Auto-dismiss progress bar */}
      <div className="h-0.5 w-full bg-white/5">
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 5, ease: "linear" }}
          className={`h-full ${config.bar}`}
        />
      </div>
    </motion.div>
  );
}
