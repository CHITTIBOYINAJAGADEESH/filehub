import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import FileIcon from "@/components/FileIcon";
import { Eye, Download, Trash2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const FileCard = ({ file, onDelete }) => {
  const [viewOpen, setViewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleView = async () => {
    if (file.is_text_note) {
      setViewOpen(true);
      return;
    }
    if (!file.storage_path) return;

    const { data, error } = await supabase.storage
      .from("user-files")
      .createSignedUrl(file.storage_path, 300);

    if (error || !data?.signedUrl) {
      toast.error("Failed to generate preview URL");
      return;
    }

    if (
      file.content_type?.startsWith("image/") ||
      file.content_type?.startsWith("video/") ||
      file.content_type?.startsWith("audio/")
    ) {
      setPreviewUrl(data.signedUrl);
      setViewOpen(true);
    } else {
      window.open(data.signedUrl, "_blank");
    }
  };

  const handleDownload = async () => {
    if (file.is_text_note) {
      const blob = new Blob([file.text_content || ""], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.file_name}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (!file.storage_path) return;

    const { data, error } = await supabase.storage
      .from("user-files")
      .createSignedUrl(file.storage_path, 60);

    if (error || !data?.signedUrl) {
      toast.error("Download failed");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async () => {
    setDeleting(true);
    if (file.storage_path) {
      await supabase.storage.from("user-files").remove([file.storage_path]);
    }
    const { error } = await supabase.from("files").delete().eq("id", file.id);
    if (error) {
      toast.error("Delete failed");
      setDeleting(false);
      return;
    }
    toast.success("File deleted");
    onDelete();
  };

  return (
    <>
      <div className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-vault-surface-hover">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
          {file.is_text_note ? (
            <StickyNote className="h-6 w-6 text-primary" />
          ) : (
            <FileIcon fileType={file.file_type} className="h-6 w-6" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">
            {file.file_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {file.is_text_note ? "Text Note" : file.file_type.toUpperCase()} ·{" "}
            {formatSize(file.file_size)} ·{" "}
            {new Date(file.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" onClick={handleView} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={deleting}
            title="Delete"
            className="hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle>{file.file_name}</DialogTitle>
          </DialogHeader>
          {file.is_text_note ? (
            <div className="whitespace-pre-wrap rounded-lg bg-secondary p-4 text-sm text-foreground">
              {file.text_content}
            </div>
          ) : previewUrl && viewOpen ? (
            file.content_type?.startsWith("video/") ? (
              <video
                src={previewUrl}
                controls
                className="mx-auto max-h-[60vh] w-full rounded-lg object-contain"
              />
            ) : file.content_type?.startsWith("audio/") ? (
              <audio
                src={previewUrl}
                controls
                className="mx-auto w-full py-4"
              />
            ) : (
              <img
                src={previewUrl}
                alt={file.file_name}
                className="mx-auto max-h-[60vh] rounded-lg object-contain"
              />
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileCard;
