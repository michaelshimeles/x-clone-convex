"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { api } from "@/convex/_generated/api";
import PostModal from "@/components/PostModal";
import PostItem from "@/components/PostItem";
import ResponsiveLayout from "@/components/shared/ResponsiveLayout";
import { PostListSkeleton } from "@/components/shared/LoadingSkeletons";
import { type PostsResponse } from "@/types";

export default function Feed() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const [showPostModal, setShowPostModal] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
        <p className="animate-pulse text-sm">[ LOADING... ]</p>
      </div>
    );
  }

  return (
    <ResponsiveLayout onPostClick={() => setShowPostModal(true)}>
      <MainFeed />
      <PostModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
      />
    </ResponsiveLayout>
  );
}


function MainFeed() {
  const feedData = useQuery(api.posts.getFeedPosts, { limit: 20 }) as PostsResponse | undefined;
  const createPost = useMutation(api.posts.createPost);
  const [isPosting, setIsPosting] = useState(false);

  return (
    <>
      <div className="border-b border-foreground/20 p-4">
        <h2 className="text-xl font-bold">HOME</h2>
      </div>

      <ComposePost onPost={async (content) => {
        setIsPosting(true);
        try {
          await createPost({ content });
        } catch (error) {
          console.error("Error creating post:", error);
        } finally {
          setIsPosting(false);
        }
      }} isPosting={isPosting} />

      {feedData === undefined ? (
        <PostListSkeleton count={5} />
      ) : (
        <div className="divide-y divide-foreground/20">
          {feedData?.posts?.length === 0 ? (
            <div className="p-8 text-center text-foreground/60">
              <p className="text-sm mb-2">No posts yet</p>
              <p className="text-xs">Follow some users or create your first post!</p>
            </div>
          ) : (
            feedData?.posts?.map((post) => (
              <PostItem key={post._id} post={post} />
            ))
          )}
        </div>
      )}
    </>
  );
}

function ComposePost({ onPost, isPosting }: { onPost: (content: string) => Promise<void>; isPosting: boolean }) {
  const [content, setContent] = useState("");
  const maxLength = 280;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && content.length <= maxLength) {
      await onPost(content);
      setContent("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-b border-foreground/20">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's happening?"
        className="w-full bg-transparent outline-none resize-none text-sm placeholder:text-foreground/40"
        rows={3}
        maxLength={maxLength}
        disabled={isPosting}
      />
      <div className="flex justify-between items-center mt-3">
        <div className="flex gap-3 text-foreground/60">
          <span className={`text-xs ${content.length > maxLength * 0.9 ? "text-red-500" : ""}`}>
            {content.length}/{maxLength}
          </span>
        </div>
        <button
          type="submit"
          disabled={!content.trim() || content.length > maxLength || isPosting}
          className="px-4 py-1 bg-foreground text-background text-sm disabled:opacity-50"
        >
          {isPosting ? "[ POSTING... ]" : "[ POST ]"}
        </button>
      </div>
    </form>
  );
}


