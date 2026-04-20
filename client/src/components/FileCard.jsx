import { useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  DocumentIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  FolderIcon,
  ShareIcon,
  StarIcon,
  TrashIcon
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { filesApi } from "../api";

const formatBytes = (bytes = 0) => {
  if (!bytes) return "-";
  const sizes = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${sizes[index]}`;
};

const formatDate = (value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const ActionsMenu = ({ file, canManage, onOpen, onShare, onDelete, onStar, onPin, onRestore }) => {
  const [open, setOpen] = useState(false);
  const inTrash = file.isTrashed;

  return (
    <div className="relative">
      <button className="rounded-full p-2 text-drive-subtext transition hover:bg-[#f7eff4]" onClick={() => setOpen((current) => !current)}>
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[180px] rounded-2xl border border-[#eadfe6] bg-white p-2 shadow-card">
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#fbf6f9]" onClick={() => { setOpen(false); onOpen(file); }}>Open</button>
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#fbf6f9]" onClick={() => { setOpen(false); onStar(file); }}>{file.isStarred ? "Remove star" : "Add star"}</button>
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#fbf6f9]" onClick={() => { setOpen(false); onPin(file); }}>{file.isPinned ? "Unpin" : "Pin to top"}</button>
          {file.category !== "folder" ? <a className="block w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#fbf6f9]" href={filesApi.downloadUrl(file.id)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>Download</a> : null}
          {canManage && !inTrash ? <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#fbf6f9]" onClick={() => { setOpen(false); onShare(file); }}>Share</button> : null}
          {inTrash ? <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#fbf6f9]" onClick={() => { setOpen(false); onRestore(file); }}>Restore</button> : <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50" onClick={() => { setOpen(false); onDelete(file); }}>Move to trash</button>}
        </div>
      ) : null}
    </div>
  );
};

export const FileCard = ({ file, onOpen, onDelete, onShare, onStar, onPin, onRestore, denseMode = false }) => {
  const isDocument = file.category === "document";
  const isFolder = file.category === "folder";
  const canManage = file.accessRole === "owner";
  const downloadUrl = filesApi.downloadUrl(file.id);

  return (
    <div className="motion-card group overflow-hidden rounded-2xl border border-[#e0e6ef] bg-white transition duration-200 hover:border-[#d9a8bc] hover:shadow-soft">
      <div className="flex items-center justify-between border-b border-[#eee2e8] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`grid ${denseMode ? "h-9 w-9" : "h-10 w-10"} place-items-center rounded-2xl ${isDocument ? "bg-[#f5d0de] text-drive-blue" : isFolder ? "bg-[#fbefdd] text-[#d97706]" : "bg-[#f4eef2] text-slate-600"}`}>
            {isDocument ? <DocumentTextIcon className="h-5 w-5" /> : isFolder ? <FolderIcon className="h-5 w-5" /> : <DocumentIcon className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <button className="truncate text-left text-[15px] font-medium text-drive-text hover:text-drive-blue" onClick={() => onOpen(file)}>
              {file.filename}
            </button>
            <p className="truncate text-xs text-drive-subtext">{isFolder ? "Folder" : isDocument ? "Document" : formatBytes(file.size)}</p>
          </div>
        </div>
        <ActionsMenu file={file} canManage={canManage} onOpen={onOpen} onShare={onShare} onDelete={onDelete} onStar={onStar} onPin={onPin} onRestore={onRestore} />
      </div>

      <div className={`px-4 ${denseMode ? "py-3" : "py-4"}`}>
        <div className={`rounded-2xl ${isDocument ? "bg-[#fbf6f9]" : "bg-[#fcf8fb]"} p-4`}>
          {file.preview?.kind === "image" ? <img src={downloadUrl} alt={file.filename} className="h-28 w-full rounded-xl object-cover" /> : null}
          {file.preview?.kind === "pdf" ? <iframe src={downloadUrl} title={file.filename} className="h-32 w-full rounded-xl border border-[#eadfe6] bg-white" /> : null}
          {file.preview?.kind === "none" ? <p className="min-h-[60px] text-sm leading-6 text-[#665a66] prose-preview">{isDocument ? file.contentPreview || "Open and edit with your collaborators in real time." : isFolder ? "Use folders to build a clear nested workspace hierarchy." : "Stored securely and ready for quick download or sharing."}</p> : null}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-drive-subtext">
          <span className="capitalize">{file.accessRole}</span>
          <span>{formatDate(file.updatedAt)}</span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button className="rounded-full bg-drive-blueSoft px-4 py-2 text-sm font-medium text-[#7a183f] transition hover:bg-[#efc1d0]" onClick={() => onOpen(file)}>Open</button>
          <button className="grid h-9 w-9 place-items-center rounded-full text-drive-subtext transition hover:bg-[#f7eff4] hover:text-drive-text" onClick={() => onStar(file)}>{file.isStarred ? <StarSolidIcon className="h-5 w-5 text-[#fbbc04]" /> : <StarIcon className="h-5 w-5" />}</button>
          {!isFolder ? <a className="grid h-9 w-9 place-items-center rounded-full text-drive-subtext transition hover:bg-[#f7eff4] hover:text-drive-text" href={downloadUrl} target="_blank" rel="noreferrer"><ArrowDownTrayIcon className="h-5 w-5" /></a> : null}
          {canManage && !file.isTrashed ? <button className="grid h-9 w-9 place-items-center rounded-full text-drive-subtext transition hover:bg-[#f7eff4] hover:text-drive-blue" onClick={() => onShare(file)}><ShareIcon className="h-5 w-5" /></button> : null}
          {file.isTrashed ? <button className="grid h-9 w-9 place-items-center rounded-full text-drive-subtext transition hover:bg-[#f7eff4] hover:text-drive-blue" onClick={() => onRestore(file)}><ArrowUturnLeftIcon className="h-5 w-5" /></button> : <button className="grid h-9 w-9 place-items-center rounded-full text-drive-subtext transition hover:bg-rose-50 hover:text-rose-600" onClick={() => onDelete(file)}><TrashIcon className="h-5 w-5" /></button>}
        </div>
      </div>
    </div>
  );
};




