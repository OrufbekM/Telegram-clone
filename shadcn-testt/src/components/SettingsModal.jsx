import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Label } from './ui/label';
import { Switch } from './ui/switch';

const SettingsModal = ({ open, onOpenChange }) => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [sound, setSound] = useState(true);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemPrefersDark);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your Telegram experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label htmlFor="notifications" className="text-base">
                Notifications
              </Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive notifications for new messages
              </p>
            </div>
            <Switch
              id="notifications"
              checked={notifications}
              onCheckedChange={setNotifications}
              className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-800"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label htmlFor="dark-mode" className="text-base">
                Dark Mode
              </Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enable dark theme
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={darkMode}
              onCheckedChange={setDarkMode}
              className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-800"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label htmlFor="sound" className="text-base">
                Sound
              </Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Play sound for new messages
              </p>
            </div>
            <Switch
              id="sound"
              checked={sound}
              onCheckedChange={setSound}
              className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-800"

            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;