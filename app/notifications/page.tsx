"use client";

import PostContent from "@/components/PostContent";
import PostModal from "@/components/PostModal";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NotificationsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "mentions">("all");
  const [showPostModal, setShowPostModal] = useState(false);

  const notifications = useQuery(api.notifications.getUserNotifications, {});
  const markAllAsRead = useMutation(api.notifications.markAllNotificationsAsRead);
  const markAsRead = useMutation(api.notifications.markNotificationAsRead);

  // Redirect if not authenticated
  if (!isAuthenticated && !isLoading) {
    router.push("/");
  }

  // Mark all notifications as read when page loads
  useEffect(() => {
    if (notifications?.notifications?.some(n => !n.read)) {
      markAllAsRead();
    }
  }, [notifications, markAllAsRead]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
        <p className="animate-pulse text-sm">[ LOADING... ]</p>
      </div>
    );
  }

  const filteredNotifications = filter === "all"
    ? notifications?.notifications || []
    : notifications?.notifications?.filter(n => n.type === "mention") || [];

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <div className="max-w-7xl mx-auto flex">
        <Sidebar onPostClick={() => setShowPostModal(true)} />

        <main className="flex-1 border-r border-foreground/20">
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
                <h1 className="text-xl font-bold">NOTIFICATIONS</h1>
                <p className="text-xs text-foreground/60">
                  {filteredNotifications.length} {filter === "all" ? "total" : "mentions"}
                </p>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="border-b border-foreground/20">
            <div className="flex">
              <button
                onClick={() => setFilter("all")}
                className={`flex-1 py-3 text-sm hover:bg-foreground/5 transition-colors ${filter === "all"
                  ? "border-b-2 border-foreground font-bold"
                  : "text-foreground/60"
                  }`}
              >
                ALL
              </button>
              <button
                onClick={() => setFilter("mentions")}
                className={`flex-1 py-3 text-sm hover:bg-foreground/5 transition-colors ${filter === "mentions"
                  ? "border-b-2 border-foreground font-bold"
                  : "text-foreground/60"
                  }`}
              >
                MENTIONS
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="divide-y divide-foreground/20">
            {!filteredNotifications.length ? (
              <div className="p-8 text-center text-foreground/60">
                <div className="mb-4">
                  <div className="w-16 h-16 mx-auto border-2 border-foreground/20 flex items-center justify-center text-2xl mb-4">
                    {filter === "all" ? "◔" : "@"}
                  </div>
                  <h2 className="text-lg font-bold mb-2">
                    {filter === "all" ? "NO NOTIFICATIONS YET" : "NO MENTIONS YET"}
                  </h2>
                  <p className="text-sm max-w-md mx-auto leading-relaxed">
                    {filter === "all"
                      ? "When people follow you, like your posts, or interact with your content, you'll see notifications here."
                      : "When people mention you in their posts, you'll see those notifications here."
                    }
                  </p>
                </div>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                />
              ))
            )}
          </div>
        </main>

        <RightPanel />
      </div>
      <PostModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
      />
    </div>
  );
}

