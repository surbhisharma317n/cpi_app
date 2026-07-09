// components/ui/ExportSampleButton.tsx
import React from "react";
import { FiDownload } from "react-icons/fi";
import { Button } from "../ui2/button";
import { useToast } from "../../hooks/useToast";

interface ExportSampleButtonProps {
  data: Record<string, any>;
  fileName: string;
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

const ExportSampleButton: React.FC<ExportSampleButtonProps> = ({
  data,
  fileName,
  variant = "default",
  size = "default",
  className = "",
  children,
}) => {
  const { toast } = useToast();

  const handleExport = () => {
    try {
      // Convert data to CSV format
      const csvContent = Object.entries(data)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}\n${value.join(",")}`;
          } else if (typeof value === "object") {
            const headers = Object.keys(value).join(",");
            const values = Object.values(value).join(",");
            return `${key}\n${headers}\n${values}`;
          }
          return `${key},${value}`;
        })
        .join("\n\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${fileName}_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Sample templates downloaded as ${fileName}.csv`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export sample templates",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={className}>
   <Button
      variant={variant}
      size={size} // ✅ "icon" now valid
      onClick={handleExport}
      className="flex items-center gap-2"
    >
      <FiDownload className="w-4 h-4" />
      {children || "Export Sample"}
    </Button>
    </div>
  );

};

export default ExportSampleButton;
