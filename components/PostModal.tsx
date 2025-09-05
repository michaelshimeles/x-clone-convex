"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { type QuoteTweetData, type UserProfile } from "@/types";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: {
    id: string;
    author: {
      displayName: string;
      username: string;
      avatarUrl?: string;
    };
    content: string;
  };
  quoteTweet?: QuoteTweetData;
}

export default function PostModal({ isOpen, onClose, replyTo, quoteTweet }: PostModalProps) {
  const { isAuthenticated } = useConvexAuth();
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const currentUser = useQuery(api.profiles.getCurrentUserProfile) as UserProfile | undefined;
  const createPost = useMutation(api.posts.createPost);
  
  // Search for users when typing @username
  const userSuggestions = useQuery(
    api.profiles.searchProfiles, 
    suggestionQuery.length > 0 ? { searchTerm: suggestionQuery, limit: 5 } : "skip"
  );

  const maxLength = 280;

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!content.trim() && !quoteTweet) || isPosting || !isAuthenticated) return;

    setIsPosting(true);
    try {
      await createPost({
        content: content.trim(),
        replyToId: replyTo?.id as Id<"posts"> | undefined,
        quotedPostId: quoteTweet?.id as Id<"posts"> | undefined,
      });
      
      setContent("");
      onClose();
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  // Handle text change and mention detection
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursor = e.target.selectionStart;
    
    setContent(newContent);
    setCursorPosition(cursor);
    
    // Check for @mention at cursor position
    const textBeforeCursor = newContent.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      setSuggestionQuery(query);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSuggestionQuery("");
    }
  };

  // Insert mention into text
  const insertMention = (username: string) => {
    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);
    
    // Find the start of the @mention
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const mentionStart = textBeforeCursor.lastIndexOf('@');
      const newContent = 
        content.slice(0, mentionStart) + 
        `@${username} ` + 
        textAfterCursor;
      
      setContent(newContent);
      setShowSuggestions(false);
      setSuggestionQuery("");
      
      // Focus back to textarea
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = mentionStart + username.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-10 z-50">
      <div className="bg-background border border-foreground/20 w-full max-w-2xl mx-4 font-mono text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-foreground/20">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="hover:bg-foreground/10 p-2 -m-2 transition-colors"
            >
              ✕
            </button>
            <h2 className="font-bold">
              {replyTo ? "REPLY TO POST" : quoteTweet ? "QUOTE TWEET" : "CREATE POST"}
            </h2>
          </div>
          <button
            type="submit"
            form="post-form"
            disabled={(!content.trim() && !quoteTweet) || content.length > maxLength || isPosting}
            className="px-4 py-2 bg-foreground text-background text-sm disabled:opacity-50 hover:bg-foreground/90 transition-colors"
          >
            {isPosting ? "POSTING..." : replyTo ? "REPLY" : quoteTweet ? "QUOTE" : "POST"}
          </button>
        </div>

        <div className="p-4">
          {/* Reply Context */}
          {replyTo && (
            <div className="mb-4 p-3 border border-foreground/20 bg-foreground/5">
              <div className="flex gap-3">
                <div className="w-8 h-8 border border-foreground/40 flex items-center justify-center text-xs overflow-hidden">
                  {replyTo.author.avatarUrl ? (
                    <img 
                      src={replyTo.author.avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    replyTo.author.username[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <span className="font-bold">{replyTo.author.displayName}</span>
                    <span className="text-foreground/60">@{replyTo.author.username}</span>
                  </div>
                  <p className="text-sm text-foreground/80">{replyTo.content}</p>
                </div>
              </div>
            </div>
          )}

          {/* Quote Tweet Context */}
          {quoteTweet && (
            <div className="mb-4 p-3 border border-foreground/20 bg-foreground/5">
              <div className="flex gap-3">
                <div className="w-8 h-8 border border-foreground/40 flex items-center justify-center text-xs overflow-hidden">
                  {quoteTweet.author.avatarUrl ? (
                    <img 
                      src={quoteTweet.author.avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    quoteTweet.author.username[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <span className="font-bold">{quoteTweet.author.displayName}</span>
                    <span className="text-foreground/60">@{quoteTweet.author.username}</span>
                    <span className="text-foreground/60">·</span>
                    <span className="text-foreground/60 text-xs">
                      {new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      }).format(new Date(quoteTweet.createdAt))}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80">{quoteTweet.content}</p>
                </div>
              </div>
            </div>
          )}

          {/* Post Form */}
          <form id="post-form" onSubmit={handleSubmit}>
            <div className="flex gap-3">
              {/* Current User Avatar */}
              <div className="w-10 h-10 border border-foreground/40 flex items-center justify-center text-xs flex-shrink-0 overflow-hidden">
                {currentUser?.avatarUrl ? (
                  <img 
                    src={currentUser.avatarUrl} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentUser?.username?.[0]?.toUpperCase() || "?"
                )}
              </div>

              <div className="flex-1">
                {replyTo && (
                  <div className="text-sm text-foreground/60 mb-2">
                    Replying to <span className="text-foreground">@{replyTo.author.username}</span>
                  </div>
                )}
                
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleContentChange}
                    className="w-full bg-transparent outline-none resize-none text-lg placeholder:text-foreground/40 min-h-[120px] max-h-[300px]"
                    placeholder={replyTo ? "Post your reply" : quoteTweet ? "Add a comment..." : "What's happening?"}
                    maxLength={maxLength}
                    disabled={isPosting}
                  />
                  
                  {/* User Suggestions Dropdown */}
                  {showSuggestions && userSuggestions && userSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-background border border-foreground/20 z-10 mt-1">
                      {userSuggestions.map((user) => (
                        <button
                          key={user._id}
                          type="button"
                          onClick={() => insertMention(user.username)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-foreground/5 transition-colors text-left"
                        >
                          <div className="w-8 h-8 border border-foreground/40 flex items-center justify-center text-xs overflow-hidden">
                            {user.avatarUrl ? (
                              <img 
                                src={user.avatarUrl} 
                                alt="Avatar" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              user.username[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{user.displayName}</p>
                            <p className="text-foreground/60 text-xs">@{user.username}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Character Counter and Actions */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-foreground/20">
              <div className="flex items-center gap-4">
                {/* Media Upload (Future feature) */}
                <button
                  type="button"
                  disabled
                  className="text-foreground/40 hover:text-foreground/60 transition-colors disabled:cursor-not-allowed"
                  title="Media upload coming soon"
                >
                  📷
                </button>
                
                {/* Emoji (Future feature) */}
                <button
                  type="button"
                  disabled
                  className="text-foreground/40 hover:text-foreground/60 transition-colors disabled:cursor-not-allowed"
                  title="Emoji picker coming soon"
                >
                  😊
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-sm ${
                  content.length > maxLength * 0.9 
                    ? "text-red-500" 
                    : content.length > maxLength * 0.8 
                      ? "text-yellow-500" 
                      : "text-foreground/60"
                }`}>
                  {content.length}/{maxLength}
                </span>
                
                {content.length > 0 && (
                  <div className="relative w-8 h-8">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="stroke-foreground/20"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={`transition-all duration-300 ${
                          content.length > maxLength
                            ? "stroke-red-500"
                            : content.length > maxLength * 0.9
                              ? "stroke-yellow-500"
                              : "stroke-foreground"
                        }`}
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={`${(content.length / maxLength) * 100}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}