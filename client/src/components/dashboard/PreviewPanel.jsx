import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "../ui/Button";
import { filesApi } from "../../api";

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${sizes[index]}`;
};

const formatDateTime = (value) => {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

export const PreviewPanel = ({ file, open, onClose, onOpen, onShare, onCopyLink, onToggleStar, onTogglePin, onTrash, onRestore, onDelete }) => {
  return (
    <aside className={`fixed inset-y-4 right-4 z-40 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-[28px] border border-[#e4ebf4] bg-white/96 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-all duration-200 ${open ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[110%] opacity-0"}`}>
      {file ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-drive-subtext">Preview</p>
              <h3 className="mt-2 break-words text-[24px] font-medium leading-tight text-drive-text">{file.filename}</h3>
              <p className="mt-1 text-sm capitalize text-drive-subtext">{file.accessSummary} • {file.accessRole}</p>
            </div>
            <button className="grid h-10 w-10 place-items-center rounded-full text-drive-subtext transition hover:bg-[#f7eff4] hover:text-drive-text" onClick={onClose}>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="rounded-[20px] border border-[#eee2e8] bg-[#fbf6f9] p-4">
              {file.preview?.kind === "image" ? <img src={filesApi.downloadUrl(file.id)} alt={file.filename} className="h-44 w-full rounded-2xl object-cover" /> : null}
              {file.preview?.kind === "pdf" ? <iframe title={file.filename} src={filesApi.downloadUrl(file.id)} className="h-52 w-full rounded-2xl border border-[#dfe7f3] bg-white" /> : null}
              {file.preview?.kind === "none" ? <p className="break-words text-sm leading-6 text-[#475467]">{file.contentPreview || "No preview available for this item yet."}</p> : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-[#fbf6f9] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-drive-subtext">Modified</p>
                <p className="mt-2 font-medium text-drive-text">{formatDateTime(file.updatedAt)}</p>
              </div>
              <div className="rounded-2xl bg-[#fbf6f9] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-drive-subtext">Last opened</p>
                <p className="mt-2 font-medium text-drive-text">{formatDateTime(file.lastOpenedAt)}</p>
              </div>
              <div className="rounded-2xl bg-[#fbf6f9] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-drive-subtext">Last edited by</p>
                <p className="mt-2 break-words font-medium text-drive-text">{file.lastEditedBy?.name || file.owner?.name || "Unknown"}</p>
              </div>
              <div className="rounded-2xl bg-[#fbf6f9] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-drive-subtext">Size</p>
                <p className="mt-2 font-medium text-drive-text">{file.category === "file" ? formatBytes(file.size) : "-"}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => onOpen(file)}>Open</Button>
              {!file.isTrashed ? <Button variant="surface" onClick={() => onShare(file)}>Share</Button> : null}
              {!file.isTrashed ? <Button variant="surface" onClick={() => onCopyLink(file)}>Copy link</Button> : null}
              <Button variant="surface" onClick={() => onToggleStar(file)}>{file.isStarred ? "Unstar" : "Star"}</Button>
              <Button variant="surface" onClick={() => onTogglePin(file)}>{file.isPinned ? "Unpin" : "Pin"}</Button>
            </div>

            <div className="mt-5 border-t border-[#eee2e8] pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-drive-subtext">Activity timeline</p>
              <div className="mt-3 space-y-3">
                {(file.activity || []).length ? (file.activity || []).slice(0, 8).map((entry, index) => (
                  <div key={`${entry.createdAt}-${index}`} className="rounded-2xl border border-[#eee2e8] bg-[#fcf8fb] px-4 py-3">
                    <p className="text-sm font-medium text-drive-text">{entry.actor?.name || "System"} {entry.action}</p>
                    <p className="mt-1 text-xs text-drive-subtext">{formatDateTime(entry.createdAt)}</p>
                  </div>
                )) : <p className="text-sm text-drive-subtext">No activity yet.</p>}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#eee2e8] pt-4">
            {file.isTrashed ? (
              <>
                <Button variant="surface" onClick={() => onRestore(file)}>Restore</Button>
                <Button variant="danger" onClick={() => onDelete(file)}>Delete permanently</Button>
              </>
            ) : (
              <Button variant="danger" onClick={() => onTrash(file)}>Move to trash</Button>
            )}
          </div>
        </>
      ) : null}
    </aside>
  );
};


