import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getGetCurrentUserQueryKey,
  useGetCurrentUser,
  useUpdateCurrentUser,
} from "@workspace/api-client-react";
import { User, Bell, Shield, LogOut, Camera, ImagePlus, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

type ProfileForm = {
  displayName: string;
  username: string;
  bio: string;
  location: string;
  avatarUrl: string;
  coverUrl: string;
};

const emptyProfile: ProfileForm = {
  displayName: "",
  username: "",
  bio: "",
  location: "",
  avatarUrl: "",
  coverUrl: "",
};

export default function Settings() {
  const { data: user } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateProfile = useUpdateCurrentUser();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({
      displayName: user.displayName,
      username: user.username,
      bio: user.bio,
      location: user.location,
      avatarUrl: user.avatarUrl,
      coverUrl: user.coverUrl ?? "",
    });
    setAvatarPreview(user.avatarUrl);
    setBannerPreview(user.coverUrl ?? "");
  }, [user]);

  const chooseImage = (file: File | undefined, purpose: "avatar" | "banner") => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast({ title: "Choose a JPG, PNG, WebP, or GIF image.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Images must be 10 MB or smaller.", variant: "destructive" });
      return;
    }

    const preview = URL.createObjectURL(file);
    if (purpose === "avatar") {
      setAvatarFile(file);
      setAvatarPreview(preview);
    } else {
      setBannerFile(file);
      setBannerPreview(preview);
    }
  };

  const uploadImage = async (file: File, purpose: "avatar" | "banner") => {
    const request = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        contentType: file.type,
        purpose,
      }),
    });
    const details = await request.json() as { uploadURL?: string; objectPath?: string; error?: string };
    if (!request.ok || !details.uploadURL || !details.objectPath) {
      throw new Error(details.error || `Could not prepare the ${purpose} upload.`);
    }

    const upload = await fetch(details.uploadURL, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!upload.ok) {
      throw new Error(`Could not upload the ${purpose} image.`);
    }

    return `/api/storage${details.objectPath}`;
  };

  const saveProfile = async () => {
    if (!profile.displayName.trim()) {
      toast({ title: "Display name is required.", variant: "destructive" });
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(profile.username.trim())) {
      toast({ title: "Username must be 3–30 letters, numbers, or underscores.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const [avatarUrl, coverUrl] = await Promise.all([
        avatarFile ? uploadImage(avatarFile, "avatar") : Promise.resolve(profile.avatarUrl),
        bannerFile ? uploadImage(bannerFile, "banner") : Promise.resolve(profile.coverUrl),
      ]);

      const updated = await updateProfile.mutateAsync({
        data: {
          displayName: profile.displayName.trim(),
          username: profile.username.trim(),
          bio: profile.bio.trim(),
          location: profile.location.trim(),
          avatarUrl,
          coverUrl,
        },
      });

      setProfile({
        displayName: updated.displayName,
        username: updated.username,
        bio: updated.bio,
        location: updated.location,
        avatarUrl: updated.avatarUrl,
        coverUrl: updated.coverUrl ?? "",
      });
      setAvatarFile(null);
      setBannerFile(null);
      setAvatarPreview(updated.avatarUrl);
      setBannerPreview(updated.coverUrl ?? "");
      queryClient.setQueryData(getGetCurrentUserQueryKey(), updated);
      await queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          typeof queryKey[0] === "string" && queryKey[0].startsWith("/api/users/"),
      });
      toast({ title: "Profile saved successfully." });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Profile settings could not be saved.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const setField = (field: keyof ProfileForm, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-20 glass-panel border-b border-white/10 p-4 md:px-6">
        <h2 className="font-display font-bold text-2xl text-white">System Settings</h2>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-3xl w-full">
        {/* Profile Settings */}
        <section className="mb-10">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-6 border-b border-white/5 pb-2">
            <User className="w-5 h-5 text-primary" /> Profile Configuration
          </h3>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">Profile Banner</Label>
              <div className="relative h-36 overflow-hidden rounded-2xl border border-white/10 bg-card">
                {bannerPreview ? (
                  <img src={bannerPreview} alt="Profile banner preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                    <span className="text-sm text-muted-foreground">Add a banner image</span>
                    <span className="text-xs text-muted-foreground">
                      Recommended banner size: <span className="text-white">1500 × 500 px</span>
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 rounded-full"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={isSaving}
                >
                  <ImagePlus className="w-4 h-4" />
                  {bannerFile ? "Change Banner File" : "Select Banner File"}
                </Button>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => chooseImage(event.target.files?.[0], "banner")}
                />
                {bannerFile && (
                  <p className="max-w-[300px] truncate text-xs text-primary">Selected: {bannerFile.name}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <Avatar className="w-20 h-20 border border-white/10">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback>{profile.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 rounded-full"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isSaving}
                >
                  <Camera className="w-4 h-4" />
                  {avatarFile ? "Change Avatar File" : "Select Avatar File"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Recommended avatar size: <span className="text-white">800 × 800 px</span>
                </p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => chooseImage(event.target.files?.[0], "avatar")}
                />
                {avatarFile && (
                  <p className="max-w-[250px] truncate text-xs text-primary">Selected: {avatarFile.name}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase text-xs tracking-wider">Display Name</Label>
                <Input
                  value={profile.displayName}
                  onChange={(event) => setField("displayName", event.target.value)}
                  maxLength={80}
                  className="bg-card border-white/10 h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase text-xs tracking-wider">Username</Label>
                <Input
                  value={profile.username}
                  onChange={(event) => setField("username", event.target.value)}
                  maxLength={30}
                  className="bg-card border-white/10 h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">Bio</Label>
              <Textarea
                value={profile.bio}
                onChange={(event) => setField("bio", event.target.value)}
                maxLength={280}
                className="bg-card border-white/10 min-h-[100px] rounded-xl resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">Location</Label>
              <Input
                value={profile.location}
                onChange={(event) => setField("location", event.target.value)}
                maxLength={120}
                className="bg-card border-white/10 h-12 rounded-xl max-w-sm"
              />
            </div>

            <Button
              type="button"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8"
              onClick={saveProfile}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? "Saving Profile..." : "Save Profile"}
            </Button>
          </div>
        </section>

        {/* Notifications */}
        <section className="mb-10">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-6 border-b border-white/5 pb-2">
            <Bell className="w-5 h-5 text-blue-400" /> Comm Alerts
          </h3>
          
          <div className="space-y-6 bg-card border border-white/5 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Receive alerts on your device</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Email Digests</p>
                <p className="text-sm text-muted-foreground">Daily summary of top blasts</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Mentions & Replies</p>
                <p className="text-sm text-muted-foreground">When someone engages with your blasts</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="mb-10">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-6 border-b border-white/5 pb-2">
            <Shield className="w-5 h-5 text-red-400" /> Security & Privacy
          </h3>
          
          <div className="space-y-4">
            <Button variant="outline" className="w-full justify-start h-12 border-white/10 hover:bg-white/5 text-white rounded-xl">
              Change Password
            </Button>
            <Button variant="outline" className="w-full justify-start h-12 border-white/10 hover:bg-white/5 text-white rounded-xl">
              Two-Factor Authentication (2FA)
            </Button>
            <Button variant="outline" className="w-full justify-start h-12 border-white/10 hover:bg-white/5 text-white rounded-xl">
              Manage Blocked Users
            </Button>
          </div>
        </section>

        <section className="border-t border-white/5 pt-8 mb-24 md:mb-8">
           <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl w-full sm:w-auto">
             <LogOut className="w-4 h-4 mr-2" /> Disconnect Session
           </Button>
        </section>
      </div>
    </div>
  );
}
