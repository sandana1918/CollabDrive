const items = [
  { key: "heading", label: "Heading" },
  { key: "bulletList", label: "Bulleted list" },
  { key: "quote", label: "Quote" }
];

export const SlashMenu = ({ open, query = "", onSelect }) => {
  if (!open) return null;

  const filtered = items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="absolute left-0 top-[calc(100%+10px)] z-30 min-w-[220px] rounded-[20px] border border-[#dde5f0] bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
      <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5f6368]">Slash commands</p>
      {filtered.map((item) => (
        <button key={item.key} type="button" className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#202124] hover:bg-[#f5f8fd]" onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(item.key)}>
          {item.label}
        </button>
      ))}
    </div>
  );
};
