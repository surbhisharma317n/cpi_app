// components/ui2/table/utils.ts
export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    success: "text-green-600 bg-green-100",
    error: "text-red-600 bg-red-100",
    warning: "text-yellow-600 bg-yellow-100",
    uploading: "text-blue-600 bg-blue-100",
    validating: "text-blue-600 bg-blue-100",
    pending: "text-gray-600 bg-gray-100",
  };
  return colors[status] || colors.pending;
}
