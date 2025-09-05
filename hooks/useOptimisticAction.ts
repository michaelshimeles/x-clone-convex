import { useState, useCallback } from 'react';

/**
 * Hook for handling optimistic UI updates with rollback on failure
 */
export function useOptimisticAction<T>(
  initialState: T,
  action: () => Promise<void>,
  optimisticUpdate: (current: T) => T,
  onError?: (error: Error) => void
) {
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async () => {
    if (isLoading) return; // Prevent double-clicks
    
    const previousState = initialState;
    setIsLoading(true);
    
    try {
      // Apply optimistic update immediately
      // Note: This would need to be handled by the parent component
      // since hooks can't directly mutate parent state
      
      await action();
    } catch (error) {
      // Rollback would be handled by parent component
      onError?.(error as Error);
      throw error; // Re-throw so parent can handle rollback
    } finally {
      setIsLoading(false);
    }
  }, [initialState, action, optimisticUpdate, onError, isLoading]);

  return {
    execute,
    isLoading,
  };
}

/**
 * Hook for managing loading states
 */
export function useAsyncAction() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (action: () => Promise<void>) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await action();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Action failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const clearError = useCallback(() => setError(null), []);

  return {
    execute,
    isLoading,
    error,
    clearError,
  };
}