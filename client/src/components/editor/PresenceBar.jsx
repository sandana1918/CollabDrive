export const PresenceBar = ({ presence = [] }) => {
  return (
    <div className="flex items-center gap-3 rounded-full border border-[#dde3ee] bg-white px-4 py-2 shadow-soft">
      <div className="flex -space-x-2">
        {presence.slice(0, 5).map((entry) => (
          <div
            key={entry.socketId}
            className="grid h-8 w-8 place-items-center rounded-full border-2 border-white text-xs font-semibold text-white"
            style={{ backgroundColor: entry.user?.avatarColor || "#64748B" }}
            title={entry.user?.name || "Guest"}
          >
            {entry.user?.name?.charAt(0) || "G"}
          </div>
        ))}
      </div>
      <div>
        <p className="text-sm font-medium text-drive-text">{presence.length} active</p>
      </div>
    </div>
  );
};
