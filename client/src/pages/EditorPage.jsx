import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  Bars3BottomLeftIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  LockClosedIcon,
  LockOpenIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";
import { io } from "socket.io-client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { filesApi, sharingApi } from "../api";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { PresenceBar } from "../components/editor/PresenceBar";
import { Modal } from "../components/ui/Modal";
import { ShareModal } from "../components/modals/ShareModal";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const ToolbarButton = ({ active = false, disabled = false, onClick, children }) => (
  <button className={`grid h-9 min-w-9 place-items-center rounded-xl px-2 text-sm transition ${active ? "bg-[#dbe7ff] text-[#174ea6]" : "text-drive-text hover:bg-[#eef3fb]"} disabled:cursor-not-allowed disabled:opacity-45`} onMouseDown={(event) => event.preventDefault()} onClick={onClick} disabled={disabled}>
    {children}
  </button>
);

const EditorToolbar = ({ editor, disabled, onOpenVersions, onManageAccess, canManageAccess }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-[#dde3ee] bg-white px-4 py-3 shadow-soft">
      <ToolbarButton disabled={disabled} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolbarButton>
      <ToolbarButton disabled={disabled} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>I</ToolbarButton>
      <ToolbarButton disabled={disabled} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>U</ToolbarButton>
      <ToolbarButton disabled={disabled} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</ToolbarButton>
      <ToolbarButton disabled={disabled} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</ToolbarButton>
      <ToolbarButton disabled={disabled} active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>L</ToolbarButton>
      <ToolbarButton disabled={disabled} active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>C</ToolbarButton>
      <ToolbarButton disabled={disabled} active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>R</ToolbarButton>
      <select className="rounded-xl border border-[#d7dce5] px-3 py-2 text-sm outline-none" defaultValue="paragraph" onChange={(event) => {
        const value = event.target.value;
        const chain = editor.chain().focus();
        if (value === "paragraph") chain.setParagraph().run();
        if (value === "h1") chain.toggleHeading({ level: 1 }).run();
        if (value === "h2") chain.toggleHeading({ level: 2 }).run();
        if (value === "blockquote") chain.toggleBlockquote().run();
      }} disabled={disabled}>
        <option value="paragraph">Normal text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="blockquote">Quote</option>
      </select>
      <label className="flex items-center gap-2 rounded-xl border border-[#d7dce5] px-3 py-2 text-sm text-drive-subtext">
        Text
        <input type="color" onChange={(event) => editor.chain().focus().setColor(event.target.value).run()} disabled={disabled} />
      </label>
      <label className="flex items-center gap-2 rounded-xl border border-[#d7dce5] px-3 py-2 text-sm text-drive-subtext">
        Highlight
        <input type="color" onChange={(event) => editor.chain().focus().toggleHighlight({ color: event.target.value }).run()} disabled={disabled} />
      </label>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="surface" onClick={onOpenVersions}>History</Button>
        {canManageAccess ? <Button variant="surface" onClick={onManageAccess}>Manage access</Button> : null}
      </div>
    </div>
  );
};

