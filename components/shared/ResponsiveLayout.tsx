"use client";

import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";
import MobileNavigation from "./MobileNavigation";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  onPostClick: () => void;
  showRightPanel?: boolean;
}

export default function ResponsiveLayout({ 
  children, 
  onPostClick,
  showRightPanel = true 
}: ResponsiveLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      {/* Mobile Navigation */}
      <MobileNavigation onPostClick={onPostClick} />
      
      {/* Desktop Layout */}
      <div className="max-w-7xl mx-auto flex">
        {/* Desktop Sidebar */}
        <Sidebar onPostClick={onPostClick} />
        
        {/* Main Content */}
        <main className="flex-1 border-r border-foreground/20 min-h-screen mb-16 lg:mb-0">
          {children}
        </main>
        
        {/* Desktop Right Panel */}
        {showRightPanel && (
          <div className="hidden xl:block">
            <RightPanel />
          </div>
        )}
      </div>
    </div>
  );
}