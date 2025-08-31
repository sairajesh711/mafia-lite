import { useState, ReactNode } from 'react';
import { getPhaseBackground } from '../../assets';

interface BackgroundStageProps {
  phase?: string;
  customBackground?: string;
  children?: ReactNode;
  className?: string;
  overlay?: 'light' | 'dark' | 'none';
}

export default function BackgroundStage({
  phase,
  customBackground,
  children,
  className = '',
  overlay = 'dark'
}: BackgroundStageProps) {
  const [imageError, setImageError] = useState(false);
  
  const backgroundSrc = customBackground || (phase ? getPhaseBackground(phase) : null);
  
  const overlayClasses = {
    light: 'bg-gradient-to-t from-white/30 via-transparent to-white/10',
    dark: 'bg-gradient-to-t from-black/50 via-transparent to-black/30',
    none: '',
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className={`background-stage ${className}`}>
      {backgroundSrc && !imageError ? (
        <img
          src={backgroundSrc}
          alt="" // Decorative image
          className="w-full h-full object-cover object-center"
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        // Fallback gradient background
        <div className="w-full h-full bg-gradient-to-br from-ui-bg via-gray-900 to-ui-dark" />
      )}
      
      {/* Overlay */}
      {overlay !== 'none' && (
        <div className={`absolute inset-0 ${overlayClasses[overlay]}`} />
      )}
      
      {/* Content */}
      {children && (
        <div className="absolute inset-0 flex flex-col justify-center items-center p-6 text-center">
          {children}
        </div>
      )}
    </div>
  );
}