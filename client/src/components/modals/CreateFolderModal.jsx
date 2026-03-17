import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

export const CreateFolderModal = ({ open, onClose, onSubmit }) => {
  const [filename, setFilename] = useState("New folder");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const success = await onSubmit({ filename });
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create folder" description="Organize your files into nested workspaces.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input label="Folder name" value={filename} onChange={(event) => setFilename(event.target.value)} />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create folder</Button>
        </div>
      </form>
    </Modal>
  );
};
