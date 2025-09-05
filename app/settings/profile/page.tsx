"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";

export default function EditProfile() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const currentUser = useQuery(api.profiles.getCurrentUserProfile);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    bio: "",
    location: "",
    website: "",
    avatarUrl: "",
    bannerUrl: "",
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // File upload states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Redirect if not authenticated
  if (!isAuthenticated && !isLoading) {
    router.push("/");
  }

  // Initialize form data when profile loads
  useEffect(() => {
    if (currentUser) {
      setFormData({
        username: currentUser.username || "",
        displayName: currentUser.displayName || "",
        bio: currentUser.bio || "",
        location: currentUser.location || "",
        website: currentUser.website || "",
        avatarUrl: currentUser.avatarUrl || "",
        bannerUrl: currentUser.bannerUrl || "",
      });
      setAvatarPreview(currentUser.avatarUrl || "");
      setBannerPreview(currentUser.bannerUrl || "");
    }
  }, [currentUser]);

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
        <p className="animate-pulse text-sm">[ LOADING... ]</p>
      </div>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setMessage(null); // Clear any existing message
  };

  const handleFileUpload = async (file: File, type: 'avatar' | 'banner'): Promise<string> => {
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error("Upload failed");
      }
      
      const { storageId } = await result.json();
      return storageId;
    } catch (error) {
      console.error(`${type} upload failed:`, error);
      throw error;
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage({ type: "error", text: "Please select an image file" });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: "Image must be smaller than 5MB" });
        return;
      }
      
      setAvatarFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setMessage(null);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage({ type: "error", text: "Please select an image file" });
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: "error", text: "Banner image must be smaller than 10MB" });
        return;
      }
      
      setBannerFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setBannerPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);

    try {
      // Validate required fields
      if (!formData.displayName.trim()) {
        throw new Error("Display name is required");
      }

      if (!formData.username.trim()) {
        throw new Error("Username is required");
      }

      // Validate username format
      const username = formData.username.toLowerCase().trim();
      if (!username.match(/^[a-z0-9_]+$/)) {
        throw new Error("Username can only contain letters, numbers, and underscores");
      }

      if (username.length < 3) {
        throw new Error("Username must be at least 3 characters long");
      }

      if (username.length > 15) {
        throw new Error("Username must be 15 characters or less");
      }

      // Validate website URL format if provided
      if (formData.website && !isValidUrl(formData.website)) {
        throw new Error("Please enter a valid website URL");
      }

      // Handle file uploads
      let avatarStorageId: string | undefined;
      let bannerStorageId: string | undefined;

      if (avatarFile) {
        setIsUploadingAvatar(true);
        avatarStorageId = await handleFileUpload(avatarFile, 'avatar');
        setIsUploadingAvatar(false);
      }

      if (bannerFile) {
        setIsUploadingBanner(true);
        bannerStorageId = await handleFileUpload(bannerFile, 'banner');
        setIsUploadingBanner(false);
      }

      const result = await updateProfile({
        username: formData.username.trim(),
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim() || undefined,
        location: formData.location.trim() || undefined,
        website: formData.website.trim() || undefined,
        avatarUrl: !avatarFile ? (formData.avatarUrl.trim() || undefined) : undefined,
        bannerUrl: !bannerFile ? (formData.bannerUrl.trim() || undefined) : undefined,
        avatarStorageId,
        bannerStorageId,
      });

      setMessage({ type: "success", text: "Profile updated successfully!" });
      
      // Redirect to the new username URL after a short delay
      setTimeout(() => {
        router.push(`/profile/${result.newUsername || formData.username}`);
      }, 1500);

    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to update profile" });
    } finally {
      setIsUpdating(false);
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <div className="max-w-7xl mx-auto flex">
        <Sidebar />
        
        <main className="flex-1 border-r border-foreground/20 max-w-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-foreground/20 p-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="hover:bg-foreground/10 p-2 -m-2 transition-colors"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-bold">EDIT PROFILE</h1>
                <p className="text-xs text-foreground/60">@{currentUser.username}</p>
              </div>
            </div>
          </div>

          {/* Profile Edit Form */}
          <div className="p-6">
            {/* Profile Preview */}
            <div className="mb-8 border border-foreground/20 p-4">
              <h2 className="text-sm font-bold mb-4 text-foreground/60">PREVIEW</h2>
              
              {/* Banner Preview */}
              <div className="relative h-32 bg-gradient-to-b from-foreground/20 to-background border border-foreground/20 mb-4 overflow-hidden">
                {bannerPreview && (
                  <img 
                    src={bannerPreview} 
                    alt="Banner preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                {isUploadingBanner && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <p className="text-sm animate-pulse">[ UPLOADING... ]</p>
                  </div>
                )}
              </div>

              {/* Avatar and Info Preview */}
              <div className="flex items-start gap-4">
                <div className="relative w-16 h-16 border border-foreground/40 bg-foreground/10 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Avatar preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    currentUser.username[0].toUpperCase()
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <p className="text-xs animate-pulse">...</p>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{formData.displayName || "Display Name"}</h3>
                  <p className="text-sm text-foreground/60">@{formData.username || "username"}</p>
                  {formData.bio && <p className="text-sm mt-2">{formData.bio}</p>}
                  <div className="flex gap-4 text-xs text-foreground/60 mt-2">
                    {formData.location && <span>📍 {formData.location}</span>}
                    {formData.website && <span>🔗 {formData.website}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-bold">
                  USERNAME *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-foreground/60 text-sm">@</span>
                  <input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value.toLowerCase())}
                    className="w-full pl-8 pr-3 py-2 bg-transparent border border-foreground/40 focus:border-foreground outline-none text-sm"
                    placeholder="your_username"
                    pattern="[a-z0-9_]+"
                    minLength={3}
                    maxLength={15}
                    required
                  />
                </div>
                <div className="flex justify-between text-xs text-foreground/60">
                  <span>Only letters, numbers, and underscores</span>
                  <span>{formData.username.length}/15</span>
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <label htmlFor="displayName" className="block text-sm font-bold">
                  DISPLAY NAME *
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange("displayName", e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-foreground/40 focus:border-foreground outline-none text-sm"
                  placeholder="Your display name"
                  maxLength={50}
                  required
                />
                <div className="text-xs text-foreground/60 text-right">
                  {formData.displayName.length}/50
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label htmlFor="bio" className="block text-sm font-bold">
                  BIO
                </label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-foreground/40 focus:border-foreground outline-none text-sm resize-none"
                  placeholder="Tell people about yourself"
                  rows={4}
                  maxLength={160}
                />
                <div className="text-xs text-foreground/60 text-right">
                  {formData.bio.length}/160
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label htmlFor="location" className="block text-sm font-bold">
                  LOCATION
                </label>
                <input
                  id="location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-foreground/40 focus:border-foreground outline-none text-sm"
                  placeholder="Where are you located?"
                  maxLength={30}
                />
              </div>

              {/* Website */}
              <div className="space-y-2">
                <label htmlFor="website" className="block text-sm font-bold">
                  WEBSITE
                </label>
                <input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-foreground/40 focus:border-foreground outline-none text-sm"
                  placeholder="https://your-website.com"
                />
              </div>

              {/* Avatar Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-bold">
                  PROFILE PICTURE
                </label>
                <div className="flex gap-4">
                  <input
                    id="avatarFile"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="avatarFile"
                    className="px-4 py-2 border border-foreground/40 text-sm hover:bg-foreground/10 transition-colors cursor-pointer"
                  >
                    [ CHOOSE IMAGE ]
                  </label>
                  {avatarFile && (
                    <span className="text-sm text-foreground/60 flex items-center">
                      {avatarFile.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground/60">
                  JPG, PNG, or GIF. Max 5MB. Recommended: 400x400px
                </p>
                {!avatarFile && (
                  <>
                    <div className="flex items-center gap-2 text-xs text-foreground/60">
                      <div className="flex-1 h-px bg-foreground/20" />
                      <span>OR</span>
                      <div className="flex-1 h-px bg-foreground/20" />
                    </div>
                    <input
                      id="avatarUrl"
                      type="url"
                      value={formData.avatarUrl}
                      onChange={(e) => handleInputChange("avatarUrl", e.target.value)}
                      className="w-full px-3 py-2 bg-transparent border border-foreground/40 focus:border-foreground outline-none text-sm"
                      placeholder="https://example.com/avatar.jpg"
                    />
                    <p className="text-xs text-foreground/60">
                      Enter a direct link to an image
                    </p>
                  </>
                )}
              </div>

              {/* Banner Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-bold">
                  BANNER IMAGE
                </label>
                <div className="flex gap-4">
                  <input
                    id="bannerFile"
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="bannerFile"
                    className="px-4 py-2 border border-foreground/40 text-sm hover:bg-foreground/10 transition-colors cursor-pointer"
                  >
                    [ CHOOSE IMAGE ]
                  </label>
                  {bannerFile && (
                    <span className="text-sm text-foreground/60 flex items-center">
                      {bannerFile.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground/60">
                  JPG, PNG, or GIF. Max 10MB. Recommended: 1500x500px
                </p>
                {!bannerFile && (
                  <>
                    <div className="flex items-center gap-2 text-xs text-foreground/60">
                      <div className="flex-1 h-px bg-foreground/20" />
                      <span>OR</span>
                      <div className="flex-1 h-px bg-foreground/20" />
                    </div>
                    <input
                      id="bannerUrl"
                      type="url"
                      value={formData.bannerUrl}
                      onChange={(e) => handleInputChange("bannerUrl", e.target.value)}
                      className="w-full px-3 py-2 bg-transparent border border-foreground/40 focus:border-foreground outline-none text-sm"
                      placeholder="https://example.com/banner.jpg"
                    />
                    <p className="text-xs text-foreground/60">
                      Enter a direct link to an image
                    </p>
                  </>
                )}
              </div>

              {/* Message Display */}
              {message && (
                <div className={`p-3 border text-sm ${
                  message.type === "success" 
                    ? "border-green-500/50 bg-green-500/10 text-green-400"
                    : "border-red-500/50 bg-red-500/10 text-red-400"
                }`}>
                  {message.text}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-foreground/20">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 border border-foreground/40 text-sm hover:bg-foreground/10 transition-colors"
                  disabled={isUpdating}
                >
                  [ CANCEL ]
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || isUploadingAvatar || isUploadingBanner || !formData.displayName.trim() || !formData.username.trim()}
                  className="px-6 py-2 bg-foreground text-background text-sm disabled:opacity-50 hover:bg-foreground/90 transition-colors"
                >
                  {isUpdating ? "[ SAVING... ]" : 
                   isUploadingAvatar ? "[ UPLOADING AVATAR... ]" :
                   isUploadingBanner ? "[ UPLOADING BANNER... ]" :
                   "[ SAVE CHANGES ]"}
                </button>
              </div>
            </form>
          </div>
        </main>

        <div className="w-96"> {/* Right panel placeholder */} </div>
      </div>
    </div>
  );
}