export const EditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const linkToken = searchParams.get("linkToken");
  const authToken = localStorage.getItem("collabdrive-token");
  const [file, setFile] = useState(null);
  const [presence, setPresence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState("viewer");
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [socketInstance, setSocketInstance] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] })
    ],
    editable: role !== "viewer" && role !== "commenter",
    content: "<p><br></p>",
    onUpdate: ({ editor: current }) => {
      if (!socketInstance || !["owner", "editor"].includes(role)) return;
      socketInstance.emit("send-changes", { documentId: id, content: current.getHTML(), cursor: null });
    }
  }, [role, socketInstance, id]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(role !== "viewer" && role !== "commenter");
  }, [role, editor]);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        const params = linkToken ? { linkToken } : undefined;
        const { data } = await filesApi.getDocument(id, params);
        setFile(data.file);
        setRole(data.file.accessRole || "viewer");
        setVersions(data.versions || []);
        editor?.commands.setContent(data.content || "<p><br></p>", false);
      } catch (error) {
        toast.error(error.response?.data?.message || "Could not open document.");
        navigate(user ? "/" : "/login");
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [id, navigate, editor, linkToken, user, toast]);

  useEffect(() => {
    if (!editor || !authToken) return undefined;

    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", { auth: { token: authToken } });
    setSocketInstance(socket);

    socket.on("connect", () => {
      socket.emit("join-document", { documentId: id });
    });

    socket.on("document-loaded", (payload) => {
      setRole(payload.role);
      editor.commands.setContent(payload.content || "<p><br></p>", false);
    });

    socket.on("receive-changes", ({ content }) => {
      if (content !== editor.getHTML()) {
        editor.commands.setContent(content || "<p><br></p>", false);
      }
    });

    socket.on("presence-update", (nextPresence) => setPresence(nextPresence));
    socket.on("document-saved", () => setSaving(false));
    socket.on("editor-error", (payload) => toast.error(payload.message || "Editor error."));

    const intervalId = setInterval(() => {
      if (["owner", "editor"].includes(role)) {
        socket.emit("save-document", { documentId: id, content: editor.getHTML() });
        setSaving(true);
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
      if (["owner", "editor"].includes(role)) {
        socket.emit("save-document", { documentId: id, content: editor.getHTML() });
      }
      socket.disconnect();
      setSocketInstance(null);
    };
  }, [id, editor, role, authToken, toast]);

  const saveNow = async () => {
    if (!editor || !["owner", "editor"].includes(role)) return;
    setSaving(true);
    try {
      const content = editor.getHTML();
      await filesApi.saveDocument(id, { content });
      socketInstance?.emit("save-document", { documentId: id, content });
      toast.success("Document saved.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async ({ identifier, role: nextRole }) => {
    if (!file) return false;
    try {
      const { data } = await sharingApi.share(file.id, { identifier, role: nextRole });
      setFile((current) => ({ ...current, sharedWith: data.file.sharedWith, visibility: data.file.visibility, linkShare: data.file.linkShare }));
      toast.success("Access updated.");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Sharing failed.");
      return false;
    }
  };

  const handleSharingSettings = async ({ visibility, linkEnabled, linkRole }) => {
    if (!file) return;
    try {
      const { data } = await sharingApi.updateSettings(file.id, { visibility, linkEnabled, linkRole });
      setFile((current) => ({ ...current, ...data.file }));
      toast.success("Sharing settings updated.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update sharing settings.");
    }
  };

  const handleRevokeAll = async () => {
    if (!file) return;
    try {
      const { data } = await sharingApi.revokeAll(file.id);
      setFile((current) => ({ ...current, ...data.file }));
      toast.success("All shared access revoked.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not revoke access.");
    }
  };

  const handleRemoveShare = async (userId) => {
    if (!file) return;
    try {
      await sharingApi.unshare(file.id, userId);
      setFile((current) => ({ ...current, sharedWith: current.sharedWith.filter((entry) => entry.user._id !== userId) }));
      toast.success("Access removed.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update access.");
    }
  };

  const presenceLabel = useMemo(() => {
    if (!authToken) return "shared link access";
    return "live collaboration";
  }, [authToken]);

  if (loading || !editor) {
    return <div className="flex min-h-screen items-center justify-center bg-drive-bg"><Spinner label="Loading collaborative editor" /></div>;
  }

  const canEdit = ["owner", "editor"].includes(role);
  const canManageAccess = role === "owner";

  return (
    <div className="min-h-screen bg-drive-bg px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1680px] space-y-5">
        <header className="flex flex-col gap-4 rounded-[28px] bg-white/80 px-5 py-4 shadow-shell backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button className="grid h-11 w-11 place-items-center rounded-full text-drive-subtext transition hover:bg-slate-100" onClick={() => navigate(user ? "/" : "/login")}><ArrowLeftIcon className="h-5 w-5" /></button>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e8f0fe] text-drive-blue"><DocumentTextIcon className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-medium tracking-tight text-drive-text">{file?.filename}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-drive-subtext">
                <span className="inline-flex items-center gap-1.5">{canEdit ? <LockOpenIcon className="h-4 w-4" /> : <LockClosedIcon className="h-4 w-4" />} {role}</span>
                <span className="inline-flex items-center gap-1.5"><UserGroupIcon className="h-4 w-4" /> {presenceLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {authToken ? <PresenceBar presence={presence} /> : null}
            <Button onClick={saveNow} loading={saving} className="gap-2" disabled={!canEdit}><CloudArrowUpIcon className="h-4 w-4" /> Save</Button>
            <div className="relative">
              <button className="grid h-10 w-10 place-items-center rounded-full border border-[#d7dce5] bg-white text-drive-subtext transition hover:bg-slate-50" onClick={() => setShowMenu((current) => !current)}><EllipsisVerticalIcon className="h-5 w-5" /></button>
              {showMenu ? (
                <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[220px] rounded-2xl border border-[#e1e8f2] bg-white p-2 shadow-card">
                  <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-drive-text hover:bg-slate-50" onClick={() => { setShowMenu(false); setShowVersions(true); }}><Bars3BottomLeftIcon className="h-4 w-4" /> Version history</button>
                  {canManageAccess ? <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-drive-text hover:bg-slate-50" onClick={() => { setShowMenu(false); setShowShare(true); }}><UserGroupIcon className="h-4 w-4" /> Manage access</button> : null}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <EditorToolbar editor={editor} disabled={!canEdit} onOpenVersions={() => setShowVersions(true)} onManageAccess={() => setShowShare(true)} canManageAccess={canManageAccess} />

        <section className="rounded-[28px] bg-[#eef3fb] p-4 shadow-shell">
          <div className="rounded-[22px] border border-[#dde3ee] bg-white px-5 py-4 text-sm text-drive-subtext shadow-soft">
            {canEdit ? "Tiptap rich-text editing is enabled with stronger formatting reliability and structured content support." : role === "commenter" ? "You have commenter access. Review content, but editing is locked." : "You have view-only access. Editing tools are disabled until the owner grants edit permission."}
          </div>
          <div className="mt-4 overflow-auto rounded-[24px] bg-[#eef3fb] p-3">
            <div className="doc-page-shadow mx-auto min-h-[72vh] max-w-[900px] rounded-[18px] bg-white px-8 py-8">
              <EditorContent editor={editor} className="prose prose-slate max-w-none min-h-[64vh]" />
            </div>
          </div>
        </section>
      </div>

      <Modal open={showVersions} onClose={() => setShowVersions(false)} title="Version history" description="Recent document saves are available here, but kept out of the main editing surface.">
        <div className="space-y-3">
          {versions.length ? versions.map((version) => (
            <div key={version._id} className="rounded-2xl border border-[#e7ecf4] bg-[#fafcff] px-4 py-3">
              <p className="text-sm font-medium text-drive-text">{version.editedBy?.name || "Unknown user"}</p>
              <p className="mt-1 text-xs text-drive-subtext">{new Date(version.createdAt).toLocaleString()}</p>
            </div>
          )) : <p className="text-sm text-drive-subtext">No saved versions yet.</p>}
        </div>
      </Modal>

      <ShareModal open={showShare} onClose={() => setShowShare(false)} file={file} onSubmit={handleShare} onRemove={handleRemoveShare} onUpdateSettings={handleSharingSettings} onRevokeAll={handleRevokeAll} />
    </div>
  );
};
