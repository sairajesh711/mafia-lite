import { ReactNode } from 'react';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export default function ScreenHeader({ 
  title, 
  subtitle, 
  children, 
  className = '' 
}: ScreenHeaderProps) {
  return (
    <header className={`text-center py-8 px-4 ${className}`}>
      <h1 className="text-display text-4xl md:text-5xl lg:text-6xl text-ui-primary mb-2 text-shadow">
        {title}
      </h1>
      
      {subtitle && (
        <p className="text-body text-lg md:text-xl text-gray-300 mb-4">
          {subtitle}
        </p>
      )}
      
      {children && (
        <div className="mt-6">
          {children}
        </div>
      )}
    </header>
  );
}