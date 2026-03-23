import { useEffect, useRef } from "react";

export const ColumnsMenu = ({ open, onClose, visibleColumns, onToggle }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handle = (event) => {
      if (!ref.current?.contains(event.target)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={ref} className="absolute right-0 top-[calc(100%+8px)] z-40 min-w-[220px] rounded-[20px] border border-[#dde5f0] bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-drive-subtext">Columns</p>
      {[
        { key: "lastOpened", label: "Last opened" },
        { key: "role", label: "Role" }
      ].map((column) => (
        <label key={column.key} className="flex items-center justify-between rounded-xl px-2 py-2 text-sm text-drive-text hover:bg-[#fbf6f9]">
          <span>{column.label}</span>
          <input type="checkbox" checked={visibleColumns[column.key]} onChange={() => onToggle(column.key)} />
        </label>
      ))}
    </div>
  );
};

