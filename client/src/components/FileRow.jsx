import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUturnLeftIcon,
  BookmarkIcon,
  ChatBubbleLeftEllipsisIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  FolderIcon,
  GlobeAltIcon,
  LinkIcon,
  PencilSquareIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
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
  owner: "bg-[#e8f0fe] text-[#174ea6]",
  editor: "bg-[#eaf4ea] text-[#137333]",
  commenter: "bg-[#fff7e0] text-[#b06000]",
  viewer: "bg-[#f1f3f4] text-[#5f6368]"
};

const summaryTone = {
  Private: "bg-[#f1f3f4] text-[#5f6368]",
  Link: "bg-[#e8f0fe] text-[#174ea6]",
  Public: "bg-[#eaf4ea] text-[#137333]"
};

const stopPropagation = (event) => event.stopPropagation();

const AvatarStack = ({ file }) => {
  const people = useMemo(() => {
    const owner = file.owner ? [{ ...file.owner, key: `owner-${file.owner._id || file.owner.username}` }] : [];
    const shared = (file.sharedWith || []).map((entry) => ({ ...entry.user, role: entry.role, key: entry.user._id }));
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
          style={{ backgroundColor: person.avatarColor || ["#1a73e8", "#f97316", "#7c3aed", "#0f766e"][index % 4] }}
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
  const summaryClasses = summaryTone[accessSummary] || "bg-[#eef3fb] text-[#4b5563]";

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${accessTone[file.accessRole] || accessTone.viewer}`}>
        {file.accessRole}
      </span>
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${summaryClasses}`}>
        {accessSummary === "Public" ? <GlobeAltIcon className="h-3.5 w-3.5" /> : accessSummary === "Link" ? <LinkIcon className="h-3.5 w-3.5" /> : <UsersIcon className="h-3.5 w-3.5" />}
        {accessSummary}
      </span>
      {file.commentsCount ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#fff7e0] px-2.5 py-1 text-[11px] font-medium text-[#b06000]">
          <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5" />
          {file.commentsCount}
        </span>
      ) : null}
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
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
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
      <button className="rounded-full p-2 text-drive-subtext transition hover:bg-[#eef3fb] hover:text-drive-text" onClick={() => setOpen((current) => !current)}>
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[210px] rounded-[18px] border border-[#dde5f0] bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-sm">
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#f5f8fd]" onClick={() => handleAction(onOpen)}>Open</button>
          {!inTrash ? <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#f5f8fd]" onClick={() => handleAction(onRenameStart)}>Rename</button> : null}
          {!inTrash ? <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#f5f8fd]" onClick={() => handleAction(onCopyLink)}>Copy link</button> : null}
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#f5f8fd]" onClick={() => handleAction(onStar)}>{file.isStarred ? "Remove star" : "Add star"}</button>
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#f5f8fd]" onClick={() => handleAction(onPin)}>{file.isPinned ? "Unpin" : "Pin to top"}</button>
          {canManage && !inTrash ? <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#f5f8fd]" onClick={() => handleAction(onShare)}>Share</button> : null}
          {inTrash ? (
            <>
              <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-drive-text transition hover:bg-[#f5f8fd]" onClick={() => handleAction(onRestore)}>Restore</button>
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
  renaming = false,
  visibleColumns,
  denseMode = false,
  onSelect,
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
  const gridTemplate = `48px minmax(280px,1.9fr) minmax(150px,0.8fr) ${visibleColumns.lastOpened ? "minmax(132px,0.74fr)" : ""} ${visibleColumns.role ? "minmax(132px,0.74fr)" : ""} minmax(132px,0.75fr) minmax(108px,0.45fr) 68px`;

  useEffect(() => {
    setDraftName(file.filename);
  }, [file.filename]);

  useEffect(() => {
    if (renaming) {
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
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
      className={`grid ${rowHeight} items-center border-t border-[#edf2f8] px-4 text-sm text-drive-text transition-all duration-150 ${selected ? "bg-[#edf4ff]" : "bg-white hover:bg-[#f8fbff]"} ${dragOver ? "ring-2 ring-inset ring-[#1a73e8]" : ""}`}
      style={{ gridTemplateColumns: gridTemplate }}
      onClick={(event) => onSelect(file, event)}
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
        <input type="checkbox" className="h-4 w-4 rounded border-[#c7d2e3] text-[#1a73e8] focus:ring-[#1a73e8]" checked={selected} onChange={(event) => onToggleSelect(file, event.target.checked)} />
      </div>

      <div className="flex min-w-0 items-center gap-3 py-3">
        <div className={`grid ${denseMode ? "h-9 w-9" : "h-10 w-10"} shrink-0 place-items-center rounded-2xl ${isDocument ? "bg-[#e8f0fe] text-[#1a73e8]" : isFolder ? "bg-[#fff3d8] text-[#f29900]" : "bg-[#eef2f7] text-[#5f6368]"}`}>
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
                className="h-9 w-full max-w-[320px] rounded-xl border border-[#c9d5e5] bg-white px-3 text-[15px] font-medium text-drive-text shadow-[0_1px_2px_rgba(60,64,67,0.08)] outline-none focus:border-[#8ab4f8]"
              />
            ) : (
              <button className="truncate text-left text-[15px] font-medium text-drive-text hover:text-[#174ea6]" onClick={(event) => { stopPropagation(event); onOpen(file); }}>
                {file.filename}
              </button>
            )}
            {file.isPinned ? <BookmarkSolidIcon className="h-4 w-4 shrink-0 text-[#1a73e8]" title="Pinned" /> : null}
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


