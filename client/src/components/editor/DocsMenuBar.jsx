import { useEffect, useState } from "react";

const items = {
  File: [
    { key: "save", label: "Save now" },
    { key: "history", label: "Version history" }
  ],
  Edit: [
    { key: "undo", label: "Undo" },
    { key: "redo", label: "Redo" }
  ],
  View: [
    { key: "zoomOut", label: "Zoom out" },
    { key: "zoomIn", label: "Zoom in" },
    { key: "resetZoom", label: "Reset zoom" },
    { key: "comments", label: "Toggle comments" }
  ],
  Insert: [
    { key: "heading", label: "Heading" },
    { key: "bulletList", label: "Bulleted list" },
    { key: "quote", label: "Quote" }
  ],
  Format: [
    { key: "bold", label: "Bold" },
    { key: "italic", label: "Italic" },
    { key: "underline", label: "Underline" },
    { key: "clearMarks", label: "Clear formatting" }
  ]
};

export const DocsMenuBar = ({ onAction }) => {
  const [open, setOpen] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-[18px] border border-[#e0e3e7] bg-white px-3 py-2 shadow-[0_1px_3px_rgba(60,64,67,0.1)]">
      {Object.entries(items).map(([label, actions]) => (
        <div key={label} className="relative">
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm transition ${open === label ? "bg-[#e8f0fe] text-[#174ea6]" : "text-[#3c4043] hover:bg-[#f1f3f4]"}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              setOpen((current) => current === label ? null : label);
            }}
          >
            {label}
          </button>
          {open === label ? (
            <div className="absolute left-0 top-[calc(100%+6px)] z-40 min-w-[180px] rounded-[18px] border border-[#dde5f0] bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
              {actions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#202124] hover:bg-[#f5f8fd]"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpen(null);
                    onAction(action.key);
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};
