import { useEffect, useMemo, useRef, useState } from "react";
import {
  DocumentTextIcon,
  EllipsisVerticalIcon,
  FolderIcon,
  GlobeAltIcon,
  LinkIcon,
  UsersIcon
} from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolidIcon, StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";

const formatBytes = (bytes = 0) => {
  if (!bytes) return "-";
  const sizes = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${sizes[index]}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const accessTone = {
  owner: "bg-[#f5d0de] text-[#7a183f]",
  editor: "bg-[#eaf4ea] text-[#137333]",
  commenter: "bg-[#fff7e0] text-[#b06000]",
  viewer: "bg-[#f7eff4] text-[#6f6471]"
};

const summaryTone = {
  Private: "bg-[#f7eff4] text-[#6f6471]",
  Link: "bg-[#f5d0de] text-[#7a183f]",
  Public: "bg-[#eaf4ea] text-[#137333]"
};

const stopPropagation = (event) => event.stopPropagation();

const AvatarStack = ({ file }) => {
  const people = useMemo(() => {
    const owner = file.owner ? [{ ...file.owner, key: `owner-${file.owner._id || file.owner.username}` }] : [];
    const shared = (file.sharedWith || []).map((entry) => ({ ...entry.user, key: entry.user._id }));
    const unique = [];
    const seen = new Set();
    [...owner, ...shared].forEach((person) => {
      const key = person?._id || person?.username;
      if (!key || seen.has(key)) return;
      seen.add(key);
      unique.push(person);
    });
    return unique.slice(0, 3);
  }, [file]);

  return (
    <div className="flex items-center">
      {people.map((person, index) => (
        <div
          key={person.key}
          className="-ml-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-white text-[11px] font-semibold uppercase text-white first:ml-0"
          style={{ backgroundColor: person.avatarColor || ["#9d174d", "#2563eb", "#0f766e", "#d97706"][index % 4] }}
          title={person.name || person.username}
        >
          {(person.name || person.username || "?").slice(0, 1)}
        </div>
      ))}
      {file.sharedCount > 2 ? <span className="ml-2 text-xs text-drive-subtext">+{file.sharedCount - 2}</span> : null}
    </div>
  );
};

const FileBadges = ({ file }) => {
  const accessSummary = file.accessSummary || "Private";
  const summaryClasses = summaryTone[accessSummary] || "bg-[#f6edf2] text-[#4b5563]";

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${accessTone[file.accessRole] || accessTone.viewer}`}>
        {file.accessRole}
      </span>
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${summaryClasses}`}>
        {accessSummary === "Public" ? <GlobeAltIcon className="h-3.5 w-3.5" /> : accessSummary === "Link" ? <LinkIcon className="h-3.5 w-3.5" /> : <UsersIcon className="h-3.5 w-3.5" />}
        {accessSummary}
      </span>
    </div>
  );
};

