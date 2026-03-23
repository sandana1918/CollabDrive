import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

const roleOptions = [
  { value: "viewer", label: "Viewer" },
  { value: "commenter", label: "Commenter" },
  { value: "editor", label: "Editor" }
];

const visibilityOptions = [
  { value: "private", label: "Private" },
  { value: "link", label: "Anyone with link" },
  { value: "public", label: "Public view" }
];

export const ShareModal = ({ open, onClose, file, onSubmit, onRemove, onUpdateSettings, onRevokeAll }) => {
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState("private");
  const [linkEnabled, setLinkEnabled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setVisibility(file?.visibility || "private");
    setLinkEnabled(Boolean(file?.linkShare?.enabled));
    setCopied(false);
  }, [file, open]);

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
    if (!identifier.trim()) return;
    setLoading(true);
    const success = await onSubmit({ identifier: identifier.trim(), role });
    setLoading(false);
    if (success) setIdentifier("");
  };

  const handleSettingsUpdate = async () => {
    await onUpdateSettings({ visibility, linkEnabled, linkRole: "viewer" });
  };

  const handleCopy = async () => {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Share ${file?.filename || "file"}`} description="Invite teammates directly or configure read-only link/public access.">
      <div className="space-y-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input label="Username or email" placeholder="alex@team.dev" value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
          <Select label="Permission" value={role} onChange={setRole} options={roleOptions} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
            <Button type="submit" loading={loading}>Share</Button>
          </div>
        </form>

        <div className="space-y-4 rounded-3xl border border-[#edf1f6] bg-[#fcf8fb] p-4">
          <p className="text-sm font-semibold text-drive-text">Link and visibility</p>
          <Select label="Visibility" value={visibility} onChange={setVisibility} options={visibilityOptions} />
          <label className="flex items-center justify-between rounded-2xl border border-[#d7dce5] bg-white px-4 py-3 text-sm text-drive-text">
            <span>Enable share link</span>
            <input type="checkbox" checked={linkEnabled} onChange={(event) => setLinkEnabled(event.target.checked)} />
          </label>
          <div className="rounded-2xl border border-[#d7dce5] bg-white px-4 py-3 text-sm text-drive-subtext">
            Link and public access are read-only. Use direct sharing above for commenter or editor access.
          </div>
          {linkUrl ? (
            <div className="rounded-2xl border border-[#d7dce5] bg-white p-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-drive-subtext">Share link</p>
              <p className="mt-2 break-all text-sm text-drive-text">{linkUrl}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-drive-subtext">{copied ? "Copied to clipboard" : "Anyone with this link can open the file in view mode."}</span>
                <Button variant="surface" onClick={handleCopy}>{copied ? "Copied" : "Copy link"}</Button>
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
              <div key={entry.user._id} className="flex items-center justify-between rounded-2xl bg-[#fbf6f9] px-4 py-3 text-sm">
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

