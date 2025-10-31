import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
const AvatarWithStatus = ({ 
  user, 
  size = 'md', 
  isOnline = false, 
  showStatusDot = true,
  className = '',
  avatarUrl = null,
  fallback = null
}) => {
  const API_URL = 'http://localhost:3000';
  const toAbsoluteUrl = (url) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${API_URL}${url}`;
  };
  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return { 
          avatar: 'w-6 h-6', 
          status: 'w-2 h-2',
          position: '-bottom-0 -right-0'
        };
      case 'sm':
        return { 
          avatar: 'w-8 h-8', 
          status: 'w-2.5 h-2.5',
          position: '-bottom-0.5 -right-0.5'
        };
      case 'md':
        return { 
          avatar: 'w-10 h-10', 
          status: 'w-3 h-3',
          position: '-bottom-0.5 -right-0.5'
        };
      case 'lg':
        return { 
          avatar: 'w-12 h-12', 
          status: 'w-3.5 h-3.5',
          position: '-bottom-1 -right-1'
        };
      case 'xl':
        return { 
          avatar: 'w-16 h-16', 
          status: 'w-4 h-4',
          position: '-bottom-1 -right-1'
        };
      default:
        return { 
          avatar: 'w-10 h-10', 
          status: 'w-3 h-3',
          position: '-bottom-0.5 -right-0.5'
        };
    }
  };
  const sizeClasses = getSizeClasses();
  const userAvatar = avatarUrl || user?.avatar;
  const userFallback = fallback || user?.username?.[0]?.toUpperCase() || user?.firstName?.[0]?.toUpperCase() || 'U';
  return (
    <div className={`relative inline-block ${className}`}>
      <Avatar className={sizeClasses.avatar}>
        {userAvatar && (
          <AvatarImage 
            src={toAbsoluteUrl(userAvatar)} 
            alt="avatar" 
          />
        )}
        <AvatarFallback className="bg-blue-100 text-blue-600">
          {userFallback}
        </AvatarFallback>
      </Avatar>
      {showStatusDot && (
        <div 
          className={`absolute ${sizeClasses.position} ${sizeClasses.status} rounded-full border-2 border-white ${
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
      )}
    </div>
  );
};
export default AvatarWithStatus;

