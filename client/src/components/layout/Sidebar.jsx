import {
  ClockIcon,
  FolderIcon,
  PlusIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
  AdjustmentsHorizontalIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import clsx from "clsx";

const items = [
  { key: "my-files", label: "My Drive", icon: FolderIcon },
  { key: "shared", label: "Shared with me", icon: ShareIcon },
  { key: "recent", label: "Recent", icon: ClockIcon },
  { key: "starred", label: "Starred", icon: StarIcon },
  { key: "trash", label: "Trash", icon: TrashIcon }
];

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${sizes[index]}`;
};

export const Sidebar = ({
  activeSection,
  setActiveSection,
  onUpload,
  onNewDocument,
  onCreateFolder,
  onOpenSettings,
  isSidebarOpen,
  totalBytes,
  storageLimitBytes
}) => {
  const storageUsage = Math.min(100, Math.round((totalBytes / storageLimitBytes) * 100)) || 0;

  return (
    <aside className={clsx(
      "z-20 w-full max-w-[300px] shrink-0 flex-col gap-5 bg-[#4A154B] px-5 py-6 text-[#f5ebf2] shadow-[18px_0_48px_rgba(74,21,75,0.18)]",
      isSidebarOpen ? "flex" : "hidden lg:flex",
      "lg:min-h-screen"
    )}>
      <button className="flex items-center gap-3 px-3 py-2 text-left transition hover:bg-white/6" onClick={() => setActiveSection("my-files")}>
        <img src="/logo-mark.svg" alt="CollabDrive logo" className="h-11 w-11 rounded-2xl ring-1 ring-white/10" />
        <div>
          <p className="text-[1.85rem] font-medium tracking-tight text-white">CollabDrive</p>
          <p className="text-xs text-[#d7bfd1]">Workspace in sync</p>
        </div>
      </button>

      <div className="space-y-3 px-2 pt-2">
        <button className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3.5 text-[15px] font-semibold text-[#4A154B] shadow-[0_10px_24px_rgba(17,24,39,0.14)] transition hover:bg-[#fbf6f9]" onClick={onNewDocument}>
          <PlusIcon className="h-5 w-5" />
          New document
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button className="rounded-2xl bg-white/10 px-4 py-2.5 text-[14px] font-medium text-[#fbeef6] transition hover:bg-white/14" onClick={onUpload}>Upload</button>
          <button className="rounded-2xl bg-white/10 px-4 py-2.5 text-[14px] font-medium text-[#f3e5ee] transition hover:bg-white/14" onClick={onCreateFolder}>Folder</button>
        </div>
      </div>

      <div className="space-y-1 pt-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={clsx(
                "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-medium transition",
                active
                  ? "bg-[#6f2d5a] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-[#e9dbe3] hover:bg-white/8"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active ? <ChevronRightIcon className="h-4 w-4 opacity-80" /> : null}
            </button>
          );
        })}
      </div>

      <button className="mt-3 flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] text-[#e9dbe3] transition hover:bg-white/8" onClick={onOpenSettings}>
        <AdjustmentsHorizontalIcon className="h-5 w-5" />
        Settings
      </button>

      <div className="mt-auto px-2 pt-6">
        <div className="mb-2 flex items-center justify-between text-sm text-[#d9c8d5]">
          <span>Storage</span>
          <span>{storageUsage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#d28aac]" style={{ width: `${storageUsage}%` }} />
        </div>
        <p className="mt-3 text-xs leading-5 text-[#d9c8d5]">{formatBytes(totalBytes)} of {formatBytes(storageLimitBytes)} used in this workspace.</p>
      </div>
    </aside>
  );
};
