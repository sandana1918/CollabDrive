import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

const formatOptions = [
  { value: "richtext", label: "Rich text" },
  { value: "markdown", label: "Markdown" },
  { value: "plain", label: "Plain text" }
];

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
        <Select label="Format" value={documentFormat} onChange={setDocumentFormat} options={formatOptions} />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create</Button>
        </div>
      </form>
    </Modal>
  );
};
