import * as React from "react";
import { cn } from "../../lib/utils";

// Table Context for advanced features
interface TableContextValue {
  variant?: "default" | "bordered" | "striped" | "compact";
  size?: "sm" | "md" | "lg";
  hoverable?: boolean;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onRowSelect?: (id: string) => void;
}

const TableContext = React.createContext<TableContextValue>({});

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  variant?: "default" | "bordered" | "striped" | "compact";
  size?: "sm" | "md" | "lg";
  hoverable?: boolean;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onRowSelect?: (id: string) => void;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({
    className,
    variant = "default",
    size = "md",
    hoverable = false,
    selectable = false,
    selectedRows = new Set(),
    onRowSelect,
    children,
    ...props
  }, ref) => {
    const contextValue = React.useMemo(() => ({
      variant,
      size,
      hoverable,
      selectable,
      selectedRows,
      onRowSelect,
    }), [variant, size, hoverable, selectable, selectedRows, onRowSelect]);

    return (
      <TableContext.Provider value={contextValue}>
        <div className="relative w-full overflow-auto">
          <table
            ref={ref}
            className={cn(
              "w-full caption-bottom text-sm",
              variant === "bordered" && "border border-gray-200",
              variant === "striped" && "divide-y divide-gray-200",
              variant === "compact" && "divide-y divide-gray-100",
              hoverable && "hover:bg-gray-50",
              className
            )}
            {...props}
          >
            {children}
          </table>
        </div>
      </TableContext.Provider>
    );
  }
);
Table.displayName = "Table";

// Table Header
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-gray-50 dark:bg-gray-800 [&_tr]:border-b [&_tr]:border-gray-200",
      className
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

// Table Body
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

// Table Footer
const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "bg-gray-50 dark:bg-gray-800 border-t border-gray-200 font-medium",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

// Table Row
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  rowId?: string;
  isSelected?: boolean;
  onClick?: React.MouseEventHandler<HTMLTableRowElement>; // ✅ FIXED
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, rowId, isSelected = false, onClick, ...props }, ref) => {
    const context = React.useContext(TableContext);

    const handleClick: React.MouseEventHandler<HTMLTableRowElement> = (e) => {
      if (context.selectable && rowId && context.onRowSelect) {
        context.onRowSelect(rowId);
      }
      onClick?.(e); // ✅ valid now
    };

    return (
      <tr
        ref={ref}
        className={cn(
          "border-b border-gray-200 transition-colors",
          context.hoverable && "hover:bg-gray-50 dark:hover:bg-gray-800/50",
          context.selectable && rowId && "cursor-pointer",
          isSelected && "bg-blue-50 dark:bg-blue-900/20",
          context.size === "sm" && "h-8",
          context.size === "md" && "h-10",
          context.size === "lg" && "h-12",
          className
        )}
        onClick={handleClick}
        {...props}
      />
    );
  }
);
TableRow.displayName = "TableRow";

// Table Head Cell
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-3 text-left align-middle font-medium text-gray-500 dark:text-gray-400",
      "whitespace-nowrap [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

// Table Cell
const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-3 align-middle [&:has([role=checkbox])]:pr-0",
      "whitespace-nowrap overflow-hidden text-ellipsis",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

// Table Caption
const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-gray-500 dark:text-gray-400", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};