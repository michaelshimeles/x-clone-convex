"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { type NavItem, type UserProfile } from "@/types";
import { formatBadgeCount } from "@/utils";

interface MobileNavigationProps {
  onPostClick: () => void;
}

export default function MobileNavigation({ onPostClick }: MobileNavigationProps) {
  const currentUser = useQuery(api.profiles.getCurrentUserProfile) as UserProfile | undefined;
  const unreadCount = useQuery(api.notifications.getUnreadNotificationCount) as number | undefined;

  const navItems: NavItem[] = [
    { label: "HOME", href: "/feed", icon: "▪" },
    { label: "EXPLORE", href: "/explore", icon: "#" },
    { label: "NOTIFICATIONS", href: "/notifications", icon: "◔", badge: unreadCount },
    { label: "MESSAGES", href: "/messages", icon: "✉" },
    { label: "PROFILE", href: currentUser ? `/profile/${currentUser.username}` : "#", icon: "◉" },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-foreground/20 z-50">
        <div className="flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex-1 flex flex-col items-center py-2 px-1 hover:bg-foreground/10 transition-colors relative"
            >
              <div className="relative">
                <span className="text-lg">{item.icon}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center">
                    {formatBadgeCount(item.badge)}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 truncate max-w-full">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 bg-background/95 backdrop-blur border-b border-foreground/20 z-40">
        <div className="flex items-center justify-between p-4">
          <Link href="/feed" className="text-xl font-bold">
            [ X ]
          </Link>
          
          <button
            onClick={onPostClick}
            className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-bold rounded"
          >
            POST
          </button>
        </div>
      </header>

      {/* Floating Action Button (Alternative to header button) */}
      <button
        onClick={onPostClick}
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 bg-foreground text-background rounded-full flex items-center justify-center text-xl font-bold shadow-lg hover:bg-foreground/90 transition-colors z-40"
        aria-label="Create new post"
      >
        +
      </button>
    </>
  );
}