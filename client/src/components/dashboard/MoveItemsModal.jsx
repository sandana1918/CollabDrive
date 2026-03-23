import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";

export const MoveItemsModal = ({ open, onClose, options, onSubmit, loading }) => {
  const [destination, setDestination] = useState("root");

  useEffect(() => {
    if (open) setDestination("root");
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Move items" description="Choose where the selected items should go.">
      <div className="space-y-4">
        <Select label="Destination" value={destination} onChange={setDestination} options={options} />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={() => onSubmit(destination === "root" ? null : destination)}>Move</Button>
        </div>
      </div>
    </Modal>
  );
};
