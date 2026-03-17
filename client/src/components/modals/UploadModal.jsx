import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

export const UploadModal = ({ open, onClose, onSubmit }) => {
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    const success = await onSubmit({ file, filename });
    setLoading(false);

    if (success) {
      setFile(null);
      setFilename("");
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload asset" description="Bring files into your collaborative space.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input label="Display name" placeholder="Quarterly roadmap.pdf" value={filename} onChange={(event) => setFilename(event.target.value)} />
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500 transition hover:border-[#9dc0ff] hover:bg-[#f4f8ff]">
          <input className="hidden" type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          <span className="font-medium text-slate-700">Drag and drop or browse</span>
          <span className="mt-1">{file ? file.name : "Files up to 20MB supported"}</span>
        </label>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Upload</Button>
        </div>
      </form>
    </Modal>
  );
};
