import {
  FileImage,
  FileText,
  FileSpreadsheet,
  FileArchive,
  File,
  FileType2,
  StickyNote,
  FileVideo,
  FileAudio,
} from "lucide-react";

const FileIcon = ({ fileType, className = "h-8 w-8" }) => {
  const type = fileType.toLowerCase();

  if (
    ["jpg", "jpeg", "png", "gif", "webp", "svg"].some((ext) =>
      type.includes(ext),
    )
  ) {
    return <FileImage className={`${className} text-primary`} />;
  }
  if (
    ["mp4", "webm", "ogg", "mov", "avi", "mkv", "wmv", "flv", "3gp"].some((ext) =>
      type.includes(ext),
    )
  ) {
    return <FileVideo className={`${className} text-purple-400`} />;
  }
  if (
    ["mp3", "wav", "aac", "flac", "m4a", "wma", "amr", "ape"].some((ext) =>
      type.includes(ext),
    )
  ) {
    return <FileAudio className={`${className} text-pink-400`} />;
  }
  if (type.includes("pdf")) {
    return <FileText className={`${className} text-destructive`} />;
  }
  if (["doc", "docx"].some((ext) => type.includes(ext))) {
    return <FileType2 className={`${className} text-blue-400`} />;
  }
  if (["xls", "xlsx", "csv"].some((ext) => type.includes(ext))) {
    return <FileSpreadsheet className={`${className} text-green-400`} />;
  }
  if (["zip", "rar", "7z", "tar", "gz"].some((ext) => type.includes(ext))) {
    return <FileArchive className={`${className} text-yellow-400`} />;
  }
  if (type.includes("text") || type.includes("txt")) {
    return <StickyNote className={`${className} text-muted-foreground`} />;
  }
  return <File className={`${className} text-muted-foreground`} />;
};

export default FileIcon;
