// components/ui2/accordion/types.ts
export interface AccordionItemData {
  value: string;
  title: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

export interface AccordionGroupProps {
  items: AccordionItemData[];
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  variant?: "default" | "bordered" | "ghost" | "shadow";
  size?: "sm" | "md" | "lg";
  iconPosition?: "left" | "right";
  iconVariant?: "chevron" | "plus" | "plus-circle" | "arrow";
  collapsible?: boolean;
  animated?: boolean;
  keepMounted?: boolean;
  className?: string;
  onValueChange?: (value: string | string[]) => void;
}
