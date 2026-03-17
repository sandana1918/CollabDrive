import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

export const NewDocumentModal = ({ open, onClose, onSubmit }) => {
  const [filename, setFilename] = useState("Untitled document");
  const [documentFormat, setDocumentFormat] = useState("richtext");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const success = await onSubmit({ filename, documentFormat });
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create document" description="Choose the editing experience for your new file.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input label="Document name" value={filename} onChange={(event) => setFilename(event.target.value)} />
        <label className="flex flex-col gap-2 text-sm font-medium text-drive-text">
          <span>Format</span>
          <select
            value={documentFormat}
            onChange={(event) => setDocumentFormat(event.target.value)}
            className="rounded-2xl border border-[#d7dce5] bg-white px-4 py-3 text-sm outline-none focus:border-drive-blue focus:ring-4 focus:ring-[#d7e5ff]"
          >
            <option value="richtext">Rich text</option>
            <option value="markdown">Markdown</option>
            <option value="plain">Plain text</option>
          </select>
        </label>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create</Button>
        </div>
      </form>
    </Modal>
  );
};
