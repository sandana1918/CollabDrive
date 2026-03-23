import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

export const UploadModal = ({ open, onClose, onSubmit }) => {
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const resetState = () => {
    setFile(null);
    setFilename("");
    setDragActive(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    const success = await onSubmit({ file, filename });
    setLoading(false);

    if (success) {
      resetState();
      onClose();
    }
  };

  const pickFile = (nextFile) => {
    if (!nextFile) return;
    setFile(nextFile);
    if (!filename) {
      setFilename(nextFile.name);
    }
  };

  return (
    <Modal open={open} onClose={() => { resetState(); onClose(); }} title="Upload asset" description="Bring files into your collaborative space.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input label="Display name" placeholder="Quarterly roadmap.pdf" value={filename} onChange={(event) => setFilename(event.target.value)} />
        <label
          className={`flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed px-6 py-10 text-center text-sm transition ${dragActive ? "border-[#9d174d] bg-[#fae7ef] text-drive-blue" : "border-slate-300 bg-slate-50 text-slate-500 hover:border-[#e9b8c9] hover:bg-[#fbf2f7]"}`}
          onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
          onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
          onDragLeave={(event) => { event.preventDefault(); setDragActive(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            pickFile(event.dataTransfer.files?.[0] || null);
          }}
        >
          <input className="hidden" type="file" onChange={(event) => pickFile(event.target.files?.[0] || null)} />
          <span className="font-medium text-slate-700">Drag and drop or browse</span>
          <span className="mt-1">{file ? file.name : "Files up to 20MB supported"}</span>
        </label>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => { resetState(); onClose(); }}>Cancel</Button>
          <Button type="submit" loading={loading} disabled={!file}>Upload</Button>
        </div>
      </form>
    </Modal>
  );
};



