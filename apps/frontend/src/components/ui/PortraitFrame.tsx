import { useState } from 'react';
import { getRolePortrait } from '../../assets';

interface PortraitFrameProps {
  role?: string;
  playerName?: string;
  isEliminated?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  showName?: boolean;
}

const sizeClasses = {
  sm: 'w-16 h-24',  // 64x96px
  md: 'w-24 h-36',  // 96x144px  
  lg: 'w-32 h-48',  // 128x192px
  xl: 'w-48 h-72',  // 192x288px
};

export default function PortraitFrame({
  role,
  playerName,
  isEliminated = false,
  size = 'md',
  className = '',
  onClick,
  showName = true
}: PortraitFrameProps) {
  const [imageError, setImageError] = useState(false);
  
  const portraitSrc = role ? getRolePortrait(role) : null;
  const isClickable = !!onClick;
  
  const frameClasses = `
    portrait-frame ${sizeClasses[size]} 
    ${isEliminated ? 'player-eliminated' : ''}
    ${isClickable ? 'cursor-pointer hover:ring-ui-primary transition-all' : ''}
    ${className}
  `;

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <div 
        className={frameClasses}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={isClickable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        } : undefined}
        aria-label={isClickable ? `Select ${playerName || 'player'}` : undefined}
      >
        {portraitSrc && !imageError ? (
          <img
            src={portraitSrc}
            alt={role ? `${role} character portrait` : 'Character portrait'}
            className="w-full h-full object-cover object-center"
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          // Fallback placeholder
          <div className="w-full h-full bg-gradient-to-b from-gray-600 to-gray-800 flex items-center justify-center">
            <span className="text-4xl">👤</span>
          </div>
        )}
      </div>
      
      {showName && playerName && (
        <p className={`text-sm font-medium text-center truncate ${
          isEliminated ? 'text-gray-400' : 'text-white'
        }`}>
          {playerName}
        </p>
      )}
    </div>
  );
}