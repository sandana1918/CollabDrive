import { useState } from "react";
import { DocumentTextIcon, EllipsisVerticalIcon, FolderIcon, StarIcon, TrashIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";

const formatBytes = (bytes = 0) => {
  if (!bytes) return "-";
  const sizes = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${sizes[index]}`;
};

const formatDate = (value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const RowActions = ({ file, canManage, onOpen, onShare, onDelete, onStar, onPin, onRestore }) => {
  const [open, setOpen] = useState(false);
  const inTrash = file.isTrashed;

  return (
    <div className="relative">
      <button className="rounded-full p-2 text-drive-subtext transition hover:bg-slate-100" onClick={() => setOpen((current) => !current)}>
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[170px] rounded-2xl border border-[#e1e8f2] bg-white p-2 shadow-card">
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-slate-50" onClick={() => { setOpen(false); onOpen(file); }}>Open</button>
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-slate-50" onClick={() => { setOpen(false); onStar(file); }}>{file.isStarred ? "Remove star" : "Add star"}</button>
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-slate-50" onClick={() => { setOpen(false); onPin(file); }}>{file.isPinned ? "Unpin" : "Pin to top"}</button>
          {canManage && !inTrash ? <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-slate-50" onClick={() => { setOpen(false); onShare(file); }}>Share</button> : null}
          {inTrash ? <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-slate-50" onClick={() => { setOpen(false); onRestore(file); }}>Restore</button> : <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50" onClick={() => { setOpen(false); onDelete(file); }}>Move to trash</button>}
        </div>
      ) : null}
    </div>
  );
};

export const FileRow = ({ file, onOpen, onShare, onDelete, onStar, onPin, onRestore, denseMode = false }) => {
  const isDocument = file.category === "document";
  const isFolder = file.category === "folder";
  const canManage = file.accessRole === "owner";
  const owner = file.owner?.name || file.owner?.username || "Unknown";

  return (
    <div className={`grid items-center border-b border-[#edf2f8] px-5 text-sm text-drive-text ${denseMode ? "min-h-[52px]" : "min-h-[60px]"} grid-cols-[minmax(260px,1.8fr)_1fr_1fr_0.7fr_56px] hover:bg-[#f8fbff]`}>
      <button className="flex min-w-0 items-center gap-3 py-2 text-left" onClick={() => onOpen(file)}>
        <div className={`grid ${denseMode ? "h-8 w-8" : "h-9 w-9"} place-items-center rounded-xl ${isDocument ? "bg-[#e8f0fe] text-drive-blue" : isFolder ? "bg-[#fff6e5] text-[#f29900]" : "bg-[#f1f5f9] text-slate-600"}`}>
          {isDocument ? <DocumentTextIcon className="h-4 w-4" /> : <FolderIcon className="h-4 w-4" />}
        </div>
        <span className="truncate font-medium">{file.filename}</span>
        {file.isStarred ? <StarSolidIcon className="h-4 w-4 text-[#fbbc04]" /> : null}
      </button>
      <div className="truncate text-drive-subtext">{owner}</div>
      <div className="truncate text-drive-subtext">{formatDate(file.updatedAt)}</div>
      <div className="truncate text-drive-subtext">{isFolder || isDocument ? "-" : formatBytes(file.size)}</div>
      <div className="flex justify-end">
        <RowActions file={file} canManage={canManage} onOpen={onOpen} onShare={onShare} onDelete={onDelete} onStar={onStar} onPin={onPin} onRestore={onRestore} />
      </div>
    </div>
  );
};
