// Select.tsx
import React, { type ReactNode, useState, useContext, createContext } from "react";

// Context to share state between subcomponents
interface SelectContextProps {
  selected: string | null;
  setSelected: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextProps | undefined>(undefined);

interface SelectProps {
  children: ReactNode;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({ children, value, onChange }) => {
  const [selected, setSelected] = useState<string | null>(value || null);
  const [open, setOpen] = useState(false);

  const handleSelect = (val: string) => {
    setSelected(val);
    onChange?.(val);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ selected, setSelected: handleSelect, open, setOpen }}>
      <div className="relative w-60">{children}</div>
    </SelectContext.Provider>
  );
};

// Trigger
export const SelectTrigger: React.FC<{ children: ReactNode }> = ({ children }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within a Select");

  const { open, setOpen } = context;

  return (
    <div
      onClick={() => setOpen(!open)}
      className="border rounded-xl px-4 py-2 cursor-pointer flex justify-between items-center bg-white"
    >
      {children}
      <span className="ml-2">▾</span>
    </div>
  );
};

// Value
export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within a Select");

  const { selected } = context;

  return <span>{selected || placeholder || "Select..."}</span>;
};

// Content
export const SelectContent: React.FC<{ children: ReactNode }> = ({ children }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectContent must be used within a Select");

  const { open } = context;

  if (!open) return null;

  return (
    <div className="absolute mt-1 w-full bg-white border rounded-xl shadow-lg z-10">
      {children}
    </div>
  );
};

// Item
export const SelectItem: React.FC<{ value: string; children: ReactNode }> = ({
  value,
  children,
}) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used within a Select");

  const { setSelected } = context;

  return (
    <div
      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
      onClick={() => setSelected(value)}
    >
      {children}
    </div>
  );
};
