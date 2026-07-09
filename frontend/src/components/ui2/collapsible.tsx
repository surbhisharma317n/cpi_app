import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useState,
} from "react";

interface CollapsibleContextType {
  open: boolean;
  toggle: () => void;
}

const CollapsibleContext = createContext<CollapsibleContextType | null>(null);

interface CollapsibleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}



export const Collapsible: React.FC<CollapsibleProps> = ({
  open,
  onOpenChange,
  children,
  className,
}) => {
  const toggle = () => onOpenChange(!open);

  return (
    <CollapsibleContext.Provider value={{ open, toggle }}>
      <div className={className}>{children}</div>
    </CollapsibleContext.Provider>
  );
};

export const CollapsibleTrigger: React.FC<{
  children: React.ReactNode;
  className?: string; 
}> = ({ children, className }) => {
  const context = useContext(CollapsibleContext);
  if (!context) return null;

  return <div onClick={context.toggle} className={className}>{children}</div>;
};

export const CollapsibleContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const context = useContext(CollapsibleContext);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">(0);

  useEffect(() => {
    if (!contentRef.current) return;

    if (context?.open) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [context?.open]);

  return (
    <div
      style={{
        height,
        overflow: "hidden",
        transition: "height 300ms ease",
      }}
    >
      <div ref={contentRef} className={className}>
        {children}
      </div>
    </div>
  );
};
