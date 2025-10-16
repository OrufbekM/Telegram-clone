import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const API_URL = 'http://localhost:3000';

const toAbsoluteUrl = (url) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_URL}${url}`;
};

const MyProfile = ({ open, onOpenChange, user }) => {
  const initial = (user?.username || 'U')[0].toUpperCase();

  // Check if user has any data
  const hasUserData = user && (
    user.username || 
    user.firstName || 
    user.lastName || 
    user.bio || 
    user.avatar ||
    user.phone
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>My Profile</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {hasUserData ? (
            <>
              {/* Avatar and username side by side */}
              <div className="flex items-center mb-6">
                <Avatar className="w-20 h-20 mr-4">
                  {user?.avatar && <AvatarImage src={toAbsoluteUrl(user.avatar)} alt="avatar" />}
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">{initial}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{user?.username || 'Username'}</h2>
                  <p className="text-gray-500">online</p>
                </div>
              </div>
              
              {/* User information in Telegram-like layout */}
              <div className="space-y-3">
                <div className="flex">
                  <span className="text-gray-500 w-24">Phone:</span>
                  <span className="flex-1">{user?.phone || 'Malumot yo\'q'}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-500 w-24">Username:</span>
                  <span className="flex-1">{user?.username ? `${user.username}` : '-'}</span>
                </div>
                {user?.firstName && (
                  <div className="flex">
                    <span className="text-gray-500 w-24">First name:</span>
                    <span className="flex-1">{user.firstName}</span>
                  </div>
                )}
                {user?.lastName && (
                  <div className="flex">
                    <span className="text-gray-500 w-24">Last name:</span>
                    <span className="flex-1">{user.lastName}</span>
                  </div>
                )}
                {user?.bio && (
                  <div className="flex">
                    <span className="text-gray-500 w-24">Bio:</span>
                    <span className="flex-1">{user.bio}</span>
                  </div>
                )}
                
              </div>
            </>
          ) : (
            // Display "No information" message when no user data is available
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-gray-500 text-center">
                <p className="text-lg">Malumot yo'q</p>
                <p className="text-sm mt-2">Foydalanuvchi ma'lumotlari mavjud emas</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MyProfile;