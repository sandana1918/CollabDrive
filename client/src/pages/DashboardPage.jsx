import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  ChevronRightIcon,
  FolderOpenIcon,
  InformationCircleIcon,
  ListBulletIcon,
  Squares2X2Icon
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
import { Spinner } from "../components/ui/Spinner";
import { Modal } from "../components/ui/Modal";
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

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    setViewMode(user?.preferences?.viewMode || "list");
    setDenseMode((user?.preferences?.density || "comfortable") === "dense");
  }, [user?.preferences?.viewMode, user?.preferences?.density]);

  useEffect(() => {
    if (!["my-files", "starred"].includes(activeSection)) {
      setParentId("root");
      setBreadcrumbs([]);
    }
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
      if (["my-files", "starred"].includes(activeSection)) {
        params.parentId = parentId;
      }

      const { data } = await filesApi.list(params);
      setFiles(data.files || []);
      setBreadcrumbs(data.breadcrumbs || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load files.");
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

  const persistPreferences = async (next) => {
    try {
      await updatePreferences({
        viewMode: next.viewMode ?? viewMode,
        density: next.density ?? (denseMode ? "dense" : "comfortable")
      });
    } catch {
      toast.error("Could not save preferences.");
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
    { label: "Items", value: filteredFiles.length, helper: "In this view" },
    { label: "Folders", value: filteredFiles.filter((file) => file.category === "folder").length, helper: "Nested structure" },
    { label: "Shared", value: filteredFiles.filter((file) => file.accessRole !== "owner").length, helper: "Across collaborators" }
  ]), [filteredFiles]);

  const handleUpload = async ({ file, filename }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (filename) formData.append("filename", filename);
      if (activeSection === "my-files" && parentId !== "root") formData.append("parent", parentId);
      await filesApi.upload(formData);
      toast.success("File uploaded successfully.");
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
      toast.success("Document created.");
      navigate(`/editor/${data.file.id}`);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create document.");
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
      toast.error(error.response?.data?.message || "Could not create folder.");
      return false;
    }
  };

  const handleTrash = async (file) => {
    try {
      await filesApi.trash(file.id);
      toast.success("Item moved to trash.");
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not move item to trash.");
    }
  };

  const handleRestore = async (file) => {
    try {
      await filesApi.restore(file.id);
      toast.success("Item restored.");
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not restore item.");
    }
  };

  const handleFavorite = async (file, kind) => {
    try {
      await filesApi.toggleFavorite(file.id, kind);
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || `Could not update ${kind}.`);
    }
  };

  const handleShare = async ({ identifier, role }) => {
    if (!selectedFile) return false;
    try {
      const { data } = await sharingApi.share(selectedFile.id, { identifier, role });
      setSelectedFile((current) => ({ ...current, ...data.file }));
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
    if (!selectedFile) return;
    try {
      const { data } = await sharingApi.updateSettings(selectedFile.id, { visibility, linkEnabled, linkRole });
      setSelectedFile((current) => ({ ...current, ...data.file }));
      toast.success("Sharing settings updated.");
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update sharing settings.");
    }
  };

  const handleRevokeAll = async () => {
    if (!selectedFile) return;
    try {
      const { data } = await sharingApi.revokeAll(selectedFile.id);
      setSelectedFile((current) => ({ ...current, ...data.file }));
      toast.success("All shared access revoked.");
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not revoke access.");
    }
  };

  const handleRemoveShare = async (userId) => {
    if (!selectedFile) return;
    try {
      await sharingApi.unshare(selectedFile.id, userId);
      setSelectedFile((current) => ({ ...current, sharedWith: current.sharedWith.filter((entry) => entry.user._id !== userId) }));
      toast.success("Access removed.");
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update sharing.");
    }
  };

  const openItem = (file) => {
    if (file.category === "folder") {
      setActiveSection("my-files");
      setParentId(file.id);
      return;
    }
    if (file.category === "document") {
      navigate(`/editor/${file.id}`);
      return;
    }
    window.open(filesApi.downloadUrl(file.id), "_blank", "noopener,noreferrer");
  };

  const meta = sectionMeta[activeSection];

  return (
    <div className="min-h-screen bg-drive-bg p-4">
      <div className="mx-auto flex max-w-[1760px] flex-col gap-5 lg:flex-row">
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

        <main className="min-w-0 flex-1 space-y-5">
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

          <section className="rounded-[28px] bg-white/88 px-6 py-5 shadow-shell backdrop-blur-xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm text-drive-subtext">
                  <FolderOpenIcon className="h-4 w-4" />
                  <span>{meta.label}</span>
                </div>
                <h1 className="text-5xl font-medium tracking-tight text-drive-text">{meta.label}</h1>
                <p className="mt-3 max-w-2xl text-[15px] text-drive-subtext">{meta.description}</p>
                {["my-files", "starred"].includes(activeSection) ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-drive-subtext">
                    <button className="rounded-full px-3 py-1.5 hover:bg-[#eef3fb]" onClick={() => setParentId("root")}>Home</button>
                    {breadcrumbs.map((crumb) => (
                      <div key={crumb.id} className="flex items-center gap-2">
                        <ChevronRightIcon className="h-4 w-4" />
                        <button className="rounded-full px-3 py-1.5 hover:bg-[#eef3fb]" onClick={() => setParentId(crumb.id)}>{crumb.filename}</button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-4 lg:items-end">
                <div className="flex flex-wrap items-center gap-2 rounded-full bg-[#f5f8fd] p-1.5">
                  <button className={`rounded-full px-4 py-2 text-sm font-medium transition ${viewMode === "list" ? "bg-[#dbeafe] text-[#174ea6]" : "text-drive-subtext hover:bg-white"}`} onClick={async () => { setViewMode("list"); await persistPreferences({ viewMode: "list" }); }}><ListBulletIcon className="h-5 w-5" /></button>
                  <button className={`rounded-full px-4 py-2 text-sm font-medium transition ${viewMode === "grid" ? "bg-[#dbeafe] text-[#174ea6]" : "text-drive-subtext hover:bg-white"}`} onClick={async () => { setViewMode("grid"); await persistPreferences({ viewMode: "grid" }); }}><Squares2X2Icon className="h-5 w-5" /></button>
                  <Button variant="surface" onClick={async () => { await loadActivity(); setShowActivity(true); }}>Activity</Button>
                  <Button variant="surface" onClick={loadFiles}><ArrowPathIcon className="h-4 w-4" /></Button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:min-w-[520px]">
                  {metrics.map((metric) => (
                    <div key={metric.label} className="rounded-[24px] bg-[#f8fbff] px-5 py-4 shadow-soft">
                      <p className="text-sm text-drive-subtext">{metric.label}</p>
                      <p className="mt-2 text-5xl font-medium tracking-tight text-drive-text">{String(metric.value).padStart(2, "0")}</p>
                      <p className="mt-2 text-xs text-drive-subtext">{metric.helper}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] bg-white/88 px-6 py-5 shadow-shell backdrop-blur-xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <select className="rounded-full border border-[#d9e1ee] bg-white px-4 py-2.5 text-sm" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="all">Type</option>
                <option value="folder">Folders</option>
                <option value="document">Documents</option>
                <option value="file">Files</option>
              </select>
              <select className="rounded-full border border-[#d9e1ee] bg-white px-4 py-2.5 text-sm" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                <option value="all">People</option>
                <option value="owner">Owned by me</option>
                <option value="shared">Shared with me</option>
                <option value="editable">Can edit</option>
              </select>
              <select className="rounded-full border border-[#d9e1ee] bg-white px-4 py-2.5 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="updated-desc">Modified</option>
                <option value="created-desc">Created</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="updated-asc">Oldest updated</option>
              </select>
            </div>

            {loading ? <div className="py-14"><Spinner label="Loading workspace" /></div> : null}

            {!loading && !filteredFiles.length ? (
              <div className="grid min-h-[360px] place-items-center rounded-[24px] bg-[#f8fbff] text-center">
                <div>
                  <p className="text-3xl font-medium text-drive-text">Nothing here yet</p>
                  <p className="mt-3 max-w-lg text-sm text-drive-subtext">Create a document or upload a file to start shaping your collaborative workspace.</p>
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
                      onShare={(item) => { setSelectedFile(item); setShowShare(true); }}
                      onStar={(item) => handleFavorite(item, "star")}
                      onPin={(item) => handleFavorite(item, "pin")}
                      onRestore={handleRestore}
                      denseMode={denseMode}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-[24px] border border-[#e4ebf4]">
                  <div className="grid min-h-[52px] grid-cols-[minmax(260px,1.8fr)_1fr_1fr_0.7fr_56px] items-center bg-[#f8fbff] px-5 text-sm font-medium text-drive-subtext">
                    <div>Name</div>
                    <div>Owner</div>
                    <div>Modified</div>
                    <div>Size</div>
                    <div className="text-right">Actions</div>
                  </div>
                  {filteredFiles.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      onOpen={openItem}
                      onShare={(item) => { setSelectedFile(item); setShowShare(true); }}
                      onDelete={handleTrash}
                      onStar={(item) => handleFavorite(item, "star")}
                      onPin={(item) => handleFavorite(item, "pin")}
                      onRestore={handleRestore}
                      denseMode={denseMode}
                    />
                  ))}
                </div>
              )
            ) : null}
          </section>
        </main>
      </div>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} onSubmit={handleUpload} />
      <NewDocumentModal open={showNewDoc} onClose={() => setShowNewDoc(false)} onSubmit={handleNewDocument} />
      <CreateFolderModal open={showNewFolder} onClose={() => setShowNewFolder(false)} onSubmit={handleCreateFolder} />
      <ShareModal open={showShare} onClose={() => setShowShare(false)} file={selectedFile} onSubmit={handleShare} onRemove={handleRemoveShare} onUpdateSettings={handleSharingSettings} onRevokeAll={handleRevokeAll} />

      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Workspace help" description="A quick guide to the enterprise features now built into CollabDrive.">
        <div className="space-y-3 text-sm text-drive-subtext">
          <p>Use folders to create nested hierarchies, drag your team into documents with viewer, commenter, or editor roles, and manage link or public access from the share flow.</p>
          <p>Starred and pinned items are personal to your account, while trash, notifications, activity logs, previews, and backend-saved preferences keep the workspace feeling more like a real enterprise drive.</p>
        </div>
      </Modal>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Workspace settings" description="Preferences are now persisted on the backend for your account.">
        <div className="space-y-4 text-sm text-drive-subtext">
          <div className="flex items-center justify-between rounded-2xl bg-[#f8fbff] px-4 py-3">
            <span>Default view mode</span>
            <span className="font-medium text-drive-text capitalize">{viewMode}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-[#f8fbff] px-4 py-3">
            <span>Density</span>
            <span className="font-medium text-drive-text">{denseMode ? "Dense" : "Comfortable"}</span>
          </div>
        </div>
      </Modal>

      <Modal open={showActivity} onClose={() => setShowActivity(false)} title="Activity" description="Recent audit-style activity across the files you can access.">
        <div className="space-y-3">
          {activity.length ? activity.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-[#e7ecf4] bg-[#fafcff] px-4 py-3">
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
