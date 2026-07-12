import {
  FileImage,
  FileText,
  FileSpreadsheet,
  FileArchive,
  File,
  FileType2,
  StickyNote,
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
