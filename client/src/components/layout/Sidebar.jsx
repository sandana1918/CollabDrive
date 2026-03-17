import {
  ClockIcon,
  FolderIcon,
  PlusIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
  AdjustmentsHorizontalIcon
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
      "z-20 w-full max-w-[288px] shrink-0 flex-col gap-5 rounded-[28px] bg-white/88 px-4 py-5 shadow-shell backdrop-blur-xl",
      isSidebarOpen ? "flex" : "hidden lg:flex",
      "lg:min-h-[calc(100vh-32px)]"
    )}>
      <button className="flex items-center gap-3 px-3 text-left" onClick={() => setActiveSection("my-files")}>
        <img src="/logo-mark.svg" alt="CollabDrive logo" className="h-11 w-11 rounded-2xl" />
        <div>
          <p className="text-[1.85rem] font-medium tracking-tight text-drive-text">CollabDrive</p>
          <p className="text-xs text-drive-subtext">Enterprise collaboration</p>
        </div>
      </button>

      <div className="space-y-3">
        <button className="ml-2 flex w-fit items-center gap-3 rounded-2xl border border-[#d7e3f7] bg-white px-6 py-4 text-[15px] font-medium text-drive-text shadow-soft transition hover:bg-slate-50" onClick={onNewDocument}>
          <PlusIcon className="h-5 w-5 text-drive-subtext" />
          New document
        </button>

        <div className="ml-2 flex flex-wrap gap-2">
          <button className="rounded-2xl bg-[#e8f0fe] px-4 py-2.5 text-[14px] font-medium text-[#174ea6] transition hover:bg-[#dbe7ff]" onClick={onUpload}>Upload</button>
          <button className="rounded-2xl bg-[#f4f7fb] px-4 py-2.5 text-[14px] font-medium text-drive-text transition hover:bg-[#ebf0f7]" onClick={onCreateFolder}>Folder</button>
        </div>
      </div>

      <div className="space-y-1 pt-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={clsx(
                "flex w-full items-center gap-3 rounded-r-full rounded-l-2xl px-4 py-3 text-left text-[15px] font-medium transition",
                active ? "bg-[#c2e7ff] text-drive-text" : "text-drive-subtext hover:bg-slate-100"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <button className="mt-3 flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] text-drive-subtext transition hover:bg-slate-100" onClick={onOpenSettings}>
        <AdjustmentsHorizontalIcon className="h-5 w-5" />
        Settings
      </button>

      <div className="mt-auto px-3">
        <div className="mb-2 flex items-center justify-between text-sm text-drive-subtext">
          <span>Storage</span>
          <span>{storageUsage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#e7edf7]">
          <div className="h-full rounded-full bg-[#1a73e8]" style={{ width: `${storageUsage}%` }} />
        </div>
        <p className="mt-3 text-xs leading-5 text-drive-subtext">{formatBytes(totalBytes)} of {formatBytes(storageLimitBytes)} used in this workspace.</p>
      </div>
    </aside>
  );
};
