import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/html",
  "text/css",
  "text/javascript",
  "application/javascript",
  "text/x-java-source",
  "text/x-java",
  "text/x-python",
  "application/x-python-code",
  "text/csv",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
];

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_TEXT_WORDS = 5000;

const UploadPanel = ({ onUploadComplete, onClose }) => {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [textContent, setTextContent] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState("file");
  const [dragOver, setDragOver] = useState(false);

  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  }, []);

  const validateAndSetFile = (f) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error("Unsupported file type");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error("File exceeds 15MB limit");
      return;
    }
    setFile(f);
  };

  const getFileExtension = (name) =>
    name.split(".").pop()?.toLowerCase() || "unknown";

  const handleFileUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    setUploadProgress(10);

    const storagePath = `${user.id}/${Date.now()}_${file.name}`;

    setUploadProgress(30);
    const { error: storageError } = await supabase.storage
      .from("user-files")
      .upload(storagePath, file);

    if (storageError) {
      toast.error("Upload failed: " + storageError.message);
      setUploading(false);
      return;
    }

    setUploadProgress(70);
    const { error: dbError } = await supabase.from("files").insert({
      user_id: user.id,
      file_name: file.name,
      file_type: getFileExtension(file.name),
      file_size: file.size,
      storage_path: storagePath,
      content_type: file.type,
      is_text_note: false,
    });

    if (dbError) {
      toast.error("Failed to save file metadata");
      setUploading(false);
      return;
    }

    setUploadProgress(100);
    toast.success("File uploaded successfully!");
    setFile(null);
    setUploading(false);
    setUploadProgress(0);
    onUploadComplete();
  };

  const handleTextSave = async (andClose) => {
    if (!textContent.trim() || !textTitle.trim() || !user) return;
    if (wordCount > MAX_TEXT_WORDS) {
      toast.error(`Text exceeds ${MAX_TEXT_WORDS} word limit`);
      return;
    }
    setUploading(true);

    const { error } = await supabase.from("files").insert({
      user_id: user.id,
      file_name: textTitle.trim(),
      file_type: "text-note",
      file_size: new Blob([textContent]).size,
      is_text_note: true,
      text_content: textContent,
      content_type: "text/plain",
    });

    if (error) {
      toast.error("Failed to save note");
      setUploading(false);
      return;
    }

    toast.success("Note saved!");
    setTextContent("");
    setTextTitle("");
    setUploading(false);
    onUploadComplete();
    if (andClose && onClose) onClose();
  };

  const handleRefresh = () => {
    setFile(null);
    setTextContent("");
    setTextTitle("");
    setUploadProgress(0);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 animate-slide-up">
      {/* Mode tabs */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={mode === "file" ? "default" : "secondary"}
          size="sm"
          onClick={() => setMode("file")}
        >
          <Upload className="mr-2 h-4 w-4" /> Upload File
        </Button>
        <Button
          variant={mode === "text" ? "default" : "secondary"}
          size="sm"
          onClick={() => setMode("text")}
        >
          <FileText className="mr-2 h-4 w-4" /> Text Note
        </Button>
      </div>

      {mode === "file" ? (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground"
            }`}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop or click to upload
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Max 15MB · Images, PDF, Docs, Excel, Text, Code, CSV, JSON, Zip
            </p>
          </div>
          <input
            id="file-input"
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.java,.py,.html,.css,.js,.csv,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) validateAndSetFile(f);
            }}
          />

          {file && (
            <div className="flex items-center gap-3 rounded-lg bg-secondary p-3">
              <span className="flex-1 truncate text-sm text-foreground">
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <button
                onClick={() => setFile(null)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {uploadProgress > 0 && (
            <Progress value={uploadProgress} className="h-2" />
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleFileUpload}
              disabled={!file || uploading}
              className="flex-1"
            >
              <Save className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            <Button variant="secondary" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text-title">Title</Label>
            <Input
              id="text-title"
              placeholder="Note title"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="text-content">Content</Label>
              <span
                className={`text-xs ${wordCount > MAX_TEXT_WORDS ? "text-destructive" : "text-muted-foreground"}`}
              >
                {wordCount} / {MAX_TEXT_WORDS} words
              </span>
            </div>
            <Textarea
              id="text-content"
              placeholder="Write your text here..."
              rows={8}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleTextSave(false)}
              disabled={!textContent.trim() || !textTitle.trim() || uploading}
              className="flex-1"
            >
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleTextSave(true)}
              disabled={!textContent.trim() || !textTitle.trim() || uploading}
            >
              Save & Close
            </Button>
            <Button variant="secondary" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPanel;
