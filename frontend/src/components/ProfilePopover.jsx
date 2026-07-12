import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Camera, Save, Lock, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ProfilePopover = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setDisplayName(data.display_name || "");
        setAvatarUrl(data.avatar_url);
      } else {
        setDisplayName(user.email?.split("@")[0] || "");
        await supabase.from("profiles").insert({
          user_id: user.id,
          display_name: user.email?.split("@")[0] || "",
        });
      }
    };
    fetchProfile();
  }, [user]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar must be under 2MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", user.id);
    setAvatarUrl(publicUrl);
    setUploading(false);
    toast.success("Avatar updated!");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("user_id", user.id);
    setSaving(false);
    error ? toast.error("Failed to save") : toast.success("Profile updated!");
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingPassword(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated!");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/login");
  };

  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "?";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-transform hover:scale-105">
          <Avatar className="h-9 w-9 border-2 border-border cursor-pointer">
            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4 space-y-4">
        {/* Avatar & Name header */}
        <div className="flex items-center gap-3">
          <div className="relative group shrink-0">
            <Avatar className="h-14 w-14 border-2 border-border">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Camera className="h-4 w-4 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground truncate">
              {displayName || "No name"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
            {uploading && (
              <p className="text-xs text-primary mt-0.5">Uploading...</p>
            )}
          </div>
        </div>

        {/* Display Name */}
        <div className="space-y-1.5">
          <Label
            htmlFor="popoverDisplayName"
            className="text-xs flex items-center gap-1.5"
          >
            <User className="h-3.5 w-3.5" /> Display Name
          </Label>
          <div className="flex gap-2">
            <Input
              id="popoverDisplayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="h-8 text-sm"
            />
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              size="sm"
              className="h-8 px-3 text-xs"
            >
              <Save className="mr-1 h-3.5 w-3.5" /> {saving ? "..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Update Password */}
        <div className="space-y-1.5 border-t border-border pt-3">
          <Label className="text-xs flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Update Password
          </Label>
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-8 text-sm"
          />
          <Button
            onClick={handleUpdatePassword}
            disabled={updatingPassword || !newPassword}
            variant="secondary"
            size="sm"
            className="w-full h-8 text-xs"
          >
            {updatingPassword ? "Updating..." : "Update Password"}
          </Button>
        </div>

        {/* Logout */}
        <div className="border-t border-border pt-3">
          <Button
            variant="destructive"
            onClick={handleSignOut}
            size="sm"
            className="w-full h-8 text-xs"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ProfilePopover;
