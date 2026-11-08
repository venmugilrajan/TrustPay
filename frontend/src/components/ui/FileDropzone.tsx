import React, { useRef, useState } from "react";
import { UploadCloud, File, X } from "lucide-react";

export interface FileDropzoneProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  accept?: string;
  maxSizeMB?: number;
}

export default function FileDropzone({
  onFileSelect,
  selectedFile,
  accept = ".zip,.py,.js,.ts,.json,.pdf,.png,.jpg,.jpeg",
  maxSizeMB = 20,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {selectedFile ? (
        <div className="flex items-center justify-between p-3.5 bg-surface-subtle border border-border-strong rounded-btn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-surface flex items-center justify-center text-primary">
              <File className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-content-primary truncate max-w-xs sm:max-w-md">
                {selectedFile.name}
              </p>
              <p className="text-xs text-content-muted">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onFileSelect(null)}
            className="p-1 text-content-muted hover:text-danger rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-card cursor-pointer transition-colors ${
            isDragOver
              ? "border-primary bg-primary-subtle/40"
              : "border-border-subtle bg-surface hover:bg-cream-100"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-cream-200 flex items-center justify-center text-primary mb-2">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-content-primary">
            Drag & drop files here, or <span className="text-primary underline">browse</span>
          </p>
          <p className="mt-1 text-xs text-content-muted">
            ZIP, code, PDF, or screenshot (max {maxSizeMB}MB)
          </p>
        </div>
      )}
    </div>
  );
}