function Sidebar() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const currentUser = useQuery(api.profiles.getCurrentUserProfile);

  const navItems = [
    { label: "HOME", href: "/feed", icon: "▪" },
    { label: "EXPLORE", href: "/explore", icon: "#" },
    { label: "NOTIFICATIONS", href: "/notifications", icon: "◔" },
    { label: "MESSAGES", href: "/messages", icon: "✉" },
    { label: "BOOKMARKS", href: "/bookmarks", icon: "◈" },
    { label: "PROFILE", href: currentUser ? `/profile/${currentUser.username}` : "#", icon: "◉" },
  ];

  return (
    <nav className="w-80 p-4 border-r border-foreground/20 min-h-screen sticky top-0">
      <div className="space-y-6">
        <Link href="/feed" className="text-2xl font-bold px-3 block">
          [ X ]
        </Link>
        
        <div className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 hover:bg-foreground/10 transition-colors text-sm"
            >
              <span className="w-6 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <button className="w-full px-4 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-bold">
          [ POST ]
        </button>

        <div className="pt-4 border-t border-foreground/20">
          {currentUser && (
            <div className="px-3 py-2 mb-2 text-xs">
              <p className="font-bold">{currentUser.displayName}</p>
              <p className="text-foreground/60">@{currentUser.username}</p>
            </div>
          )}
          <button
            onClick={() => void signOut().then(() => router.push("/"))}
            className="w-full text-left px-3 py-2 hover:bg-foreground/10 transition-colors text-sm"
          >
            [ SIGN OUT ]
          </button>
        </div>
      </div>
    </nav>
  );
}