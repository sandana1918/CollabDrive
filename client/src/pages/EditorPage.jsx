import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  Bars3BottomLeftIcon,
  Bars3CenterLeftIcon,
  Bars3Icon,
  ChatBubbleLeftEllipsisIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  ListBulletIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
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
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { filesApi, sharingApi } from "../api";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { PresenceBar } from "../components/editor/PresenceBar";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { ShareModal } from "../components/modals/ShareModal";
import { DocsMenuBar } from "../components/editor/DocsMenuBar";
import { CommentPanel } from "../components/editor/CommentPanel";
import { SlashMenu } from "../components/editor/SlashMenu";
import { FontSize } from "../components/editor/extensions/FontSize";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const ToolbarButton = ({ active = false, disabled = false, compact = false, title, onClick, children }) => (
  <button
    type="button"
    title={title}
    className={`grid place-items-center rounded-lg border text-[14px] font-medium transition ${compact ? "h-9 min-w-9 px-2" : "h-9 min-w-[40px] px-2.5"} ${active ? "border-[#e9b8c9] bg-[#f5d0de] text-[#7a183f]" : "border-transparent text-[#4b3744] hover:border-[#e4d5de] hover:bg-[#f7eff4]"} disabled:cursor-not-allowed disabled:opacity-45`}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

const Divider = () => <div className="h-6 w-px bg-[#e4d5de]" />;

const ColorControl = ({ label, value, disabled, onPick }) => {
  const inputRef = useRef(null);

  return (
    <button
      type="button"
      className="flex h-9 items-center gap-2 rounded-lg border border-transparent px-2.5 text-[14px] text-[#4b3744] transition hover:border-[#e4d5de] hover:bg-[#f7eff4] disabled:cursor-not-allowed disabled:opacity-45"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => inputRef.current?.click()}
      disabled={disabled}
    >
      <span>{label}</span>
      <span className="h-4 w-4 rounded-sm border border-[#c7cdd4]" style={{ backgroundColor: value }} />
      <input ref={inputRef} type="color" className="hidden" value={value} onChange={(event) => onPick(event.target.value)} disabled={disabled} />
    </button>
  );
};

const toUint8Array = (update) => {
  if (update instanceof Uint8Array) return update;
  if (update instanceof ArrayBuffer) return new Uint8Array(update);
  if (Array.isArray(update)) return new Uint8Array(update);
  if (update?.data && Array.isArray(update.data)) return new Uint8Array(update.data);
  return new Uint8Array(update || []);
};