const RowActions = ({ file, canManage, onOpen, onShare, onDelete, onPermanentDelete, onStar, onPin, onRestore, onRenameStart, onCopyLink }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const inTrash = file.isTrashed;

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleAction = (callback) => {
    setOpen(false);
    callback?.(file);
  };

  return (
    <div ref={wrapperRef} className="relative z-20" onClick={stopPropagation}>
      <button className="rounded-full p-2 text-drive-subtext transition hover:bg-[#f6edf2] hover:text-drive-text" onClick={() => setOpen((current) => !current)}>
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[210px] rounded-[18px] border border-[#eadfe6] bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-sm">
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#fbf6f9]" onClick={() => handleAction(onOpen)}>Open</button>
          {!inTrash ? <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#fbf6f9]" onClick={() => handleAction(onRenameStart)}>Rename</button> : null}
          {!inTrash ? <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#fbf6f9]" onClick={() => handleAction(onCopyLink)}>Copy link</button> : null}
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#fbf6f9]" onClick={() => handleAction(onStar)}>{file.isStarred ? "Remove star" : "Add star"}</button>
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#fbf6f9]" onClick={() => handleAction(onPin)}>{file.isPinned ? "Unpin" : "Pin to top"}</button>
          {canManage && !inTrash ? <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#fbf6f9]" onClick={() => handleAction(onShare)}>Share</button> : null}
          {inTrash ? (
            <>
              <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#fbf6f9]" onClick={() => handleAction(onRestore)}>Restore</button>
              {canManage ? <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50" onClick={() => handleAction(onPermanentDelete)}>Delete permanently</button> : null}
            </>
          ) : (
            <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50" onClick={() => handleAction(onDelete)}>Move to trash</button>
          )}
        </div>
      ) : null}
    </div>
  );
};

export const FileRow = ({
  file,
  selected = false,
  previewed = false,
  renaming = false,
  visibleColumns,
  denseMode = false,
  onPreview,
  onToggleSelect,
  onOpen,
  onShare,
  onDelete,
  onPermanentDelete,
  onStar,
  onPin,
  onRestore,
  onRenameStart,
  onRename,
  onCopyLink,
  onDragStartFile,
  onDragEndFile,
  onDropIntoFolder
}) => {
  const [draftName, setDraftName] = useState(file.filename);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const isDocument = file.category === "document";
  const isFolder = file.category === "folder";
  const canManage = file.accessRole === "owner";
  const owner = file.owner?.name || file.owner?.username || "Unknown";
  const rowHeight = denseMode ? "min-h-[64px]" : "min-h-[76px]";
  const gridTemplate = `48px minmax(240px,1.6fr) minmax(170px,0.85fr) ${visibleColumns.lastOpened ? "minmax(132px,0.72fr)" : ""} ${visibleColumns.role ? "minmax(112px,0.52fr)" : ""} minmax(132px,0.72fr) minmax(88px,0.38fr) 68px`;
  const rowTone = selected
    ? "bg-[#f8ebf1]"
    : previewed
      ? "bg-[#fbf6f9] ring-1 ring-inset ring-[#e6c7d3]"
      : "bg-white hover:bg-[#fdf9fb]";

  useEffect(() => {
    setDraftName(file.filename);
  }, [file.filename]);

  useEffect(() => {
    if (renaming) window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [renaming]);

  const commitRename = () => {
    const next = draftName.trim();
    if (!next || next === file.filename) {
      setDraftName(file.filename);
      onRename(null, null, true);
      return;
    }
    onRename(file, next);
  };

  return (
    <div
      className={`motion-card grid ${rowHeight} items-center border-t border-[#eee2e8] px-4 text-sm text-drive-text transition-all duration-150 ${rowTone} ${dragOver ? "ring-2 ring-inset ring-[#9d174d]" : ""}`}
      style={{ gridTemplateColumns: gridTemplate }}
      onClick={() => onPreview(file)}
      onDoubleClick={() => onOpen(file)}
      draggable={!file.isTrashed}
      onDragStart={(event) => onDragStartFile(event, file)}
      onDragEnd={onDragEndFile}
      onDragOver={(event) => {
        if (!isFolder) return;
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        if (!isFolder) return;
        event.preventDefault();
        setDragOver(false);
        onDropIntoFolder(file, event);
      }}
    >
      <div className="flex justify-center" onClick={stopPropagation}>
        <input type="checkbox" className="h-4 w-4 rounded border-[#d8c4cf] text-[#9d174d] focus:ring-[#9d174d]" checked={selected} onChange={(event) => onToggleSelect(file, event.target.checked)} />
      </div>

      <div className="flex min-w-0 items-center gap-3 py-3">
        <div className={`grid ${denseMode ? "h-9 w-9" : "h-10 w-10"} shrink-0 place-items-center rounded-2xl ${isDocument ? "bg-[#f5d0de] text-[#9d174d]" : isFolder ? "bg-[#f8e7cf] text-[#d97706]" : "bg-[#f3eaf0] text-[#6f6471]"}`}>
          {isDocument ? <DocumentTextIcon className="h-5 w-5" /> : <FolderIcon className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {renaming ? (
              <input
                ref={inputRef}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onClick={stopPropagation}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitRename();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setDraftName(file.filename);
                    onRename(null, null, true);
                  }
                }}
                className="h-9 w-full max-w-[320px] rounded-xl border border-[#dcc8d3] bg-white px-3 text-[15px] font-medium text-drive-text shadow-[0_1px_2px_rgba(60,64,67,0.08)] outline-none focus:border-[#d27b9d]"
              />
            ) : (
              <button className="truncate text-left text-[15px] font-medium text-drive-text hover:text-[#7a183f]" onClick={(event) => { stopPropagation(event); onOpen(file); }}>
                {file.filename}
              </button>
            )}
            {file.isPinned ? <BookmarkSolidIcon className="h-4 w-4 shrink-0 text-[#9d174d]" title="Pinned" /> : null}
            {file.isStarred ? <StarSolidIcon className="h-4 w-4 shrink-0 text-[#fbbc04]" title="Starred" /> : null}
          </div>
          <FileBadges file={file} />
        </div>
      </div>

      <div className="truncate text-[14px] text-drive-subtext">{owner}</div>
      {visibleColumns.lastOpened ? <div className="truncate text-[14px] text-drive-subtext">{formatDate(file.lastOpenedAt || file.updatedAt)}</div> : null}
      {visibleColumns.role ? <div className="truncate text-[14px] text-drive-subtext capitalize">{file.accessRole}</div> : null}
      <div className="truncate text-[14px] text-drive-subtext">{formatDate(file.updatedAt)}</div>
      <div className="truncate text-[14px] text-drive-subtext">{isFolder || isDocument ? "-" : formatBytes(file.size)}</div>

      <div className="flex items-center justify-end gap-2">
        <AvatarStack file={file} />
        <RowActions
          file={file}
          canManage={canManage}
          onOpen={onOpen}
          onShare={onShare}
          onDelete={onDelete}
          onPermanentDelete={onPermanentDelete}
          onStar={onStar}
          onPin={onPin}
          onRestore={onRestore}
          onRenameStart={onRenameStart}
          onCopyLink={onCopyLink}
        />
      </div>
    </div>
  );
};




