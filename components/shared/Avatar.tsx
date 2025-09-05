import Link from "next/link";
import { type AvatarSize, type UserProfile } from "@/types";

interface AvatarProps {
  user: Pick<UserProfile, 'username' | 'displayName' | 'avatarUrl'>;
  size?: AvatarSize;
  linkToProfile?: boolean;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-xs", 
  lg: "w-32 h-32 text-4xl",
  xl: "w-40 h-40 text-5xl",
};

export default function Avatar({ 
  user, 
  size = "md", 
  linkToProfile = true,
  className = ""
}: AvatarProps) {
  const avatarContent = (
    <div 
      className={`
        border border-foreground/40 flex items-center justify-center 
        hover:border-foreground transition-colors overflow-hidden
        ${sizeClasses[size]} 
        ${size === 'lg' ? 'border-4 border-background bg-foreground/10' : ''}
        ${className}
      `}
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={`${user.displayName || user.username}&apos;s avatar`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <span>
          {user.username?.[0]?.toUpperCase() || user.displayName?.[0]?.toUpperCase() || "?"}
        </span>
      )}
    </div>
  );

  if (!linkToProfile) {
    return avatarContent;
  }

  return (
    <Link href={`/profile/${user.username}`} className="flex-shrink-0">
      {avatarContent}
    </Link>
  );
}