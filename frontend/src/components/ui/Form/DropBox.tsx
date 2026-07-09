"use client";

import { useRef, useState, type DragEvent } from "react";
import { Upload, File as FileIcon } from "lucide-react";

export default function DropBox() {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={openFileDialog}
      className="
        border-2 border-dashed border-blue-400 dark:border-blue-500
        rounded-xl p-6 text-center cursor-pointer select-none
        hover:bg-blue-50 dark:hover:bg-neutral-800 transition
        flex flex-col items-center justify-center gap-3
      "
    >
      {/* hidden input file */}
      <input
        type="file"
        ref={fileInputRef}
        hidden
        onChange={handleFileSelect}
      />

      {!file ? (
        <>
          <Upload className="w-10 h-10 opacity-70" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Drag & Drop file here, or click to browse
          </p>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <FileIcon className="w-6 h-6 text-green-600" />
          <span className="text-sm font-medium">{file.name}</span>
        </div>
      )}
    </div>
  );
}
