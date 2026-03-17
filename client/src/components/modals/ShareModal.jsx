import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

export const ShareModal = ({ open, onClose, file, onSubmit, onRemove, onUpdateSettings, onRevokeAll }) => {
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState("private");
  const [linkEnabled, setLinkEnabled] = useState(false);
  const [linkRole, setLinkRole] = useState("viewer");

  useEffect(() => {
    setVisibility(file?.visibility || "private");
    setLinkEnabled(Boolean(file?.linkShare?.enabled));
    setLinkRole(file?.linkShare?.role || "viewer");
  }, [file]);

  const sharedUsers = useMemo(() => file?.sharedWith || [], [file]);
  const linkUrl = useMemo(() => {
    if (!file) return "";
    if (file.linkShare?.enabled && file.linkShare?.token) {
      return `${window.location.origin}/editor/${file.id}?linkToken=${file.linkShare.token}`;
    }
    if (file.visibility === "public") {
      return `${window.location.origin}/editor/${file.id}`;
    }
    return "";
  }, [file]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const success = await onSubmit({ identifier, role });
    setLoading(false);
    if (success) setIdentifier("");
  };

  const handleSettingsUpdate = async () => {
    await onUpdateSettings({ visibility, linkEnabled, linkRole });
  };

  const handleCopy = async () => {
    if (!linkUrl) return;
    await navigator.clipboard.writeText(linkUrl);
  };

  return (
    <Modal open={open} onClose={onClose} title={`Share ${file?.filename || "file"}`} description="Invite teammates or configure link/public access.">
      <div className="space-y-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input label="Username or email" placeholder="alex@team.dev" value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
          <label className="flex flex-col gap-2 text-sm font-medium text-drive-text">
            <span>Permission</span>
            <select className="rounded-2xl border border-[#d7dce5] bg-white px-4 py-3 text-sm outline-none" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="viewer">Viewer</option>
              <option value="commenter">Commenter</option>
              <option value="editor">Editor</option>
            </select>
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
            <Button type="submit" loading={loading}>Share</Button>
          </div>
        </form>

        <div className="space-y-4 rounded-3xl border border-[#edf1f6] bg-[#fafcff] p-4">
          <p className="text-sm font-semibold text-drive-text">Access controls</p>
          <label className="flex flex-col gap-2 text-sm font-medium text-drive-text">
            <span>Visibility</span>
            <select className="rounded-2xl border border-[#d7dce5] bg-white px-4 py-3 text-sm outline-none" value={visibility} onChange={(event) => setVisibility(event.target.value)}>
              <option value="private">Private</option>
              <option value="link">Anyone with link</option>
              <option value="public">Public view</option>
            </select>
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-[#d7dce5] bg-white px-4 py-3 text-sm text-drive-text">
            <span>Enable link sharing</span>
            <input type="checkbox" checked={linkEnabled} onChange={(event) => setLinkEnabled(event.target.checked)} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-drive-text">
            <span>Link role</span>
            <select className="rounded-2xl border border-[#d7dce5] bg-white px-4 py-3 text-sm outline-none" value={linkRole} onChange={(event) => setLinkRole(event.target.value)} disabled={!linkEnabled}>
              <option value="viewer">Viewer</option>
              <option value="commenter">Commenter</option>
              <option value="editor">Editor</option>
            </select>
          </label>
          {linkUrl ? (
            <div className="rounded-2xl border border-[#d7dce5] bg-white p-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-drive-subtext">Share link</p>
              <p className="mt-2 break-all text-sm text-drive-text">{linkUrl}</p>
              <div className="mt-3 flex justify-end">
                <Button variant="surface" onClick={handleCopy}>Copy link</Button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="danger" onClick={onRevokeAll}>Revoke all access</Button>
            <Button onClick={handleSettingsUpdate}>Save sharing settings</Button>
          </div>
        </div>

        <div className="space-y-3 border-t border-[#edf1f6] pt-4">
          <p className="text-sm font-semibold text-drive-text">People with access</p>
          {sharedUsers.length ? (
            sharedUsers.map((entry) => (
              <div key={entry.user._id} className="flex items-center justify-between rounded-2xl bg-[#f8fbff] px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-drive-text">{entry.user.name}</p>
                  <p className="text-drive-subtext">@{entry.user.username} • {entry.role}</p>
                </div>
                <Button variant="ghost" onClick={() => onRemove(entry.user._id)}>Remove</Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-drive-subtext">Only you have access right now.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};
