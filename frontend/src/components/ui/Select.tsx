import React, { type ReactNode, useState, useContext, createContext } from "react";

// ---------------- Context ----------------
interface SelectContextProps {
  selected: string | null;
  setSelected: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextProps | undefined>(undefined);

interface SelectProps {
  children: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ children, value, onValueChange }) => {
  const [selected, setSelectedState] = useState<string | null>(value || null);
  const [open, setOpen] = useState(false);

  const setSelected = (val: string) => {
    setSelectedState(val);
    onValueChange?.(val); // trigger parent callback
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ selected, setSelected, open, setOpen }}>
      <div className="relative w-full md:w-60">{children}</div>
    </SelectContext.Provider>
  );
};

// ---------------- Trigger ----------------
export const SelectTrigger: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within a Select");

  const { open, setOpen } = context;

  return (
    <div
      onClick={() => setOpen(!open)}
      className={`h-11 px-4 flex justify-between items-center cursor-pointer
        bg-white border border-slate-200/80 rounded-xl shadow-sm
        text-sm font-medium text-slate-700
        hover:border-blue-400 hover:shadow-md
        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30
        transition-all duration-200 ease-in-out
        ${className || ""}`}
    >
      {children}
      <span
        className={`ml-2 text-slate-400 transition-transform duration-200 ${
          open ? "rotate-180" : "rotate-0"
        }`}
      >
        ▾
      </span>
    </div>
  );
};

// ---------------- Value ----------------
export const SelectValue: React.FC<{ placeholder?: string; className?: string }> = ({
  placeholder,
  className,
}) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within a Select");

  const { selected } = context;
  return (
    <span className={`truncate text-slate-700 ${className || ""}`}>
      {selected || placeholder || "Select..."}
    </span>
  );
};

// ---------------- Content ----------------
export const SelectContent: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectContent must be used within a Select");

  const { open } = context;
  if (!open) return null;

  return (
    <div
      className={`absolute mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-auto max-h-72
        ${className || ""}`}
    >
      {children}
    </div>
  );
};

// ---------------- Item ----------------
export const SelectItem: React.FC<{ value: string; children: ReactNode; className?: string }> = ({
  value,
  children,
  className,
}) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used within a Select");

  const { setSelected, selected } = context;

  const isSelected = selected === value;

  return (
    <div
      className={`px-4 py-2 text-sm cursor-pointer transition-colors
        hover:bg-blue-50 hover:text-blue-700
        ${isSelected ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"}
        ${className || ""}`}
      onClick={() => setSelected(value)}
    >
      {children}
    </div>
  );
};
