import React, { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from './ui/sheet';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  User, 
  Users, 
  Moon,
  LogOut,
  Plus,
  Megaphone,
  Settings,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../utils/storageUtils';
import { toAbsoluteUrl } from '../config/api';
import ProfileDialog from './ProfileDialog';
import SettingsModal from './SettingsModal';
import LogoutConfirmDialog from './LogoutConfirmDialog';

const formatLastSeen = (timestamp) => {
  if (!timestamp) return 'recently';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ProfileSheet = ({
  open,
  onOpenChange,
  user,
  onLogout,
  userStatuses = {},
}) => {
  const isOnline = userStatuses[user?.id]?.isOnline ?? user?.isOnline ?? false;
  const lastSeen = userStatuses[user?.id]?.lastSeen ?? user?.lastSeen;
  const { logout } = useAuth();
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      const token = storage.getPersistent('chatToken');
      if (token) {
        await logout(token);
      }
      if (onLogout) {
        onLogout();
      }
      if (typeof window !== 'undefined') {
        storage.removePersistent('chatToken');
        storage.removePersistent('chatUser');
        storage.clearSessionData();
      }
      setShowLogoutConfirm(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const handleOpenMyProfile = () => {
    // Close the ProfileSheet when opening My Profile modal
    onOpenChange(false);
    setIsMyProfileOpen(true);
  };

  const handleOpenSettings = () => { 
    // Close the ProfileSheet when opening Settings modal
    onOpenChange(false);
    setIsSettingsOpen(true);
  };

  const menuItems = [
    { icon: User, label: 'My Profile', action: handleOpenMyProfile },
    { icon: Settings, label: 'Settings', action: handleOpenSettings }, 

  ];

  const createActionItems = [
    { icon: Megaphone, label: 'Add Channel', action: () => { 
        console.log('Add Channel');
        window.dispatchEvent(new CustomEvent('open-create-channel'));
        onOpenChange(false);
      } 
    },
    { icon: Users, label: 'Add Group', action: () => { 
        console.log('Add Group');
        window.dispatchEvent(new CustomEvent('open-create-group'));
        onOpenChange(false);
      } 
    },
  ];

  const initial = (user?.username || 'U')[0].toUpperCase();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-80 p-0 dark:bg-gray-900">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12">
                {user?.avatar && <AvatarImage src={toAbsoluteUrl(user.avatar)} alt="avatar" />}
                <AvatarFallback className="bg-blue-100 text-blue-600">{initial}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center">
                  <p className="font-semibold">{user?.username || 'Username'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {isOnline ? 'Online' : lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : 'Offline'}
                  </p>
                </div>
              </div>
            </div>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto py-2">
            {/* Main Menu Items */}
            <div className="py-1">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-blue-800 text-gray-500 group dark:hover:text-white"
                >
                  <item.icon className="w-5 h-5 mr-3 text-gray-500  dark:group-hover:text-white " />
                  <span className="flex-1">{item.label}</span>
                  {item.hasToggle && (
                    <div className="relative inline-block w-10 mr-2 align-middle select-none">
                      <input 
                        type="checkbox" 
                        name="toggle" 
                        id={`toggle-${index}`}
                        className="sr-only"
                      />
                      <label 
                        htmlFor={`toggle-${index}`} 
                        className="block h-6 w-10 rounded-full bg-gray-300 cursor-pointer"
                      >
                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform"></div>
                      </label>
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            {/* Create Actions */}
            <div className="border-t border-b py-1">
              {createActionItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-blue-800 text-gray-500 group dark:hover:text-white"
                >
                  <item.icon className="w-5 h-5 mr-3 text-gray-500 dark:group-hover:text-white  " />
                  <span className="flex-1">{item.label}</span>
                </button>
              ))}
            </div>
            
            {/* Logout */}
            <div className="border-t py-1">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-100 text-red-500 dark:hover:bg-blue-800 dark:hover:text-red-200"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span className="flex-1">Log Out</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* My Profile Modal - now using ProfileDialog */}
      <ProfileDialog 
        open={isMyProfileOpen} 
        onOpenChange={setIsMyProfileOpen} 
        onLogout={handleLogout}
        userStatuses={userStatuses}
      />
      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
      
      {/* Settings Modal */}
      <SettingsModal 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
      />
    </>
  );
};

export default ProfileSheet;