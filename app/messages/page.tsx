"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import PostModal from "@/components/PostModal";

export default function MessagesPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams?.get("conversation") || null
  );
  const [newConversation, setNewConversation] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPostModal, setShowPostModal] = useState(false);
  
  const conversations = useQuery(api.messages.getUserConversations);
  const searchResults = useQuery(
    api.messages.searchUsersForMessage, 
    searchTerm.trim() ? { searchTerm } : "skip"
  );

  // Redirect if not authenticated
  if (!isAuthenticated && !isLoading) {
    router.push("/");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
        <p className="animate-pulse text-sm">[ LOADING... ]</p>
      </div>
    );
  }

  const selectedConversation = conversations?.find(c => c._id === selectedConversationId);

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <div className="max-w-7xl mx-auto flex">
        <Sidebar onPostClick={() => setShowPostModal(true)} />
        
        <main className="flex-1 flex border-r border-foreground/20">
          {/* Conversations List */}
          <div className={`w-96 border-r border-foreground/20 flex flex-col ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-foreground/20 p-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">MESSAGES</h1>
                <button
                  onClick={() => setNewConversation(true)}
                  className="px-3 py-1 border border-foreground text-sm hover:bg-foreground hover:text-background transition-colors"
                >
                  [ NEW ]
                </button>
              </div>
            </div>

            {/* New Conversation Modal */}
            {newConversation && (
              <NewConversationModal
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchResults={searchResults}
                onClose={() => {
                  setNewConversation(false);
                  setSearchTerm("");
                }}
                onSelectUser={(userId) => {
                  // This will be handled by the NewConversationModal component
                  setNewConversation(false);
                  setSearchTerm("");
                }}
                onConversationCreated={(conversationId) => {
                  setSelectedConversationId(conversationId);
                  setNewConversation(false);
                  setSearchTerm("");
                }}
              />
            )}

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {!conversations?.length ? (
                <div className="p-6 text-center text-foreground/60">
                  <div className="mb-4">
                    <div className="w-12 h-12 mx-auto border border-foreground/20 flex items-center justify-center text-xl mb-4">
                      ✉
                    </div>
                    <h3 className="font-bold mb-2">NO MESSAGES YET</h3>
                    <p className="text-xs leading-relaxed">
                      Start a conversation with someone by clicking the [ NEW ] button above.
                    </p>
                  </div>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <ConversationItem
                    key={conversation._id}
                    conversation={conversation}
                    isSelected={selectedConversationId === conversation._id}
                    onClick={() => setSelectedConversationId(conversation._id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${selectedConversationId ? 'flex' : 'hidden md:flex'}`}>
            {selectedConversation ? (
              <ChatArea 
                conversation={selectedConversation} 
                onBack={() => setSelectedConversationId(null)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-foreground/60">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto border border-foreground/20 flex items-center justify-center text-2xl mb-4">
                    💬
                  </div>
                  <h2 className="text-lg font-bold mb-2">SELECT A CONVERSATION</h2>
                  <p className="text-sm">
                    Choose a conversation from the left to start messaging.
                  </p>
                </div>
              </div>
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
              className={`flex items-center justify-between px-3 py-2 hover:bg-foreground/10 transition-colors text-sm ${
                item.label === "MESSAGES" ? "bg-foreground/10 font-bold" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-foreground text-background text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {item.badge > 99 ? "99+" : item.badge}
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

function ConversationItem({ 
  conversation, 
  isSelected, 
  onClick 
}: { 
  conversation: any; 
  isSelected: boolean; 
  onClick: () => void; 
}) {
  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) {
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor(diff / 60000);
      
      if (hours === 0) {
        if (minutes === 0) return "now";
        return `${minutes}m`;
      }
      return `${hours}h`;
    } else if (days < 7) {
      return `${days}d`;
    }
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left hover:bg-foreground/5 transition-colors border-b border-foreground/10 ${
        isSelected ? "bg-foreground/10" : ""
      }`}
    >
      <div className="flex gap-3">
        <div className="w-10 h-10 border border-foreground/40 flex items-center justify-center text-xs flex-shrink-0 overflow-hidden">
          {conversation.otherUser?.avatarUrl ? (
            <img 
              src={conversation.otherUser.avatarUrl} 
              alt="Avatar" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            conversation.otherUser?.username?.[0]?.toUpperCase() || "?"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-bold text-sm truncate">
                {conversation.otherUser?.displayName || "Unknown User"}
              </h3>
              <span className="text-foreground/60 text-xs">
                @{conversation.otherUser?.username || "unknown"}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {conversation.unreadCount > 0 && (
                <span className="bg-foreground text-background text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {conversation.unreadCount}
                </span>
              )}
              <span className="text-foreground/60 text-xs">
                {formatTimestamp(conversation.lastMessageAt)}
              </span>
            </div>
          </div>
          <p className="text-xs text-foreground/60 mt-1 truncate">
            {conversation.lastMessagePreview || "Start a conversation..."}
          </p>
        </div>
      </div>
    </button>
  );
}

function NewConversationModal({ 
  searchTerm, 
  setSearchTerm, 
  searchResults, 
  onClose, 
  onSelectUser,
  onConversationCreated 
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: any[] | undefined;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
  onConversationCreated: (conversationId: string) => void;
}) {
  const getOrCreateConversation = useMutation(api.messages.getOrCreateConversation);

  const handleSelectUser = async (userId: string) => {
    try {
      const conversationId = await getOrCreateConversation({ otherUserId: userId });
      onConversationCreated(conversationId);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur z-10">
      <div className="p-4 border-b border-foreground/20">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="hover:bg-foreground/10 p-2 -m-2 transition-colors"
          >
            ←
          </button>
          <h2 className="font-bold">NEW MESSAGE</h2>
        </div>
      </div>
      
      <div className="p-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search people..."
          className="w-full px-3 py-2 bg-transparent border border-foreground/40 focus:border-foreground outline-none text-sm"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchResults?.map((user) => (
          <button
            key={user._id}
            onClick={() => handleSelectUser(user.userId)}
            className="w-full p-4 text-left hover:bg-foreground/5 transition-colors"
          >
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 border border-foreground/40 flex items-center justify-center text-xs overflow-hidden">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.username?.[0]?.toUpperCase() || "?"
                )}
              </div>
              <div>
                <p className="font-bold text-sm">{user.displayName}</p>
                <p className="text-foreground/60 text-xs">@{user.username}</p>
              </div>
            </div>
          </button>
        ))}
        
        {searchTerm && !searchResults?.length && (
          <div className="p-4 text-center text-foreground/60 text-sm">
            No users found matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}

function ChatArea({ conversation, onBack }: { conversation: any; onBack: () => void }) {
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const messages = useQuery(api.messages.getMessages, { 
    conversationId: conversation._id 
  });
  const sendMessage = useMutation(api.messages.sendMessage);
  const markAsRead = useMutation(api.messages.markMessagesAsRead);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (conversation._id && conversation.unreadCount > 0) {
      markAsRead({ conversationId: conversation._id });
    }
  }, [conversation._id, markAsRead]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedText = messageText.trim();
    if (!trimmedText || isSending) return;

    setIsSending(true);
    try {
      await sendMessage({
        conversationId: conversation._id,
        content: trimmedText,
      });
      setMessageText("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages = messages?.messages?.reduce((groups: any[], message: any) => {
    const date = formatDate(message.createdAt);
    const lastGroup = groups[groups.length - 1];
    
    if (lastGroup && lastGroup.date === date) {
      lastGroup.messages.push(message);
    } else {
      groups.push({ date, messages: [message] });
    }
    
    return groups;
  }, []) || [];

  return (
    <>
      {/* Chat Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-foreground/20 p-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="hover:bg-foreground/10 p-2 -m-2 transition-colors md:hidden"
          >
            ←
          </button>
          <div className="w-8 h-8 border border-foreground/40 flex items-center justify-center text-xs overflow-hidden">
            {conversation.otherUser?.avatarUrl ? (
              <img 
                src={conversation.otherUser.avatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              conversation.otherUser?.username?.[0]?.toUpperCase() || "?"
            )}
          </div>
          <div>
            <h2 className="font-bold text-sm">{conversation.otherUser?.displayName}</h2>
            <p className="text-xs text-foreground/60">@{conversation.otherUser?.username}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="text-center text-xs text-foreground/60 mb-4">
              <span className="bg-background px-3 py-1 border border-foreground/20">
                {group.date}
              </span>
            </div>
            <div className="space-y-3">
              {group.messages.map((message: any) => (
                <div
                  key={message._id}
                  className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 text-sm ${
                      message.isOwn
                        ? 'bg-foreground text-background'
                        : 'bg-foreground/10 text-foreground'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.isOwn ? 'text-background/60' : 'text-foreground/60'
                    }`}>
                      {formatTimestamp(message.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="border-t border-foreground/20 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            maxLength={1000}
            disabled={isSending}
            className="flex-1 px-3 py-2 bg-transparent border border-foreground/40 focus:border-foreground outline-none text-sm"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || isSending}
            className="px-4 py-2 bg-foreground text-background text-sm disabled:opacity-50 hover:bg-foreground/90 transition-colors"
          >
            {isSending ? "..." : "SEND"}
          </button>
        </div>
        <p className="text-xs text-foreground/60 mt-1">
          {messageText.length}/1000
        </p>
      </form>
    </>
  );
}

function RightPanel() {
  return (
    <aside className="w-96 p-4 space-y-6">
      <div className="border border-foreground/20 p-4">
        <input
          type="text"
          placeholder="[ SEARCH MESSAGES ]"
          className="w-full bg-transparent outline-none text-sm placeholder:text-foreground/40"
        />
      </div>

      <div className="border border-foreground/20 p-4">
        <h3 className="font-bold text-sm mb-3">ABOUT MESSAGES</h3>
        <p className="text-xs text-foreground/60 leading-relaxed">
          Send private messages to other users. Messages are delivered in real-time 
          and you can see when they've been read.
        </p>
      </div>

      <div className="border border-foreground/20 p-4">
        <h3 className="font-bold text-sm mb-3">MESSAGE TIPS</h3>
        <ul className="text-xs text-foreground/60 space-y-2">
          <li>• Messages can be up to 1,000 characters</li>
          <li>• Click [ NEW ] to start a conversation</li>
          <li>• Search for users by name or username</li>
          <li>• Unread messages show a badge</li>
        </ul>
      </div>
    </aside>
  );
}