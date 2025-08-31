import { ERROR_MESSAGES } from '../../assets';

interface ErrorBannerProps {
  error: string | null;
  onClose: () => void;
  className?: string;
}

export default function ErrorBanner({ error, onClose, className = '' }: ErrorBannerProps) {
  if (!error) return null;

  // Parse error code if it's in "CODE: message" format
  const [code, ...messageParts] = error.split(': ');
  const message = messageParts.join(': ');
  
  // Use casual error message if we have one, otherwise use the original
  const displayMessage = (code && ERROR_MESSAGES[code]) || message || error;

  return (
    <div 
      className={`error-banner-dark ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-red-600 text-lg">⚠️</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-red-800">
              {displayMessage}
            </p>
          </div>
        </div>
        
        <button
          type="button"
          className="inline-flex bg-red-900/30 rounded-md p-1.5 text-red-300 hover:bg-red-800/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-red-500 transition-colors min-w-11 min-h-11"
          onClick={onClose}
          aria-label="Close error message"
        >
          <span className="sr-only">Dismiss</span>
          <span className="text-lg">×</span>
        </button>
      </div>
    </div>
  );
}