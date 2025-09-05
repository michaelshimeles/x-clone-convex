interface SkeletonProps {
  className?: string;
}

function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-foreground/10 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function PostSkeleton() {
  return (
    <div className="p-4 border-b border-foreground/20">
      <div className="flex gap-3">
        {/* Avatar skeleton */}
        <Skeleton className="w-10 h-10 rounded-none" />
        
        <div className="flex-1 space-y-2">
          {/* Author info skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-8" />
          </div>
          
          {/* Content skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          
          {/* Actions skeleton */}
          <div className="flex gap-6 mt-3">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-foreground/20">
      {Array.from({ length: count }, (_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Banner skeleton */}
      <div className="h-48 bg-foreground/10" />
      
      {/* Avatar skeleton */}
      <div className="relative">
        <div className="absolute -bottom-16 left-4">
          <Skeleton className="w-32 h-32 rounded-none" />
        </div>
      </div>
      
      {/* Profile info skeleton */}
      <div className="pt-20 px-4 pb-4 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        
        <Skeleton className="h-16 w-full" />
        
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <nav className="w-80 p-4 border-r border-foreground/20 min-h-screen">
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-16" />
        
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <Skeleton className="w-6 h-6" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
        
        <Skeleton className="h-12 w-full" />
      </div>
    </nav>
  );
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div 
      className={`animate-spin border-2 border-foreground/20 border-t-foreground rounded-full ${sizeClasses[size]}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function LoadingButton({ 
  children, 
  isLoading, 
  ...props 
}: { 
  children: React.ReactNode; 
  isLoading: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button 
      {...props}
      disabled={isLoading || props.disabled}
      className={`${props.className} flex items-center justify-center gap-2`}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
}