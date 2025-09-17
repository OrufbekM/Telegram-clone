import React from 'react';
import { formatDistanceToNow } from 'date-fns';
const OnlineStatusIndicator = ({ isOnline, lastSeen, size = 'sm', showText = true, username, debug = false }) => {
  const getStatusText = () => {
    if (isOnline) {
      return 'Online';
    }
    
    // If no lastSeen data, just show offline status without "unknown"
    if (!lastSeen || lastSeen === null || lastSeen === undefined) {
      return 'Offline';
    }
    
    try {
      const lastSeenDate = new Date(lastSeen);
      const now = new Date();
      
      // Check if the date is valid
      if (isNaN(lastSeenDate.getTime()) || lastSeenDate.getTime() === 0) {
        return 'Offline';
      }
      
      // Don't show future dates
      if (lastSeenDate > now) {
        return 'Online';
      }
      
      const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
      
      if (diffInMinutes < 1) {
        return 'Hozir online edi';
      } else if (diffInMinutes < 5) {
        return 'Yaqinda online edi';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} daqiqa oldin`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours} soat oldin`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        if (days === 1) {
          return 'Kecha';
        } else if (days < 7) {
          return `${days} kun oldin`;
        } else if (days < 30) {
          const weeks = Math.floor(days / 7);
          return `${weeks} hafta oldin`;
        } else {
          const months = Math.floor(days / 30);
          return `${months} oy oldin`;
        }
      }
    } catch (error) {
      console.error('Error parsing lastSeen:', error);
      return 'Offline';
    }
  };
  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'w-2 h-2';
      case 'sm':
        return 'w-3 h-3';
      case 'md':
        return 'w-4 h-4';
      case 'lg':
        return 'w-5 h-5';
      default:
        return 'w-3 h-3';
    }
  };
  return (
    <div className="flex items-center space-x-1">
      <div 
        className={`${getSizeClasses()} rounded-full flex-shrink-0 relative ${
          isOnline 
            ? 'bg-green-500 shadow-sm shadow-green-200' 
            : 'bg-gray-400'
        }`} 
        style={{ minWidth: getSizeClasses().includes('w-2') ? '8px' : '12px' }}
        title={username ? `${username}: ${getStatusText()}` : getStatusText()}
      >
        {isOnline && (
          <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-20"></div>
        )}
      </div>
      {showText && (
        <span className={`text-xs ${
          isOnline ? 'text-green-600 font-medium' : 'text-gray-500'
        }`}>
          {getStatusText()}
        </span>
      )}
    </div>
  );
};
export default OnlineStatusIndicator;

