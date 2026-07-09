"use client";

import React, { useEffect, useRef, useState } from "react";

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: "top" | "bottom"; // Optional override
}

const TooltipWrapper: React.FC<TooltipProps> = ({ text, children, position }) => {
  const [visible, setVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<"top" | "bottom">(position || "top");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Auto-switch top/bottom if needed
  useEffect(() => {
    if (!visible || position) return;

    const tooltip = tooltipRef.current;
    const wrapper = wrapperRef.current;
    if (!tooltip || !wrapper) return;

    const rect = tooltip.getBoundingClientRect();
    

    if (rect.top < 0) setTooltipPos("bottom");
    else if (rect.bottom > window.innerHeight) setTooltipPos("top");
    else setTooltipPos("top"); // default
  }, [visible, position]);

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex"
      tabIndex={0}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      onTouchStart={() => setVisible((v) => !v)}
    >
      {children}

      <div
        ref={tooltipRef}
        role="tooltip"
        className={`absolute pointer-events-none 
          left-1/2 -translate-x-1/2 
          px-2 py-1 text-xs font-medium 
          text-white bg-gray-800 dark:bg-gray-700 
          rounded-md shadow-lg whitespace-nowrap z-50 
          opacity-0 scale-95 transition-all duration-150
          ${
            visible
              ? "opacity-100 scale-100"
              : "pointer-events-none opacity-0 scale-95"
          }
          ${tooltipPos === "top" ? "bottom-full mb-2" : "top-full mt-2"}
        `}
      >
        {text}
      </div>
    </div>
  );
};

export default TooltipWrapper;
