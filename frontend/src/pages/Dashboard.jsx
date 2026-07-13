import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UploadPanel from "@/components/UploadPanel";
import ProfilePopover from "@/components/ProfilePopover";
import FileCard from "@/components/FileCard";
import { Shield, Plus, FolderOpen, Search, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FILE_TYPE_FILTERS = [
  { label: "All Files", value: "all" },
  { label: "PDF", value: "pdf" },
  { label: "TXT", value: "txt" },
  { label: "JPG", value: "jpg" },
  { label: "JPEG", value: "jpeg" },
  { label: "PNG", value: "png" },
  { label: "CSV", value: "csv" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
  { label: "JS", value: "js" },
  { label: "Java", value: "java" },
  { label: "Python", value: "py" },
  { label: "ZIP", value: "zip" },
  { label: "DOCX", value: "docx" },
  { label: "XLS/XLSX", value: "xls" },
  { label: "JSON", value: "json" },
];

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");

  const fetchFiles = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setFiles(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesSearch = file.file_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesType =
        fileTypeFilter === "all" ||
        file.file_type.toLowerCase() === fileTypeFilter.toLowerCase() ||
        (fileTypeFilter === "xls" &&
          (file.file_type.toLowerCase() === "xls" ||
            file.file_type.toLowerCase() === "xlsx"));

      return matchesSearch && matchesType;
    });
  }, [files, searchQuery, fileTypeFilter]);

  const totalSize = files.reduce((acc, f) => acc + f.file_size, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-none items-center justify-between px-4 md:px-6 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                FileHub
              </h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProfilePopover />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-none px-4 md:px-6 pt-5 pb-8">
        {/* Stats bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-bold font-display text-foreground">
                {files.length}
              </p>
              <p className="text-xs text-muted-foreground">Files</p>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold font-display text-foreground">
                  {(totalSize / (1024 * 1024)).toFixed(1)} MB
                </p>
                <p className="text-xs text-muted-foreground">/ 500 MB</p>
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">Storage Used</p>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(100, (totalSize / (500 * 1024 * 1024)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
          <Button onClick={() => setShowUpload(!showUpload)}>
            <Plus className="mr-2 h-4 w-4" /> {showUpload ? "Close" : "Upload"}
          </Button>
        </div>

        {/* Upload panel */}
        {showUpload && (
          <div className="mb-6">
            <UploadPanel
              onUploadComplete={fetchFiles}
              onClose={() => setShowUpload(false)}
              currentStorageUsage={totalSize}
            />
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {FILE_TYPE_FILTERS.map((ft) => (
                <SelectItem key={ft.value} value={ft.value}>
                  {ft.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Files list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <h2 className="font-display text-xl font-semibold text-foreground">
              {files.length === 0 ? "No files yet" : "No matching files"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {files.length === 0
                ? "Upload your first file to get started"
                : "Try a different search or filter"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFiles.map((file) => (
              <FileCard key={file.id} file={file} onDelete={fetchFiles} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
