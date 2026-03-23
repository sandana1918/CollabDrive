import { EyeIcon } from "@heroicons/react/24/outline";
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

export const PreviewPanel = ({ file, onOpen, onShare, onCopyLink, onToggleStar, onTogglePin, onTrash, onRestore, onDelete }) => {
  if (!file) {
    return (
      <aside className="rounded-[24px] border border-[#e4ebf4] bg-white/90 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="grid min-h-[420px] place-items-center text-center">
          <div>
            <EyeIcon className="mx-auto h-10 w-10 text-[#93a3bb]" />
            <p className="mt-4 text-lg font-medium text-drive-text">Select an item</p>
            <p className="mt-2 text-sm text-drive-subtext">Preview, activity, sharing, and quick actions will appear here.</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="rounded-[24px] border border-[#e4ebf4] bg-white/92 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.07)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-drive-subtext">Preview</p>
          <h3 className="mt-2 text-[22px] font-medium leading-tight text-drive-text">{file.filename}</h3>
          <p className="mt-1 text-sm text-drive-subtext">{file.accessSummary} • {file.accessRole}</p>
        </div>
        {file.isPinned ? <span className="rounded-full bg-[#e8f0fe] px-2.5 py-1 text-xs font-medium text-[#174ea6]">Pinned</span> : null}
      </div>

      <div className="mt-5 rounded-[20px] border border-[#edf2f8] bg-[#f8fbff] p-4">
        {file.preview?.kind === "image" ? <img src={filesApi.downloadUrl(file.id)} alt={file.filename} className="h-44 w-full rounded-2xl object-cover" /> : null}
        {file.preview?.kind === "pdf" ? <iframe title={file.filename} src={filesApi.downloadUrl(file.id)} className="h-52 w-full rounded-2xl border border-[#dfe7f3] bg-white" /> : null}
        {file.preview?.kind === "none" ? <p className="text-sm leading-6 text-[#475467]">{file.contentPreview || "No preview available for this item yet."}</p> : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-[#f8fbff] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-drive-subtext">Modified</p>
          <p className="mt-2 font-medium text-drive-text">{formatDateTime(file.updatedAt)}</p>
        </div>
        <div className="rounded-2xl bg-[#f8fbff] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-drive-subtext">Last opened</p>
          <p className="mt-2 font-medium text-drive-text">{formatDateTime(file.lastOpenedAt)}</p>
        </div>
        <div className="rounded-2xl bg-[#f8fbff] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-drive-subtext">Last edited by</p>
          <p className="mt-2 font-medium text-drive-text">{file.lastEditedBy?.name || file.owner?.name || "Unknown"}</p>
        </div>
        <div className="rounded-2xl bg-[#f8fbff] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-drive-subtext">Size</p>
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

      <div className="mt-5 border-t border-[#edf2f8] pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-drive-subtext">Activity timeline</p>
        <div className="mt-3 space-y-3">
          {(file.activity || []).length ? (file.activity || []).slice(0, 6).map((entry, index) => (
            <div key={`${entry.createdAt}-${index}`} className="relative rounded-2xl border border-[#edf2f8] bg-[#fafcff] px-4 py-3">
              <p className="text-sm font-medium text-drive-text">{entry.actor?.name || "System"} {entry.action}</p>
              <p className="mt-1 text-xs text-drive-subtext">{formatDateTime(entry.createdAt)}</p>
            </div>
          )) : <p className="text-sm text-drive-subtext">No activity yet.</p>}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-[#edf2f8] pt-4">
        {file.isTrashed ? (
          <>
            <Button variant="surface" onClick={() => onRestore(file)}>Restore</Button>
            <Button variant="danger" onClick={() => onDelete(file)}>Delete permanently</Button>
          </>
        ) : (
          <Button variant="danger" onClick={() => onTrash(file)}>Move to trash</Button>
        )}
      </div>
    </aside>
  );
};
