import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  BookmarkIcon,
  ChevronRightIcon,
  FolderOpenIcon,
  ListBulletIcon,
  ShareIcon,
  Squares2X2Icon,
  StarIcon,
  TrashIcon
} from "@heroicons/react/24/outline";
import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { FileCard } from "../components/FileCard";
import { FileRow } from "../components/FileRow";
import { UploadModal } from "../components/modals/UploadModal";
import { ShareModal } from "../components/modals/ShareModal";
import { NewDocumentModal } from "../components/modals/NewDocumentModal";
import { CreateFolderModal } from "../components/modals/CreateFolderModal";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { ColumnsMenu } from "../components/dashboard/ColumnsMenu";
import { MoveItemsModal } from "../components/dashboard/MoveItemsModal";
import { PreviewPanel } from "../components/dashboard/PreviewPanel";
import { SkeletonList } from "../components/dashboard/SkeletonList";
import { filesApi, sharingApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const sectionMeta = {
  "my-files": { label: "My Drive", description: "Build nested workspaces with folders, docs, and uploaded assets." },
  shared: { label: "Shared with me", description: "Everything your collaborators have invited you into." },
  recent: { label: "Recent", description: "A quick view of your latest activity and edits." },
  starred: { label: "Starred", description: "Items you marked for quick access." },
  trash: { label: "Trash", description: "Soft-deleted items that can be restored before permanent removal." }
};

const filterOptions = {
  type: [
    { value: "all", label: "Type" },
    { value: "folder", label: "Folders" },
    { value: "document", label: "Documents" },
    { value: "file", label: "Files" }
  ],
  owner: [
    { value: "all", label: "People" },
    { value: "owner", label: "Owned by me" },
    { value: "shared", label: "Shared with me" },
    { value: "editable", label: "Can edit" }
  ],
  sort: [
    { value: "updated-desc", label: "Modified" },
    { value: "created-desc", label: "Created" },
    { value: "name-asc", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
    { value: "updated-asc", label: "Oldest updated" }
  ]
};

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;

const isTypingTarget = (target) => {
  const tagName = target?.tagName?.toLowerCase();
  return ["input", "textarea", "select"].includes(tagName) || target?.isContentEditable;
};

const EmptyIllustration = () => (
  <svg width="180" height="120" viewBox="0 0 180 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
    <rect x="15" y="24" width="150" height="78" rx="18" fill="#f7eef3" />
    <rect x="40" y="16" width="54" height="22" rx="11" fill="#f1dce8" />
    <rect x="42" y="44" width="96" height="10" rx="5" fill="#e7c1d3" />
    <rect x="42" y="62" width="76" height="10" rx="5" fill="#eed7e2" />
    <circle cx="132" cy="33" r="15" fill="#f3e2ea" />
    <path d="M132 25V41" stroke="#9d174d" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M124 33H140" stroke="#9d174d" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout, notifications, markNotificationsRead, updatePreferences, refreshNotifications } = useAuth();
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [activity, setActivity] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("my-files");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState(user?.preferences?.viewMode || "list");
  const [denseMode, setDenseMode] = useState((user?.preferences?.density || "comfortable") === "dense");
  const [typeFilter, setTypeFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated-desc");
  const [parentId, setParentId] = useState("root");
  const [showUpload, setShowUpload] = useState(false);
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewId, setPreviewId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({ lastOpened: true, role: true });
  const [moveLoading, setMoveLoading] = useState(false);
  const [draggingIds, setDraggingIds] = useState([]);

  useEffect(() => {
    setViewMode(user?.preferences?.viewMode || "list");
    setDenseMode((user?.preferences?.density || "comfortable") === "dense");
  }, [user?.preferences?.viewMode, user?.preferences?.density]);

  useEffect(() => {
    if (!["my-files", "starred"].includes(activeSection)) {
      setParentId("root");
      setBreadcrumbs([]);
    }
    setSelectedIds([]);
    setPreviewId(null);
    setRenamingId(null);
  }, [activeSection]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const params = { search };
      if (activeSection === "my-files") params.section = "my-files";
      if (activeSection === "shared") params.section = "shared";
      if (activeSection === "recent") params.section = "recent";
      if (activeSection === "starred") {
        params.section = "all";
        params.starred = true;
      }
      if (activeSection === "trash") {
        params.section = "all";
        params.includeTrashed = true;
      }
      if (["my-files", "starred"].includes(activeSection)) params.parentId = parentId;

      const { data } = await filesApi.list(params);
      setFiles(data.files || []);
      setBreadcrumbs(data.breadcrumbs || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load your workspace.");
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    try {
      const { data } = await filesApi.activity();
      setActivity(data.activity || []);
    } catch {
      setActivity([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFiles();
      loadActivity();
      refreshNotifications();
    }, 140);
    return () => clearTimeout(timer);
  }, [activeSection, search, parentId]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => files.some((file) => file.id === id)));
    setPreviewId((current) => (current && files.some((file) => file.id === current) ? current : null));
  }, [files]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (isTypingTarget(event.target)) return;
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setShowNewDoc(true);
      }
      if (event.key === "/") {
        event.preventDefault();
        document.querySelector('input[placeholder="Search in CollabDrive"]')?.focus();
      }
      if (event.key === "Delete" && selectedIds.length) {
        event.preventDefault();
        if (activeSection === "trash") handleBulkAction("delete");
        else handleBulkAction("trash");
      }
      if (event.key === "Enter" && selectedIds.length === 1) {
        const item = files.find((file) => file.id === selectedIds[0]);
        if (item) {
          event.preventDefault();
          openItem(item);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIds, files, activeSection]);

  const persistPreferences = async (next) => {
    try {
      await updatePreferences({
        viewMode: next.viewMode ?? viewMode,
        density: next.density ?? (denseMode ? "dense" : "comfortable")
      });
    } catch {
      toast.error("Could not save your workspace preference.");
    }
  };

  const filteredFiles = useMemo(() => {
    const nextFiles = [...files]
      .filter((file) => (typeFilter === "all" ? true : file.category === typeFilter))
      .filter((file) => {
        if (ownerFilter === "all") return true;
        if (ownerFilter === "owner") return file.accessRole === "owner";
        if (ownerFilter === "shared") return file.accessRole !== "owner";
        if (ownerFilter === "editable") return ["owner", "editor"].includes(file.accessRole);
        return true;
      });

    nextFiles.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (sortBy === "updated-desc") return new Date(b.updatedAt) - new Date(a.updatedAt);
      if (sortBy === "updated-asc") return new Date(a.updatedAt) - new Date(b.updatedAt);
      if (sortBy === "name-asc") return a.filename.localeCompare(b.filename);
      if (sortBy === "name-desc") return b.filename.localeCompare(a.filename);
      if (sortBy === "created-desc") return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });

    return nextFiles;
  }, [files, typeFilter, ownerFilter, sortBy]);

  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + (file.size || 0), 0), [files]);
  const metrics = useMemo(() => ([
    { label: "Items", value: filteredFiles.length, helper: "Current results" },
    { label: "Folders", value: filteredFiles.filter((file) => file.category === "folder").length, helper: "Nested spaces" },
    { label: "Shared", value: filteredFiles.filter((file) => file.accessRole !== "owner" || file.sharedCount > 0 || file.visibility !== "private").length, helper: "Collaborative" }
  ]), [filteredFiles]);

  const selectedFiles = useMemo(() => filteredFiles.filter((file) => selectedIds.includes(file.id)), [filteredFiles, selectedIds]);
  const previewFile = useMemo(() => filteredFiles.find((file) => file.id === previewId) || null, [filteredFiles, previewId]);
  const destinationOptions = useMemo(() => {
    const map = new Map();
    map.set("root", { value: "root", label: "My Drive" });
    breadcrumbs.forEach((crumb) => map.set(String(crumb.id), { value: String(crumb.id), label: crumb.filename }));
    filteredFiles.filter((file) => file.category === "folder").forEach((folder) => map.set(String(folder.id), { value: String(folder.id), label: folder.filename }));
    return Array.from(map.values());
  }, [breadcrumbs, filteredFiles]);

  const openItem = (file) => {
    if (file.category === "folder") {
      setActiveSection("my-files");
      setParentId(file.id);
      setSelectedIds([]);
      setPreviewId(null);
      return;
    }
    if (file.category === "document") {
      navigate(`/editor/${file.id}`);
      return;
    }
    window.open(filesApi.downloadUrl(file.id), "_blank", "noopener,noreferrer");
  };

  const handleUpload = async ({ file, filename }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (filename) formData.append("filename", filename);
      if (activeSection === "my-files" && parentId !== "root") formData.append("parent", parentId);
      await filesApi.upload(formData);
      toast.success("File uploaded to your drive.");
      await loadFiles();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed.");
      return false;
    }
  };

  const handleNewDocument = async ({ filename, documentFormat }) => {
    try {
      const payload = { filename, documentFormat };
      if (activeSection === "my-files" && parentId !== "root") payload.parent = parentId;
      const { data } = await filesApi.createDocument(payload);
      toast.success("New document ready.");
      navigate(`/editor/${data.file.id}`);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create the document.");
      return false;
    }
  };

  const handleCreateFolder = async ({ filename }) => {
    try {
      const payload = { filename };
      if (activeSection === "my-files" && parentId !== "root") payload.parent = parentId;
      await filesApi.createFolder(payload);
      toast.success("Folder created.");
      await loadFiles();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create the folder.");
      return false;
    }
  };

  const handleTrash = async (file) => {
    try {
      await filesApi.trash(file.id);
      toast.success(`${file.filename} moved to trash.`);
      await loadFiles();
      setSelectedIds((current) => current.filter((id) => id !== file.id));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not move the item to trash.");
    }
  };

  const handleRestore = async (file) => {
    try {
      await filesApi.restore(file.id);
      toast.success(`${file.filename} restored to its original location.`);
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not restore the item.");
    }
  };

  const handleDeletePermanently = async (file) => {
    try {
      await filesApi.delete(file.id);
      toast.success(`${file.filename} was deleted permanently.`);
      await loadFiles();
      setSelectedIds((current) => current.filter((id) => id !== file.id));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not permanently delete the item.");
    }
  };

  const handleFavorite = async (file, kind) => {
    try {
      await filesApi.toggleFavorite(file.id, kind);
      await loadFiles();
      toast.success(kind === "star" ? (file.isStarred ? "Star removed." : "Item starred.") : (file.isPinned ? "Item unpinned." : "Item pinned to the top."));
    } catch (error) {
      toast.error(error.response?.data?.message || `Could not update ${kind}.`);
    }
  };

  const handleRename = async (file, nextName, cancelled = false) => {
    if (cancelled) {
      setRenamingId(null);
      return;
    }
    if (!file || !nextName) return;
    try {
      await filesApi.rename(file.id, { filename: nextName });
      toast.success("Item renamed.");
      setRenamingId(null);
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not rename the item.");
    }
  };

  const handleShare = async ({ identifier, role }) => {
    if (!shareTarget) return false;
    try {
      const { data } = await sharingApi.share(shareTarget.id, { identifier, role });
      setShareTarget((current) => ({ ...current, ...data.file }));
      toast.success("Access updated.");
      await loadFiles();
      await refreshNotifications();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Sharing failed.");
      return false;
    }
  };

  const handleSharingSettings = async ({ visibility, linkEnabled, linkRole }) => {
    if (!shareTarget) return;
    try {
      const { data } = await sharingApi.updateSettings(shareTarget.id, { visibility, linkEnabled, linkRole });
      setShareTarget((current) => ({ ...current, ...data.file }));
      toast.success("Sharing settings updated.");
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update sharing settings.");
    }
  };

  const handleRevokeAll = async () => {
    if (!shareTarget) return;
    try {
      const { data } = await sharingApi.revokeAll(shareTarget.id);
      setShareTarget((current) => ({ ...current, ...data.file }));
      toast.success("All shared access revoked.");
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not revoke access.");
    }
  };

  const handleRemoveShare = async (userId) => {
    if (!shareTarget) return;
    try {
      await sharingApi.unshare(shareTarget.id, userId);
      setShareTarget((current) => ({ ...current, sharedWith: current.sharedWith.filter((entry) => entry.user._id !== userId) }));
      toast.success("Access removed.");
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update sharing.");
    }
  };

  const handleCopyLink = async (file) => {
    try {
      let target = file;
      if (!(file.linkShare?.enabled && file.linkShare?.token) && file.visibility !== "public") {
        const { data } = await sharingApi.updateSettings(file.id, { visibility: "link", linkEnabled: true, linkRole: "viewer" });
        target = data.file;
      }
      const link = target.visibility === "public"
        ? `${window.location.origin}/editor/${target.id}`
        : `${window.location.origin}/editor/${target.id}?linkToken=${target.linkShare.token}`;
      await navigator.clipboard.writeText(link);
      toast.success("Share link copied to clipboard.");
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create a share link.");
    }
  };

  const handleBulkAction = async (action, extra = {}) => {
    if (!selectedIds.length) return;
    try {
      const { data } = await filesApi.bulk({ ids: selectedIds, action, ...extra });
      const processed = data.processed || 0;
      if (processed) {
        const messages = {
          trash: `${processed} item${processed > 1 ? "s" : ""} moved to trash.`,
          restore: `${processed} item${processed > 1 ? "s" : ""} restored.`,
          delete: `${processed} item${processed > 1 ? "s" : ""} deleted permanently.`,
          star: `${processed} item${processed > 1 ? "s" : ""} starred.`,
          unstar: `${processed} item${processed > 1 ? "s" : ""} unstarred.`,
          pin: `${processed} item${processed > 1 ? "s" : ""} pinned.`,
          unpin: `${processed} item${processed > 1 ? "s" : ""} unpinned.`,
          move: `${processed} item${processed > 1 ? "s" : ""} moved.`
        };
        toast.success(messages[action] || "Bulk action complete.");
      }
      setSelectedIds([]);
      setPreviewId(null);
      setShowMove(false);
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Bulk action failed.");
    }
  };

  const handlePreviewFile = (file) => {
    setPreviewId(file.id);
    setRenamingId(null);
  };

  const handleToggleSelect = (file, checked) => {
    setPreviewId(file.id);
    setSelectedIds((current) => checked ? [...new Set([...current, file.id])] : current.filter((id) => id !== file.id));
  };

  const handleSelectAll = (checked) => {
    setSelectedIds(checked ? filteredFiles.map((file) => file.id) : []);
  };

  const handleMoveSubmit = async (destinationId) => {
    setMoveLoading(true);
    try {
      await handleBulkAction("move", { destinationId });
    } finally {
      setMoveLoading(false);
    }
  };

  const handleDragStartFile = (event, file) => {
    const ids = selectedIds.includes(file.id) ? selectedIds : [file.id];
    setDraggingIds(ids);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(ids));
  };

  const handleDragEndFile = () => setDraggingIds([]);

  const handleDropIntoFolder = async (folder) => {
    const ids = draggingIds.length ? draggingIds : [];
    if (!ids.length || ids.includes(folder.id)) return;
    await handleBulkAction("move", { destinationId: folder.id });
    setDraggingIds([]);
  };

  const meta = sectionMeta[activeSection];
  const allSelected = filteredFiles.length && selectedIds.length === filteredFiles.length;
  const someSelected = selectedIds.length > 0;
  const listGridColumns = `48px minmax(240px,1.6fr) minmax(170px,0.85fr) ${visibleColumns.lastOpened ? "minmax(132px,0.72fr)" : ""} ${visibleColumns.role ? "minmax(112px,0.52fr)" : ""} minmax(132px,0.72fr) minmax(88px,0.38fr) 68px`;

  return (
    <div className="min-h-screen bg-drive-bg lg:pr-4">
      <div className="mx-auto flex min-h-screen max-w-[1760px] flex-col gap-5 lg:flex-row lg:items-stretch">
        <Sidebar
          activeSection={activeSection}
          setActiveSection={(section) => { setActiveSection(section); setIsSidebarOpen(false); }}
          onUpload={() => setShowUpload(true)}
          onNewDocument={() => setShowNewDoc(true)}
          onCreateFolder={() => setShowNewFolder(true)}
          onOpenSettings={() => setShowSettings(true)}
          isSidebarOpen={isSidebarOpen}
          totalBytes={totalBytes}
          storageLimitBytes={STORAGE_LIMIT_BYTES}
        />

        <main className="min-w-0 flex-1 space-y-4 px-4 py-4 lg:px-0 lg:py-4">
          <Topbar
            user={user}
            search={search}
            setSearch={setSearch}
            onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
            onOpenHelp={() => setShowHelp(true)}
            onOpenSettings={() => setShowSettings(true)}
            onToggleDensity={async () => {
              const nextDense = !denseMode;
              setDenseMode(nextDense);
              await persistPreferences({ density: nextDense ? "dense" : "comfortable" });
            }}
            denseMode={denseMode}
            onLogout={logout}
            notifications={notifications}
            onMarkNotificationsRead={markNotificationsRead}
          />

          <section className="rounded-[28px] bg-white/88 px-6 py-4 shadow-shell backdrop-blur-xl">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2 text-sm text-drive-subtext">
                  <FolderOpenIcon className="h-4 w-4" />
                  <span>{meta.label}</span>
                  {breadcrumbs.length ? <ChevronRightIcon className="h-4 w-4" /> : null}
                  {breadcrumbs.length ? <button className="rounded-full px-2 py-1 text-sm text-drive-subtext transition hover:bg-[#f6edf2]" onClick={() => setParentId("root")}>Home</button> : <span className="rounded-full px-2 py-1">Home</span>}
                  {breadcrumbs.map((crumb) => (
                    <div key={crumb.id} className="flex items-center gap-2">
                      <ChevronRightIcon className="h-4 w-4" />
                      <button className="rounded-full px-2 py-1 text-sm text-drive-subtext transition hover:bg-[#f6edf2]" onClick={() => setParentId(crumb.id)}>{crumb.filename}</button>
                    </div>
                  ))}
                </div>
                <h1 className="text-[3.1rem] font-medium leading-[0.98] tracking-tight text-drive-text">{meta.label}</h1>
                <p className="mt-2 max-w-[720px] text-[15px] text-drive-subtext">{meta.description}</p>
              </div>

              <div className="flex flex-col gap-3 xl:items-end">
                <div className="relative flex flex-wrap items-center gap-2 rounded-full bg-[#fcf8fb] p-1.5">
                  <button className={`rounded-full px-4 py-2 text-sm font-medium transition ${viewMode === "list" ? "bg-[#f5d0de] text-[#7a183f]" : "text-drive-subtext hover:bg-white"}`} onClick={async () => { setViewMode("list"); await persistPreferences({ viewMode: "list" }); }}><ListBulletIcon className="h-5 w-5" /></button>
                  <button className={`rounded-full px-4 py-2 text-sm font-medium transition ${viewMode === "grid" ? "bg-[#f5d0de] text-[#7a183f]" : "text-drive-subtext hover:bg-white"}`} onClick={async () => { setViewMode("grid"); await persistPreferences({ viewMode: "grid" }); }}><Squares2X2Icon className="h-5 w-5" /></button>
                  <div className="relative">
                    <Button variant="surface" className="gap-2" onClick={() => setColumnsOpen((current) => !current)}><AdjustmentsHorizontalIcon className="h-4 w-4" /> Columns</Button>
                    <ColumnsMenu open={columnsOpen} onClose={() => setColumnsOpen(false)} visibleColumns={visibleColumns} onToggle={(key) => setVisibleColumns((current) => ({ ...current, [key]: !current[key] }))} />
                  </div>
                  <Button variant="surface" onClick={async () => { await loadActivity(); setShowActivity(true); }}>Activity</Button>
                  <Button variant="surface" onClick={loadFiles}><ArrowPathIcon className="h-4 w-4" /></Button>
                </div>

                <div className="grid grid-cols-3 gap-3 xl:min-w-[420px]">
                  {metrics.map((metric) => (
                    <div key={metric.label} className="rounded-[20px] bg-[#fcf8fb] px-4 py-3 shadow-[0_8px_20px_rgba(74,21,75,0.06)]">
                      <p className="text-xs uppercase tracking-[0.18em] text-drive-subtext">{metric.label}</p>
                      <p className="mt-2 text-[2.3rem] font-medium leading-none tracking-tight text-drive-text">{String(metric.value).padStart(2, "0")}</p>
                      <p className="mt-1 text-xs text-drive-subtext">{metric.helper}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] bg-white/88 px-6 py-4 shadow-shell backdrop-blur-xl">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Select value={typeFilter} onChange={setTypeFilter} options={filterOptions.type} className="min-w-[160px]" buttonClassName="h-11 min-w-[160px] rounded-full border border-[#e7d9e1] px-5 py-3 text-[15px] shadow-[0_1px_2px_rgba(60,64,67,0.06)]" menuClassName="min-w-[220px]" />
              <Select value={ownerFilter} onChange={setOwnerFilter} options={filterOptions.owner} className="min-w-[190px]" buttonClassName="h-11 min-w-[190px] rounded-full border border-[#e7d9e1] px-5 py-3 text-[15px] shadow-[0_1px_2px_rgba(60,64,67,0.06)]" menuClassName="min-w-[240px]" />
              <Select value={sortBy} onChange={setSortBy} options={filterOptions.sort} className="min-w-[190px]" buttonClassName="h-11 min-w-[190px] rounded-full border border-[#e7d9e1] px-5 py-3 text-[15px] shadow-[0_1px_2px_rgba(60,64,67,0.06)]" menuClassName="min-w-[220px]" />
            </div>

            {someSelected ? (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[22px] border border-[#edc8d7] bg-[#f9e8ef] px-4 py-3 shadow-[0_8px_20px_rgba(157,23,77,0.10)]">
                <span className="mr-2 text-sm font-medium text-[#7a183f]">{selectedIds.length} selected</span>
                <Button variant="surface" className="gap-2" onClick={() => handleBulkAction(selectedFiles.every((file) => file.isStarred) ? "unstar" : "star")}><StarIcon className="h-4 w-4" /> {selectedFiles.every((file) => file.isStarred) ? "Unstar" : "Star"}</Button>
                <Button variant="surface" className="gap-2" onClick={() => handleBulkAction(selectedFiles.every((file) => file.isPinned) ? "unpin" : "pin")}><BookmarkIcon className="h-4 w-4" /> {selectedFiles.every((file) => file.isPinned) ? "Unpin" : "Pin"}</Button>
                <Button variant="surface" className="gap-2" onClick={() => setShowMove(true)}><ArrowsRightLeftIcon className="h-4 w-4" /> Move</Button>
                <Button variant="surface" className="gap-2" disabled={selectedIds.length !== 1} onClick={() => { const file = selectedFiles[0]; if (file) { setShareTarget(file); setShowShare(true); } }}><ShareIcon className="h-4 w-4" /> Share</Button>
                {!selectedFiles.every((file) => file.isTrashed) ? <Button variant="danger" className="gap-2" onClick={() => handleBulkAction("trash")}><TrashIcon className="h-4 w-4" /> Trash</Button> : null}
                {selectedFiles.every((file) => file.isTrashed) ? <Button variant="surface" className="gap-2" onClick={() => handleBulkAction("restore")}>Restore</Button> : null}
                {selectedFiles.every((file) => file.isTrashed) ? <Button variant="danger" onClick={() => handleBulkAction("delete")}>Delete permanently</Button> : null}
                <button className="ml-auto rounded-full px-3 py-2 text-sm text-drive-subtext transition hover:bg-white" onClick={() => setSelectedIds([])}>Clear</button>
              </div>
            ) : null}

            {loading ? <SkeletonList rows={6} /> : null}

            {!loading && !filteredFiles.length ? (
              <div className="grid min-h-[320px] place-items-center rounded-[24px] bg-[#fcf8fb] px-6 text-center">
                <div>
                  <EmptyIllustration />
                  <p className="mt-4 text-2xl font-medium text-drive-text">Nothing here yet</p>
                  <p className="mt-3 max-w-lg text-sm text-drive-subtext">Create a document, upload a file, or drop a folder into this space to start building your drive.</p>
                </div>
              </div>
            ) : null}

            {!loading && filteredFiles.length ? (
              viewMode === "grid" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredFiles.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      onOpen={openItem}
                      onDelete={handleTrash}
                      onShare={(item) => { setShareTarget(item); setShowShare(true); }}
                      onStar={(item) => handleFavorite(item, "star")}
                      onPin={(item) => handleFavorite(item, "pin")}
                      onRestore={handleRestore}
                      denseMode={denseMode}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="overflow-hidden rounded-[24px] border border-[#eadfe6] bg-white">
                    <div className="overflow-x-auto">
                      <div className="min-w-[1080px]">
                        <div className="grid min-h-[54px] items-center bg-[#fcf8fb] px-4 text-sm font-medium text-drive-subtext" style={{ gridTemplateColumns: listGridColumns }}>
                          <div className="flex justify-center"><input type="checkbox" className="h-4 w-4 rounded border-[#d8c4cf] text-[#9d174d]" checked={Boolean(allSelected)} onChange={(event) => handleSelectAll(event.target.checked)} /></div>
                          <div>Name</div>
                          <div>Owner</div>
                          {visibleColumns.lastOpened ? <div>Last opened</div> : null}
                          {visibleColumns.role ? <div>Role</div> : null}
                          <div>Modified</div>
                          <div>Size</div>
                          <div className="text-right">Actions</div>
                        </div>
                        {filteredFiles.map((file) => (
                          <FileRow
                            key={file.id}
                            file={file}
                            selected={selectedIds.includes(file.id)}
                            previewed={previewId === file.id}
                            renaming={renamingId === file.id}
                            visibleColumns={visibleColumns}
                            denseMode={denseMode}
                            onPreview={handlePreviewFile}
                            onToggleSelect={handleToggleSelect}
                            onOpen={openItem}
                            onShare={(item) => { setShareTarget(item); setShowShare(true); }}
                            onDelete={handleTrash}
                            onPermanentDelete={handleDeletePermanently}
                            onStar={(item) => handleFavorite(item, "star")}
                            onPin={(item) => handleFavorite(item, "pin")}
                            onRestore={handleRestore}
                            onRenameStart={(item) => { setPreviewId(item.id); setSelectedIds([item.id]); setRenamingId(item.id); }}
                            onRename={handleRename}
                            onCopyLink={handleCopyLink}
                            onDragStartFile={handleDragStartFile}
                            onDragEndFile={handleDragEndFile}
                            onDropIntoFolder={handleDropIntoFolder}
                          />
                        ))}
                      </div>
                    </div>
                  </div>


                </div>
              )
            ) : null}
          </section>
        </main>
      </div>


      <PreviewPanel
        open={Boolean(previewFile)}
        file={previewFile}
        onClose={() => setPreviewId(null)}
        onOpen={openItem}
        onShare={(item) => { setShareTarget(item); setShowShare(true); }}
        onCopyLink={handleCopyLink}
        onToggleStar={(item) => handleFavorite(item, "star")}
        onTogglePin={(item) => handleFavorite(item, "pin")}
        onTrash={handleTrash}
        onRestore={handleRestore}
        onDelete={handleDeletePermanently}
      />
      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} onSubmit={handleUpload} />
      <NewDocumentModal open={showNewDoc} onClose={() => setShowNewDoc(false)} onSubmit={handleNewDocument} />
      <CreateFolderModal open={showNewFolder} onClose={() => setShowNewFolder(false)} onSubmit={handleCreateFolder} />
      <MoveItemsModal open={showMove} onClose={() => setShowMove(false)} options={destinationOptions} onSubmit={handleMoveSubmit} loading={moveLoading} />
      <ShareModal open={showShare} onClose={() => setShowShare(false)} file={shareTarget} onSubmit={handleShare} onRemove={handleRemoveShare} onUpdateSettings={handleSharingSettings} onRevokeAll={handleRevokeAll} />

      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Workspace help" description="A quick guide to the enterprise features now built into CollabDrive.">
        <div className="space-y-3 text-sm text-drive-subtext">
          <p>Use folders to create nested hierarchies, drag selected items into folders, manage sharing from the preview or row menu, and use bulk actions after single-select or multi-select at enterprise scale.</p>
          <p>Keyboard shortcuts: press <span className="font-medium text-drive-text">N</span> for a new document, <span className="font-medium text-drive-text">/</span> to jump into search, <span className="font-medium text-drive-text">Delete</span> to trash selected items, and <span className="font-medium text-drive-text">Enter</span> to open the current selection.</p>
        </div>
      </Modal>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Workspace settings" description="Preferences are saved to your account on the backend.">
        <div className="space-y-4 text-sm text-drive-subtext">
          <div className="flex items-center justify-between rounded-2xl bg-[#fcf8fb] px-4 py-3">
            <span>Default view mode</span>
            <span className="font-medium text-drive-text capitalize">{viewMode}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-[#fcf8fb] px-4 py-3">
            <span>Density</span>
            <span className="font-medium text-drive-text">{denseMode ? "Dense" : "Comfortable"}</span>
          </div>
        </div>
      </Modal>

      <Modal open={showActivity} onClose={() => setShowActivity(false)} title="Activity" description="Recent audit-style activity across the files you can access.">
        <div className="space-y-3">
          {activity.length ? activity.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-[#e7ecf4] bg-[#fcf8fb] px-4 py-3">
              <p className="text-sm font-medium text-drive-text">{entry.actor?.name || "System"} {entry.action}</p>
              <p className="mt-1 text-sm text-drive-subtext">{entry.file?.filename}</p>
              <p className="mt-1 text-xs text-drive-subtext">{new Date(entry.createdAt).toLocaleString()}</p>
            </div>
          )) : <p className="text-sm text-drive-subtext">No activity yet.</p>}
        </div>
      </Modal>
    </div>
  );
};


