function Sidebar({ onPostClick }: { onPostClick: () => void }) {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const currentUser = useQuery(api.profiles.getCurrentUserProfile);
  const unreadCount = useQuery(api.notifications.getUnreadNotificationCount);

  const navItems = [
    { label: "HOME", href: "/feed", icon: "▪" },
    { label: "EXPLORE", href: "/explore", icon: "#" },
    { label: "NOTIFICATIONS", href: "/notifications", icon: "◔", badge: unreadCount },
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
              className={`flex items-center justify-between px-3 py-2 hover:bg-foreground/10 transition-colors text-sm ${item.label === "NOTIFICATIONS" ? "bg-foreground/10 font-bold" : ""
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && item.badge > 0 && (
                <span className="bg-foreground text-background text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {item.badge && item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        <button
          onClick={onPostClick}
          className="w-full px-4 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-bold"
        >
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

function NotificationItem({
  notification,
  onMarkAsRead
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notification: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMarkAsRead: (args: { notificationId: Id<"notifications"> }) => Promise<any>;
}) {
  const router = useRouter();
  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "follow": return "👤";
      case "like": return "♥";
      case "repost": return "🔄";
      case "reply": return "💬";
      case "mention": return "@";
      case "quote": return "📝";
      default: return "◔";
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getNotificationText = (notification: any) => {
    const actorName = notification.actor?.displayName || "Unknown User";

    switch (notification.type) {
      case "follow":
        return `${actorName} followed you`;
      case "like":
        return `${actorName} liked your post`;
      case "repost":
        return `${actorName} reposted your post`;
      case "reply":
        return `${actorName} replied to your post`;
      case "mention":
        return `${actorName} mentioned you in a post`;
      case "quote":
        return `${actorName} quoted your post`;
      default:
        return `${actorName} interacted with your content`;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "follow": return "text-blue-500";
      case "like": return "text-red-500";
      case "repost": return "text-green-500";
      case "reply": return "text-foreground";
      case "mention": return "text-yellow-500";
      case "quote": return "text-purple-500";
      default: return "text-foreground";
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead({ notificationId: notification._id });
    }

    // Navigate to relevant content
    if (notification.post) {
      // In the future, you could navigate to the specific post
      // For now, go to the actor's profile
      router.push(`/profile/${notification.actor?.username}`);
    } else if (notification.type === "follow") {
      router.push(`/profile/${notification.actor?.username}`);
    }
  };

  return (
    <article
      className={`p-4 hover:bg-foreground/5 transition-colors cursor-pointer ${!notification.read ? "bg-foreground/10" : ""
        }`}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Notification Icon */}
        <div className={`w-8 h-8 flex items-center justify-center text-lg ${getNotificationColor(notification.type)}`}>
          {getNotificationIcon(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Actor Info */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 border border-foreground/40 flex items-center justify-center text-xs overflow-hidden">
              {notification.actor?.avatarUrl ? (
                <img
                  src={notification.actor.avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                notification.actor?.username?.[0]?.toUpperCase() || "?"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-bold">{notification.actor?.displayName}</span>
                <span className="text-foreground/60 ml-1">
                  @{notification.actor?.username}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!notification.read && (
                <div className="w-2 h-2 bg-foreground rounded-full"></div>
              )}
              <span className="text-foreground/60 text-xs">
                {formatTimestamp(notification.createdAt)}
              </span>
            </div>
          </div>

          {/* Notification Text */}
          <p className="text-sm mb-2">{getNotificationText(notification)}</p>

          {/* Post Preview (if applicable) */}
          {notification.post && (
            <div className="border-l-2 border-foreground/20 pl-3 mt-2">
              <PostContent
                content={notification.post.content}
                className="text-sm text-foreground/80 line-clamp-2"
              />
              {notification.post.author && notification.post.author.username !== notification.actor?.username && (
                <p className="text-xs text-foreground/60 mt-1">
                  by @{notification.post.author.username}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function RightPanel() {

  return (
    <aside className="w-96 p-4 space-y-6">
      <div className="border border-foreground/20 p-4">
        <input
          type="text"
          placeholder="[ SEARCH NOTIFICATIONS ]"
          className="w-full bg-transparent outline-none text-sm placeholder:text-foreground/40"
        />
      </div>

      <div className="border border-foreground/20 p-4">
        <h3 className="font-bold text-sm mb-3">NOTIFICATION TYPES</h3>
        <div className="space-y-2 text-xs text-foreground/60">
          <div className="flex items-center gap-2">
            <span className="text-blue-500">👤</span>
            <span>New followers</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-500">♥</span>
            <span>Likes on your posts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">🔄</span>
            <span>Reposts of your content</span>
          </div>
          <div className="flex items-center gap-2">
            <span>💬</span>
            <span>Replies to your posts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-500">@</span>
            <span>Mentions in posts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-500">📝</span>
            <span>Quote tweets</span>
          </div>
        </div>
      </div>

      <div className="border border-foreground/20 p-4">
        <h3 className="font-bold text-sm mb-3">ABOUT NOTIFICATIONS</h3>
        <p className="text-xs text-foreground/60 leading-relaxed">
          Stay updated with all interactions on your posts and profile.
          Notifications are marked as read automatically when you visit this page.
        </p>
      </div>

      <div className="border border-foreground/20 p-4">
        <h3 className="font-bold text-sm mb-3">NOTIFICATION TIPS</h3>
        <ul className="text-xs text-foreground/60 space-y-2">
          <li>• Unread notifications show a blue dot</li>
          <li>• Click any notification to view the content</li>
          <li>• Use tabs to filter by type</li>
          <li>• Badge shows total unread count</li>
        </ul>
      </div>
    </aside>
  );
}