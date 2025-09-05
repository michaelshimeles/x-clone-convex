"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import PostContent from "./PostContent";
import Avatar from "./shared/Avatar";
import { formatQuotedPostTime } from "@/utils";
import { type EnrichedPost } from "@/types";

interface QuotedPostProps {
  quotedPost: Pick<EnrichedPost, '_id' | 'content' | 'createdAt' | 'author'>;
  className?: string;
}

export default function QuotedPost({ quotedPost, className = "" }: QuotedPostProps) {
  const router = useRouter();

  return (
    <div 
      className={`mt-3 border-2 border-foreground/40 rounded-lg p-4 bg-foreground/5 hover:bg-foreground/10 transition-colors cursor-pointer ${className}`}
      onClick={(e) => {
        // Stop propagation to prevent parent post click
        e.stopPropagation();
        router.push(`/post/${quotedPost._id}`);
      }}
    >
      <div className="text-xs text-foreground/60 mb-2 flex items-center gap-1">
        <span>📝</span>
        <span>Quote Tweet</span>
      </div>
      <div className="flex gap-3">
        <div onClick={(e) => e.stopPropagation()}>
          <Avatar user={quotedPost.author} size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <Link 
              href={`/profile/${quotedPost.author.username}`} 
              className="font-bold hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {quotedPost.author.displayName}
            </Link>
            <span className="text-foreground/60">@{quotedPost.author.username}</span>
            <span className="text-foreground/60">·</span>
            <span className="text-foreground/60">{formatQuotedPostTime(quotedPost.createdAt)}</span>
          </div>
          <PostContent content={quotedPost.content} className="mt-2 text-sm" />
        </div>
      </div>
    </div>
  );
}