// components/ui2/accordion/AccordionGroup.tsx
import React from "react";
import type { AccordionGroupProps } from "./types";
// import { Accordion } from "../accordion";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  AccordionHeader,
} from "../accordion";
// import { AccordionGroupProps } from "./types";

export const AccordionGroup: React.FC<AccordionGroupProps> = ({
  items,
  type = "single",
  defaultValue,
  variant = "default",
  size = "md",
  iconPosition = "right",
  iconVariant = "chevron",
  collapsible = false,
  animated = true,
  keepMounted = false,
  className,
  onValueChange,
}) => {
  return (
    <Accordion
      type={type}
      defaultValue={defaultValue}
      variant={variant}
      size={size}
      iconPosition={iconPosition}
      iconVariant={iconVariant}
      collapsible={collapsible}
      animated={animated}
      keepMounted={keepMounted}
      className={className}
      onValueChange={onValueChange}
    >
      {items.map((item) => (
        <AccordionItem
          key={item.value}
          value={item.value}
          disabled={item.disabled}
        >
          <AccordionTrigger
            showIcon={true}
            customIcon={item.icon}
            badge={item.badge}
          >
            <AccordionHeader>{item.title}</AccordionHeader>
          </AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};
