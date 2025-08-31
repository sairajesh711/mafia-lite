import { ReactNode, useEffect } from 'react';
import { preloadAssets, ASSETS } from '../../assets';

interface AppShellProps {
  children: ReactNode;
  className?: string;
}

export default function AppShell({ children, className = '' }: AppShellProps) {
  // Preload critical assets on mount
  useEffect(() => {
    const criticalAssets: string[] = [
      ASSETS.backgrounds.night,
      ASSETS.backgrounds.day,
      // Add user's role portrait when we know it
    ].filter(Boolean);
    
    preloadAssets(criticalAssets);
  }, []);

  return (
    <div className={`min-h-screen bg-ui-dark text-ui-light ${className}`}>
      {/* Background gradient for noir atmosphere */}
      <div className="fixed inset-0 bg-noir-gradient -z-10" />
      
      {/* Main content area */}
      <main className="relative min-h-screen">
        {children}
      </main>
      
      {/* Global accessibility enhancements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="accessibility-announcements"
      />
    </div>
  );
}