const EditorToolbar = ({ editor, disabled, zoom, setZoom, onOpenVersions, onManageAccess, onToggleComments, canManageAccess, showComments }) => {
  if (!editor) return null;

  const currentColor = editor.getAttributes("textStyle")?.color || "#202124";
  const currentHighlight = editor.getAttributes("highlight")?.color || "#fbbc04";
  const currentFontSize = editor.getAttributes("textStyle")?.fontSize || "16px";

  return (
    <div className="rounded-[20px] border border-[#eadfe6] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(60,64,67,0.12)]">
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-xl px-1 py-1">
          <ToolbarButton compact title="Undo" disabled={disabled || !editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
            <ArrowUturnLeftIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton compact title="Redo" disabled={disabled || !editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
            <ArrowUturnRightIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <Divider />

        <Select
          value={editor.isActive("heading", { level: 1 }) ? "h1" : editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("blockquote") ? "blockquote" : "paragraph"}
          onChange={(value) => {
            const chain = editor.chain().focus();
            if (value === "paragraph") chain.setParagraph().run();
            if (value === "h1") chain.setHeading({ level: 1 }).run();
            if (value === "h2") chain.setHeading({ level: 2 }).run();
            if (value === "blockquote") chain.toggleBlockquote().run();
          }}
          options={[
            { value: "paragraph", label: "Normal text" },
            { value: "h1", label: "Heading 1" },
            { value: "h2", label: "Heading 2" },
            { value: "blockquote", label: "Quote" }
          ]}
          disabled={disabled}
          className="min-w-[170px]"
          buttonClassName="h-9 rounded-lg border border-transparent px-3 py-2 text-[14px] text-[#202124] hover:border-[#e4d5de] hover:bg-[#f7eff4]"
          menuClassName="min-w-[220px]"
        />

        <Select
          value={currentFontSize}
          onChange={(value) => editor.chain().focus().setFontSize(value).run()}
          options={["12px", "14px", "16px", "18px", "24px"].map((value) => ({ value, label: value.replace("px", "") }))}
          disabled={disabled}
          className="min-w-[86px]"
          buttonClassName="h-9 rounded-lg border border-transparent px-3 py-2 text-[14px] text-[#202124] hover:border-[#e4d5de] hover:bg-[#f7eff4]"
          menuClassName="min-w-[110px]"
        />

        <Divider />

        <div className="flex items-center gap-1 rounded-xl px-1 py-1">
          <ToolbarButton title="Bold" active={editor.isActive("bold")} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()}><span className="text-[15px] font-bold">B</span></ToolbarButton>
          <ToolbarButton title="Italic" active={editor.isActive("italic")} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()}><span className="text-[15px] italic">I</span></ToolbarButton>
          <ToolbarButton title="Underline" active={editor.isActive("underline")} disabled={disabled} onClick={() => editor.chain().focus().toggleUnderline().run()}><span className="text-[15px] underline underline-offset-2">U</span></ToolbarButton>
          <ToolbarButton title="Bullet list" active={editor.isActive("bulletList")} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()}><ListBulletIcon className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}><span className="text-[14px] font-medium">1.</span></ToolbarButton>
        </div>

        <Divider />

        <div className="flex items-center gap-1 rounded-xl px-1 py-1">
          <ToolbarButton compact title="Align left" active={editor.isActive({ textAlign: "left" })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("left").run()}><Bars3BottomLeftIcon className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton compact title="Align center" active={editor.isActive({ textAlign: "center" })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("center").run()}><Bars3CenterLeftIcon className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton compact title="Align right" active={editor.isActive({ textAlign: "right" })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("right").run()}><Bars3Icon className="h-4 w-4" /></ToolbarButton>
        </div>

        <Divider />

        <div className="flex items-center gap-1 rounded-xl px-1 py-1">
          <ColorControl label="Text" value={currentColor} disabled={disabled} onPick={(value) => editor.chain().focus().setColor(value).run()} />
          <ColorControl label="Highlight" value={currentHighlight} disabled={disabled} onPick={(value) => editor.chain().focus().toggleHighlight({ color: value }).run()} />
        </div>

        <div className="ml-auto flex items-center gap-2 pl-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-[#e4d5de] px-3 py-2 text-sm text-[#4b3744] transition hover:bg-[#f8f9fa]" onMouseDown={(event) => event.preventDefault()} onClick={() => setZoom((current) => Math.max(80, current - 10))}><MagnifyingGlassMinusIcon className="h-4 w-4" /></button>
          <span className="rounded-full bg-[#f7eff4] px-3 py-2 text-sm font-medium text-[#4b3744]">{zoom}%</span>
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-[#e4d5de] px-3 py-2 text-sm text-[#4b3744] transition hover:bg-[#f8f9fa]" onMouseDown={(event) => event.preventDefault()} onClick={() => setZoom((current) => Math.min(150, current + 10))}><MagnifyingGlassPlusIcon className="h-4 w-4" /></button>
          <Button variant="surface" onClick={onOpenVersions}>History</Button>
          <Button variant="surface" onClick={onToggleComments}>{showComments ? "Hide comments" : "Comments"}</Button>
          {canManageAccess ? <Button variant="surface" onClick={onManageAccess}>Manage access</Button> : null}
        </div>
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
  const yDoc = useMemo(() => new Y.Doc(), [id]);
  const awareness = useMemo(() => new Awareness(yDoc), [yDoc]);
  const collaborationProvider = useMemo(() => ({ awareness }), [awareness]);
  const socketRef = useRef(null);
  const roleRef = useRef("viewer");
  const seededYDocRef = useRef(false);
  const [file, setFile] = useState(null);
  const [presence, setPresence] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState("viewer");
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [slashState, setSlashState] = useState({ open: false, query: "" });
  const [selectedText, setSelectedText] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Collaboration.configure({ document: yDoc }),
      CollaborationCaret.configure({
        provider: collaborationProvider,
        user: {
          name: user?.name || user?.username || "Collaborator",
          color: user?.avatarColor || "#9d174d"
        }
      })
    ],
    editable: false,
    autofocus: false,
    editorProps: {
      attributes: {
        class: "collab-editor-surface",
        spellcheck: "false",
        autocorrect: "off",
        autocapitalize: "off",
        autocomplete: "off"
      }
    },

    onCreate: ({ editor: current }) => {
      setIsEditorEmpty(current.isEmpty);
    },
    onSelectionUpdate: ({ editor: current }) => {
      const { from, to } = current.state.selection;
      const text = current.state.doc.textBetween(from, to, " ").trim();
      setSelectedText(text);
      const paragraphText = current.state.selection.$from.parent.textContent || "";
      if (paragraphText.startsWith("/")) {
        setSlashState({ open: true, query: paragraphText.slice(1) });
      } else {
        setSlashState({ open: false, query: "" });
      }
    },
    onUpdate: ({ editor: current }) => {
      setIsEditorEmpty(current.isEmpty);
    }
  }, [yDoc, collaborationProvider, user?._id, user?.avatarColor, user?.name, user?.username]);

  useEffect(() => {
    roleRef.current = role;
    editor?.setEditable(["owner", "editor"].includes(role));
    if (role === "commenter") setShowComments(true);
  }, [role, editor]);

  useEffect(() => {
    if (!editor) return;

    const loadDocument = async () => {
      setLoading(true);
      try {
        const params = linkToken ? { linkToken } : undefined;
        const { data } = await filesApi.getDocument(id, params);
        setFile(data.file);
        roleRef.current = data.file.accessRole || "viewer";
        setRole(data.file.accessRole || "viewer");
        setVersions(data.versions || []);
        setComments(data.comments || []);
        setLastSavedAt(data.file.updatedAt || null);
        if (!authToken) {
          editor.commands.setContent(data.content || "<p></p>", false);
        }
        setIsEditorEmpty(editor.isEmpty);
        if (["owner", "editor"].includes(data.file.accessRole)) {
          window.requestAnimationFrame(() => editor.commands.focus("start"));
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Could not open document.");
        navigate(user ? "/" : "/login");
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [id, editor, linkToken, navigate, toast, user, authToken]);

  useEffect(() => {
    if (!editor || !authToken) return undefined;

    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", { auth: { token: authToken } });
    socketRef.current = socket;

    const handleLocalYjsUpdate = (update, origin) => {
      if (origin === "socket" || !["owner", "editor"].includes(roleRef.current)) return;
      socket.emit("yjs-update", {
        documentId: id,
        update: Array.from(update)
      });
    };

    const handleLocalAwarenessUpdate = ({ added, updated, removed }, origin) => {
      if (origin === "socket") return;
      const changedClients = added.concat(updated, removed);
      if (!changedClients.length) return;
      socket.emit("awareness-update", {
        documentId: id,
        update: Array.from(encodeAwarenessUpdate(awareness, changedClients))
      });
    };

    yDoc.on("update", handleLocalYjsUpdate);
    awareness.on("update", handleLocalAwarenessUpdate);
    editor.commands.updateUser({
      name: user?.name || user?.username || "Collaborator",
      color: user?.avatarColor || "#9d174d"
    });

    socket.on("connect", () => {
      socket.emit("join-document", { documentId: id });
    });

    socket.on("document-loaded", (payload) => {
      roleRef.current = payload.role;
      setRole(payload.role);
      setIsEditorEmpty(editor.isEmpty);
    });

    socket.on("yjs-state", ({ update, initialized, canSeed, content }) => {
      Y.applyUpdate(yDoc, toUint8Array(update), "socket");
      if (!initialized && canSeed && !seededYDocRef.current) {
        seededYDocRef.current = true;
        editor.commands.setContent(content || "<p></p>", true);
      }
      setIsEditorEmpty(editor.isEmpty);
    });

    socket.on("yjs-update", ({ update, senderSocketId }) => {
      if (senderSocketId === socket.id) return;
      Y.applyUpdate(yDoc, toUint8Array(update), "socket");
      setIsEditorEmpty(editor.isEmpty);
    });

    socket.on("awareness-update", ({ update, senderSocketId }) => {
      if (senderSocketId === socket.id) return;
      applyAwarenessUpdate(awareness, toUint8Array(update), "socket");
    });

    socket.on("presence-update", (nextPresence) => setPresence(nextPresence));
    socket.on("document-saved", (payload) => {
      setSaving(false);
      setLastSavedAt(payload.updatedAt);
    });
    socket.on("editor-error", (payload) => toast.error(payload.message || "Editor error."));

    const intervalId = setInterval(() => {
      if (["owner", "editor"].includes(roleRef.current)) {
        socket.emit("save-document", { documentId: id, content: editor.getHTML() });
        setSaving(true);
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
      if (["owner", "editor"].includes(roleRef.current)) {
        socket.emit("save-document", { documentId: id, content: editor.getHTML() });
      }
      awareness.setLocalState(null);
      socket.disconnect();
      awareness.off("update", handleLocalAwarenessUpdate);
      yDoc.off("update", handleLocalYjsUpdate);
      socketRef.current = null;
    };
  }, [id, editor, authToken, toast, user?._id, user?.name, user?.username, user?.avatarColor, yDoc, awareness]);

  const saveNow = async () => {
    if (!editor || !["owner", "editor"].includes(role)) return;
    setSaving(true);
    try {
      const content = editor.getHTML();
      await filesApi.saveDocument(id, { content });
      socketRef.current?.emit("save-document", { documentId: id, content });
      toast.success("Document saved to the cloud.");
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

  const handleAddComment = async ({ message, anchorText }) => {
    try {
      const { data } = await filesApi.addComment(id, { message, anchorText });
      setComments(data.comments || []);
      toast.success("Comment added.");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not add the comment.");
      return false;
    }
  };

  const handleResolveComment = async (commentId, resolved) => {
    try {
      const { data } = await filesApi.resolveComment(id, commentId, { resolved });
      setComments(data.comments || []);
      toast.success(resolved ? "Comment resolved." : "Comment reopened.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update the comment.");
    }
  };

  const handleRestoreVersion = async (versionId) => {
    try {
      const { data } = await filesApi.restoreVersion(id, versionId);
      editor?.commands.setContent(data.content || "<p></p>", true);
      setLastSavedAt(data.updatedAt);
      setShowVersions(false);
      toast.success("Version restored.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not restore this version.");
    }
  };

  const runSlashCommand = (command) => {
    if (!editor) return;
    const { $from } = editor.state.selection;
    const start = $from.start();
    const end = $from.end();
    editor.chain().focus().deleteRange({ from: start, to: end }).run();
    if (command === "heading") editor.chain().focus().setHeading({ level: 1 }).run();
    if (command === "bulletList") editor.chain().focus().toggleBulletList().run();
    if (command === "quote") editor.chain().focus().toggleBlockquote().run();
    setSlashState({ open: false, query: "" });
  };

  const handleMenuAction = (action) => {
    if (!editor) return;
    if (action === "save") return saveNow();
    if (action === "history") return setShowVersions(true);
    if (action === "undo") return editor.chain().focus().undo().run();
    if (action === "redo") return editor.chain().focus().redo().run();
    if (action === "zoomIn") return setZoom((current) => Math.min(150, current + 10));
    if (action === "zoomOut") return setZoom((current) => Math.max(80, current - 10));
    if (action === "resetZoom") return setZoom(100);
    if (action === "comments") return setShowComments((current) => !current);
    if (action === "heading") return editor.chain().focus().setHeading({ level: 1 }).run();
    if (action === "bulletList") return editor.chain().focus().toggleBulletList().run();
    if (action === "quote") return editor.chain().focus().toggleBlockquote().run();
    if (action === "bold") return editor.chain().focus().toggleBold().run();
    if (action === "italic") return editor.chain().focus().toggleItalic().run();
    if (action === "underline") return editor.chain().focus().toggleUnderline().run();
    if (action === "clearMarks") return editor.chain().focus().unsetAllMarks().run();
  };

  const canEdit = ["owner", "editor"].includes(role);
  const canComment = ["owner", "editor", "commenter"].includes(role);
  const canManageAccess = role === "owner";
  const presenceLabel = useMemo(() => (authToken ? "live collaboration" : "shared link access"), [authToken]);
  const statusLabel = saving ? "Saving..." : lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Saved to cloud";
  const latestEditor = versions[0]?.editedBy?.name || file?.lastEditedBy?.name || file?.owner?.name || "Unknown";

  if (loading || !editor) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7eff4]"><Spinner label="Loading document" /></div>;
  }

  return (
    <div className="premium-aurora min-h-screen bg-[#f7eff4] px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1720px] space-y-4">
        <header className="motion-card reveal-up rounded-[24px] border border-[#eadfe6] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(60,64,67,0.15)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <button className="grid h-11 w-11 place-items-center rounded-full text-[#6f6471] transition hover:bg-[#f7eff4]" onClick={() => navigate(user ? "/" : "/login")}>
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f5d0de] text-[#9d174d]">
                <DocumentTextIcon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-[20px] font-medium tracking-tight text-[#202124]">{file?.filename}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[#6f6471]">
                  <span className="inline-flex items-center gap-1.5">{canEdit ? <LockOpenIcon className="h-4 w-4" /> : <LockClosedIcon className="h-4 w-4" />} {role}</span>
                  <span className="inline-flex items-center gap-1.5"><UserGroupIcon className="h-4 w-4" /> {presenceLabel}</span>
                  <span className="inline-flex items-center gap-1.5"><ChatBubbleLeftEllipsisIcon className="h-4 w-4" /> Last edited by {latestEditor}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              {authToken ? <PresenceBar presence={presence} /> : null}
              <span className="inline-flex items-center rounded-full border border-[#d7dce1] bg-[#f8f9fa] px-4 py-2 text-sm text-[#4b3744]">{statusLabel}</span>
              <Button onClick={saveNow} loading={saving} className="gap-2 bg-[#9d174d] hover:bg-[#821843]" disabled={!canEdit}><CloudArrowUpIcon className="h-4 w-4" /> Save</Button>
              <div className="relative">
                <button className="grid h-10 w-10 place-items-center rounded-full border border-[#e4d5de] bg-white text-[#6f6471] transition hover:bg-[#f8f9fa]" onClick={() => setShowMenu((current) => !current)}>
                  <EllipsisVerticalIcon className="h-5 w-5" />
                </button>
                {showMenu ? (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[220px] rounded-2xl border border-[#eadfe6] bg-white p-2 shadow-[0_4px_12px_rgba(60,64,67,0.18)]">
                    <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#202124] hover:bg-[#f7eff4]" onClick={() => { setShowMenu(false); setShowVersions(true); }}><ArrowPathIcon className="h-4 w-4" /> Version history</button>
                    <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#202124] hover:bg-[#f7eff4]" onClick={() => { setShowMenu(false); setShowComments((current) => !current); }}><ChatBubbleLeftEllipsisIcon className="h-4 w-4" /> Comments</button>
                    {canManageAccess ? <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#202124] hover:bg-[#f7eff4]" onClick={() => { setShowMenu(false); setShowShare(true); }}><UserGroupIcon className="h-4 w-4" /> Manage access</button> : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <DocsMenuBar onAction={handleMenuAction} />
        <EditorToolbar editor={editor} disabled={!canEdit} zoom={zoom} setZoom={setZoom} onOpenVersions={() => setShowVersions(true)} onManageAccess={() => setShowShare(true)} onToggleComments={() => setShowComments((current) => !current)} canManageAccess={canManageAccess} showComments={showComments} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="motion-card relative rounded-[24px] border border-[#eadfe6] bg-[#f3eaf0] px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] lg:px-8">
            <div className="mx-auto max-w-[960px]">
              <div className="mb-3 overflow-hidden rounded-t-[14px] border border-[#d7dce1] border-b-0 bg-[#f8f9fa] shadow-[0_1px_1px_rgba(60,64,67,0.08)]">
                <div className="grid grid-cols-8 gap-0 border-b border-[#e1e6ed] px-6 py-2 text-[11px] uppercase tracking-[0.16em] text-[#7a828d]">
                  {Array.from({ length: 8 }).map((_, index) => <span key={index}>{(index + 1) * 10}</span>)}
                </div>
                <div className="px-6 py-2 text-xs text-[#6f6471]">Type <span className="font-medium text-[#202124]">/</span> for quick insert commands. Rich comments are available in the side panel for commenters and editors.</div>
              </div>
              <div className="docs-page relative mx-auto min-h-[78vh] rounded-b-[4px] bg-white px-[72px] py-[64px]" style={{ zoom: `${zoom}%` }}>
                {slashState.open ? <SlashMenu open={slashState.open} query={slashState.query} onSelect={runSlashCommand} /> : null}
                {isEditorEmpty ? <div className="docs-placeholder">Start typing your document...</div> : null}
                <div className="collab-editor" onClick={() => (canEdit || canComment) && editor.commands.focus()}>
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>
          </section>

          <CommentPanel open={showComments} comments={comments} canComment={canComment} selectedText={selectedText} onAddComment={handleAddComment} onResolveComment={handleResolveComment} />
        </div>
      </div>

      <Modal open={showVersions} onClose={() => setShowVersions(false)} title="Version history" description="Recent saves are available here without cluttering the main editing surface." sizeClassName="max-w-xl" bodyClassName="overflow-y-auto pr-1">
        <div className="space-y-3 pb-1">
          {versions.length ? versions.map((version) => (
            <div key={version._id} className="rounded-2xl border border-[#e7ecf4] bg-[#fcf8fb] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#202124]">{version.editedBy?.name || "Unknown user"}</p>
                  <p className="mt-1 text-xs text-[#6f6471]">{new Date(version.createdAt).toLocaleString()}</p>
                </div>
                {canEdit ? <Button variant="surface" onClick={() => handleRestoreVersion(version._id)}>Restore</Button> : null}
              </div>
            </div>
          )) : <p className="text-sm text-[#6f6471]">No saved versions yet.</p>}
        </div>
      </Modal>

      <ShareModal open={showShare} onClose={() => setShowShare(false)} file={file} onSubmit={handleShare} onRemove={handleRemoveShare} onUpdateSettings={handleSharingSettings} onRevokeAll={handleRevokeAll} />
    </div>
  );
};






