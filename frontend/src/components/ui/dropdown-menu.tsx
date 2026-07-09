"use client";

import React, { useState, useRef, useEffect, createContext, useContext } from "react";
import { FiChevronDown } from "react-icons/fi";
import { cn } from "../../lib/utils";

// Context to allow child items to close menu
const DropdownContext = createContext<{ closeMenu: () => void } | null>(null);

interface DropdownMenuProps {
  triggerLabel: string | React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  triggerLabel,
  children,
  align = "right",
  className,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <DropdownContext.Provider value={{ closeMenu }}>
      <div ref={menuRef} className={cn("relative inline-block text-left", className)}>
        {/* Trigger */}
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {triggerLabel}
          <FiChevronDown
            className={`transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
          />
        </button>

        {/* Dropdown content with fade/scale animation */}
        <div
          className={cn(
            "absolute z-50 mt-2 w-44 origin-top transition-all duration-200 ease-out",
            open
              ? "scale-100 opacity-100"
              : "pointer-events-none scale-95 opacity-0",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 p-1">
            {children}
          </div>
        </div>
      </div>
    </DropdownContext.Provider>
  );
};

// Dropdown item
interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  onClick,
  className,
}) => {
  const context = useContext(DropdownContext);

  const handleClick = () => {
    if (onClick) onClick();
    if (context) context.closeMenu(); // Auto close
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left cursor-pointer select-none rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
        className
      )}
    >
      {children}
    </button>
  );
};
DropdownMenuItem.displayName = "DropdownMenuItem";