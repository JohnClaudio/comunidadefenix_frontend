import React from 'react';

const LoadingDots: React.FC<{ className?: string }> = ({ className = 'bg-muted-foreground' }) => {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <div
        className={`w-2 h-2 rounded-full animate-pulse-dot ${className}`}
        style={{ animationDelay: '0ms' }}
      />
      <div
        className={`w-2 h-2 rounded-full animate-pulse-dot ${className}`}
        style={{ animationDelay: '200ms' }}
      />
      <div
        className={`w-2 h-2 rounded-full animate-pulse-dot ${className}`}
        style={{ animationDelay: '400ms' }}
      />
      <div
        className={`w-2 h-2 rounded-full animate-pulse-dot ${className}`}
        style={{ animationDelay: '600ms' }}
      />
    </div>
  );
};

export default LoadingDots;
