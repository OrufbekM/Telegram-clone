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
  
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../utils/storageUtils';
import ProfileDialog from './ProfileDialog'; // Changed from MyProfile to ProfileDialog

const API_URL = 'http://localhost:3000';

const toAbsoluteUrl = (url) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_URL}${url}`;
};

const ProfileSheet = ({ open, onOpenChange, user, onLogout }) => {
  const { logout } = useAuth();
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);
  
  const handleLogout = async () => {
    try {
      const token = storage.getPersistent('chatToken');
      if (token) {
        await logout(token);
      }
      if (onLogout) {
        onLogout();
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Logout error:', error);
      if (typeof window !== 'undefined') {
        storage.removePersistent('chatToken');
        storage.removePersistent('chatUser');
        storage.clearSessionData();
      }
      if (onLogout) {
        onLogout();
      }
    }
  };

  const handleOpenMyProfile = () => {
    // Close the ProfileSheet when opening My Profile modal
    onOpenChange(false);
    setIsMyProfileOpen(true);
  };

  const menuItems = [
    { icon: User, label: 'My Profile', action: handleOpenMyProfile },
  ];

  const createActionItems = [
    { icon: Megaphone, label: 'Add Channel', action: () => { 
        console.log('Add Channel');
        window.dispatchEvent(new Event('open-create-channel'));
        onOpenChange(false);
      } 
    },
    { icon: Users, label: 'Add Group', action: () => { 
        console.log('Add Group');
        window.dispatchEvent(new Event('open-create-group'));
        onOpenChange(false);
      } 
    },
  ];

  const initial = (user?.username || 'U')[0].toUpperCase();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-80 p-0">
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
                <p className="text-xs text-green-700">Online</p>
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
                  className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-100"
                >
                  <item.icon className="w-5 h-5 mr-3 text-gray-500" />
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
                  className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-100"
                >
                  <item.icon className="w-5 h-5 mr-3 text-gray-500" />
                  <span className="flex-1">{item.label}</span>
                </button>
              ))}
            </div>
            
            {/* Logout */}
            <div className="border-t py-1">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-100 text-red-500"
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
        onLogout={onLogout} // Pass onLogout prop
      />
    </>
  );
};

export default ProfileSheet;