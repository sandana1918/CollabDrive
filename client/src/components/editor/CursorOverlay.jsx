export const CursorOverlay = ({ cursors }) => {
  if (!cursors?.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {cursors.map((cursor) => (
        <div key={cursor.key} className="absolute" style={{ left: cursor.left, top: cursor.top }}>
          <div className="rounded-full px-2 py-1 text-[11px] font-semibold text-white shadow-[0_10px_20px_rgba(15,23,42,0.16)]" style={{ backgroundColor: cursor.color }}>
            {cursor.label}
          </div>
          <div className="ml-1 mt-1 h-5 w-[2px] rounded-full" style={{ backgroundColor: cursor.color }} />
        </div>
      ))}
    </div>
  );
};
