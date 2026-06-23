"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Mail, User } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initials } from "@/lib/utils";

const MAX_FILE_BYTES = 1024 * 1024; // 1MB

type ProfileUser = {
  name: string | null;
  email: string | null;
  image: string | null;
  mobile: string | null;
};

export function ProfileCard({ user }: { user: ProfileUser }) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [name, setName] = React.useState(user.name ?? "");
  const [mobile, setMobile] = React.useState(user.mobile ?? "");
  const [image, setImage] = React.useState<string | null>(user.image ?? null);
  const [saving, setSaving] = React.useState(false);

  function handlePickFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so picking the same file again still fires onChange.
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Image is too large. Maximum size is 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImage(reader.result);
      }
    };
    reader.onerror = () => {
      toast.error("Could not read that image. Try another file.");
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.trim(),
          image: image ?? "",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save profile");
      }
      toast.success("Profile updated.");
      // Update the topbar avatar/name instantly (no reload needed).
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("manzil:profile", {
            detail: { image: image ?? null, name: name.trim() || null },
          })
        );
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  const displayName = name || user.name || "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-5 text-muted-foreground" />
          Profile
        </CardTitle>
        <CardDescription>Your account details across Manzil One.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {/* Avatar + upload */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <Avatar className="h-16 w-16">
                {image ? <AvatarImage src={image} alt={displayName} /> : null}
                <AvatarFallback className="text-lg">{initials(displayName)}</AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePickFile}
                disabled={saving}
              >
                <Camera className="size-4" />
                Change photo
              </Button>
              <p className="mt-1.5 text-xs text-muted-foreground">
                JPG, PNG or GIF. Up to 1MB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={saving}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profile-mobile">Mobile</Label>
              <Input
                id="profile-mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 90000 00000"
                disabled={saving}
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="profile-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="profile-email"
                  value={user.email ?? ""}
                  readOnly
                  disabled
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
