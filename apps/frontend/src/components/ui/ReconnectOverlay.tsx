interface ReconnectOverlayProps {
  isReconnecting: boolean;
  className?: string;
}

export default function ReconnectOverlay({ isReconnecting, className = '' }: ReconnectOverlayProps) {
  if (!isReconnecting) return null;

  return (
    <div 
      className={`reconnect-overlay ${className}`}
      aria-live="assertive"
      role="status"
    >
      <div className="bg-ui-bg border border-ui-primary rounded-lg p-6 text-center max-w-sm mx-4">
        <div className="mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ui-primary mx-auto"></div>
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-2">
          Reconnecting...
        </h3>
        
        <p className="text-gray-300 text-sm">
          Lost connection to the server. Trying to get you back in the game!
        </p>
      </div>
    </div>
  );
}