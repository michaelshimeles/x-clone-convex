"use client";

import Link from "next/link";
import { JSX, useState } from "react";

interface PostContentProps {
  content: string;
  className?: string;
}

export default function PostContent({ content, className = "" }: PostContentProps) {
  const [expanded, setExpanded] = useState(false);
  const maxLength = 240;
  const shouldTruncate = content.length > maxLength;
  
  // Determine the content to display
  const displayContent = shouldTruncate && !expanded 
    ? content.slice(0, maxLength) 
    : content;
  
  // Parse content for mentions, hashtags, and links
  const parseContent = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    
    // Regex to match @mentions, #hashtags, and URLs
    const regex = /@(\w+)|#(\w+)|(https?:\/\/[^\s]+)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      
      if (match[1]) {
        // @mention
        parts.push(
          <Link
            key={`mention-${match.index}`}
            href={`/profile/${match[1]}`}
            className="text-blue-500 hover:underline"
          >
            @{match[1]}
          </Link>
        );
      } else if (match[2]) {
        // #hashtag (future feature)
        parts.push(
          <span key={`hashtag-${match.index}`} className="text-blue-500">
            #{match[2]}
          </span>
        );
      } else if (match[3]) {
        // URL link
        parts.push(
          <a
            key={`link-${match.index}`}
            href={match[3]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {match[3]}
          </a>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts;
  };

  return (
    <div>
      <p className={`whitespace-pre-wrap max-w-md break-words ${className}`}>
        {parseContent(displayContent)}
        {shouldTruncate && !expanded && "..."}
      </p>
      {shouldTruncate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="text-blue-500 hover:underline text-sm mt-1"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}