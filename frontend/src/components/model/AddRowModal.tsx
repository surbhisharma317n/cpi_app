import React from "react";
import AddModal from "./AddModel";


export type ColumnField = {
  accessorKey: string;
  header: string;
  inputType?: string;
};

type AddRowModalProps = {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnField[];
  onSave: (row: Record<string, any>) => void;
};

const AddRowModal: React.FC<AddRowModalProps> = ({
  isOpen,
  onClose,
  columns,
  onSave,
}) => {
  // Convert columns → fields expected by AddModal
  const fields = columns.map((col) => ({
    name: col.accessorKey,
    label: col.header,
    type: col.inputType || "text",
    required: true,
    placeholder: `Enter ${col.header}`,
  }));

  const handleSubmit = (formData: Record<string, string>) => {
    onSave(formData);
  };

  return (
    <AddModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      fields={fields}
      title="Add New Row"
    />
  );
};

export default AddRowModal;
