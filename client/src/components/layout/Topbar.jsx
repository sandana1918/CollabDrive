import { useMemo, useState } from "react";
import {
  Bars3Icon,
  BellIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon
} from "@heroicons/react/24/outline";

export const Topbar = ({
  user,
  search,
  setSearch,
  onToggleSidebar,
  onOpenHelp,
  onOpenSettings,
  onToggleDensity,
  denseMode,
  onLogout,
  notifications,
  onMarkNotificationsRead
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <button className="grid h-11 w-11 place-items-center rounded-full text-drive-subtext transition hover:bg-white/70 lg:hidden" onClick={onToggleSidebar}>
          <Bars3Icon className="h-6 w-6" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full bg-[#eef3fb] px-5 py-3 shadow-[inset_0_0_0_1px_rgba(221,227,238,0.65)] lg:min-w-[620px]">
          <MagnifyingGlassIcon className="h-5 w-5 text-drive-subtext" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search in Drive" className="w-full bg-transparent text-[15px] text-drive-text outline-none placeholder:text-[#5f6368]" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <div className="relative">
          <button className="relative grid h-10 w-10 place-items-center rounded-full text-drive-subtext transition hover:bg-white/70" onClick={() => setNotificationsOpen((current) => !current)}>
            <BellIcon className="h-5 w-5" />
            {unreadCount ? <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#1a73e8]" /> : null}
          </button>
          {notificationsOpen ? (
            <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[320px] rounded-3xl border border-[#e1e8f2] bg-white p-3 shadow-card">
              <div className="mb-2 flex items-center justify-between px-2">
                <p className="text-sm font-medium text-drive-text">Notifications</p>
                <button className="text-xs text-drive-blue" onClick={onMarkNotificationsRead}>Mark all read</button>
              </div>
              <div className="max-h-[320px] space-y-2 overflow-auto">
                {notifications.length ? notifications.map((item) => (
                  <div key={item._id} className={`rounded-2xl px-3 py-3 text-sm ${item.isRead ? "bg-[#fafcff]" : "bg-[#eef5ff]"}`}>
                    <p className="font-medium text-drive-text">{item.title}</p>
                    <p className="mt-1 text-drive-subtext">{item.message}</p>
                  </div>
                )) : <p className="px-3 py-4 text-sm text-drive-subtext">No notifications yet.</p>}
              </div>
            </div>
          ) : null}
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-full text-drive-subtext transition hover:bg-white/70" onClick={onOpenHelp}><QuestionMarkCircleIcon className="h-5 w-5" /></button>
        <button className="grid h-10 w-10 place-items-center rounded-full text-drive-subtext transition hover:bg-white/70" onClick={onOpenSettings}><Cog6ToothIcon className="h-5 w-5" /></button>
        <button className={`grid h-10 w-10 place-items-center rounded-full transition ${denseMode ? "bg-[#e8f0fe] text-[#174ea6]" : "text-drive-subtext hover:bg-white/70"}`} onClick={onToggleDensity}><Squares2X2Icon className="h-5 w-5" /></button>
        <div className="relative">
          <button className="flex items-center gap-3 rounded-full bg-white/80 px-2.5 py-2 shadow-soft transition hover:bg-white" onClick={() => setProfileOpen((current) => !current)}>
            <div className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: user?.avatarColor || "#1a73e8" }}>
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="hidden text-left lg:block">
              <p className="max-w-40 truncate text-sm font-medium text-drive-text">{user?.name}</p>
              <p className="max-w-40 truncate text-xs text-drive-subtext">@{user?.username}</p>
            </div>
            <ChevronDownIcon className="hidden h-4 w-4 text-drive-subtext lg:block" />
          </button>

          {profileOpen ? (
            <div className="absolute right-0 top-[calc(100%+10px)] z-30 min-w-[220px] rounded-3xl border border-[#e1e8f2] bg-white p-2 shadow-card">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-drive-text">{user?.name}</p>
                <p className="text-xs text-drive-subtext">{user?.email}</p>
              </div>
              <button className="w-full rounded-2xl px-3 py-2 text-left text-sm text-drive-subtext transition hover:bg-slate-50" onClick={() => { setProfileOpen(false); onOpenSettings(); }}>Workspace settings</button>
              <button className="w-full rounded-2xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50" onClick={onLogout}>Sign out</button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
