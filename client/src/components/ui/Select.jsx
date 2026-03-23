import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export const Select = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "Select",
  className,
  buttonClassName,
  menuClassName,
  renderValue
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedOption = useMemo(() => options.find((option) => option.value === value) || null, [options, value]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <label className={clsx("flex flex-col gap-2 text-sm font-medium text-drive-text", className)} ref={rootRef}>
      {label ? <span>{label}</span> : null}
      <div className="relative">
        <button
          type="button"
          className={clsx(
            "flex w-full items-center justify-between gap-3 border bg-white text-left text-sm text-drive-text outline-none transition disabled:cursor-not-allowed disabled:opacity-55",
            "focus:border-drive-blue focus:ring-4 focus:ring-[#f5d0de]",
            buttonClassName || "rounded-2xl border-drive-line px-4 py-3"
          )}
          onClick={() => !disabled && setOpen((current) => !current)}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className="truncate">{renderValue ? renderValue(selectedOption) : selectedOption?.label || placeholder}</span>
          <ChevronDownIcon className={clsx("h-4 w-4 text-[#7d6f78] transition", open && "rotate-180")} />
        </button>

        {open ? (
          <div className={clsx("absolute left-0 top-[calc(100%+8px)] z-30 min-w-full overflow-hidden rounded-2xl border border-[#eadfe6] bg-white py-1 shadow-[0_16px_32px_rgba(74,21,75,0.16)]", menuClassName)} role="listbox">
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={clsx(
                    "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition",
                    selected ? "bg-[#f5d0de] text-[#7a183f]" : "text-[#23151f] hover:bg-[#fbf6f9]"
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  role="option"
                  aria-selected={selected}
                >
                  <span>{option.label}</span>
                  {selected ? <span className="text-xs font-semibold uppercase tracking-[0.18em]">On</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </label>
  );
};
