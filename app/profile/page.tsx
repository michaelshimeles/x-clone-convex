"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

export default function ProfileRedirectPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const currentUser = useQuery(api.profiles.getCurrentUserProfile);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Redirect to home if not authenticated
        router.push("/");
      } else if (currentUser) {
        // Redirect to current user's profile
        router.push(`/profile/${currentUser.username}`);
      }
    }
  }, [isAuthenticated, isLoading, currentUser, router]);

  // Loading state
  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
      <p className="animate-pulse text-sm">[ REDIRECTING... ]</p>
    </div>
  );
}