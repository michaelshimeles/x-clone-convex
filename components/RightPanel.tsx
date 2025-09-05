"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { type UserProfile } from "@/types";

interface RightPanelProps {
  showSearch?: boolean;
  showTrends?: boolean;
  showSuggestions?: boolean;
}

export default function RightPanel({ 
  showSearch = true, 
  showTrends = true, 
  showSuggestions = true 
}: RightPanelProps) {
  const suggestions = useQuery(api.profiles.getSuggestedUsers, { limit: 3 }) as UserProfile[] | undefined;
  const followMutation = useMutation(api.profiles.followUser);
  const [searchTerm, setSearchTerm] = useState("");
  const searchResults = useQuery(
    api.profiles.searchProfiles,
    searchTerm.length > 0 ? { searchTerm, limit: 5 } : "skip"
  ) as UserProfile[] | undefined;

  const trends = [
    { topic: "Technology", posts: "42.1K" },
    { topic: "Programming", posts: "28.5K" },
    { topic: "OpenSource", posts: "15.3K" },
    { topic: "WebDev", posts: "12.8K" },
    { topic: "TypeScript", posts: "9.2K" },
  ];

  return (
    <aside className="w-96 p-4 space-y-6">
      {showSearch && (
        <div className="border border-foreground/20 p-4">
          <input
            type="text"
            placeholder="[ SEARCH USERS ]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none text-sm placeholder:text-foreground/40"
          />
          {searchResults && searchResults.length > 0 && (
            <div className="mt-3 pt-3 border-t border-foreground/20 space-y-2">
              {searchResults.map((user) => (
                <Link
                  key={user._id}
                  href={`/profile/${user.username}`}
                  className="block hover:bg-foreground/10 p-2 -mx-2 transition-colors"
                >
                  <p className="text-sm font-bold">{user.displayName}</p>
                  <p className="text-xs text-foreground/60">@{user.username}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {showTrends && (
        <div className="border border-foreground/20 p-4 space-y-3">
          <h3 className="font-bold text-sm">TRENDS FOR YOU</h3>
          {trends.map((trend) => (
            <div key={trend.topic} className="text-xs space-y-1">
              <p className="font-bold">#{trend.topic}</p>
              <p className="text-foreground/60">{trend.posts} posts</p>
            </div>
          ))}
          <button className="text-xs text-foreground/60 hover:text-foreground">
            Show more →
          </button>
        </div>
      )}

      {showSuggestions && suggestions && suggestions.length > 0 && (
        <div className="border border-foreground/20 p-4 space-y-3">
          <h3 className="font-bold text-sm">WHO TO FOLLOW</h3>
          {suggestions.map((user) => (
            <div key={user._id} className="flex items-center justify-between">
              <Link
                href={`/profile/${user.username}`}
                className="flex gap-2 items-center hover:opacity-80"
              >
                <div className="w-8 h-8 border border-foreground/40 flex items-center justify-center text-xs overflow-hidden">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    user.username[0].toUpperCase()
                  )}
                </div>
                <div className="text-xs">
                  <p className="font-bold">{user.displayName}</p>
                  <p className="text-foreground/60">@{user.username}</p>
                </div>
              </Link>
              <button
                onClick={() => followMutation({ targetUserId: user.userId })}
                className="px-3 py-1 border border-foreground text-xs hover:bg-foreground hover:text-background transition-colors"
              >
                Follow
              </button>
            </div>
          ))}
          <button className="text-xs text-foreground/60 hover:text-foreground">
            Show more →
          </button>
        </div>
      )}
    </aside>
  );
}