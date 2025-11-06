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
  // Left sidebar sections like Telegram
  const sections = [
    { key: 'chat', title: 'Chat Sozlamalari' },
    { key: 'notifications', title: 'Bildirishnomalar' },
    { key: 'advanced', title: 'Qoʻshimcha' },
  ];

  const [active, setActive] = useState('chat');
  const [notifications, setNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sound, setSound] = useState(false);
  const [hidePhone, setHidePhone] = useState(false);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemPrefersDark);
    }
    const savedSound = localStorage.getItem('soundEnabled');
    if (savedSound !== null) {
      setSound(savedSound === 'true');
    }
    const savedHidePhone = localStorage.getItem('hidePhoneNumber');
    if (savedHidePhone !== null) {
      setHidePhone(savedHidePhone === 'true');
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

  const SectionHeader = ({ title, desc }) => (
    <div className="mb-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      {desc && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
      )}
    </div>
  );

  const ChatSettingsSection = () => (
    <div className="space-y-6">
      <SectionHeader title="Chat sozlamalari" desc="Ko‘rinish va xatti-harakatlar" />
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Label htmlFor="dark-mode" className="text-base">Dark Mode</Label>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tungi mavzuni yoqish</p>
        </div>
        <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-800" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Label htmlFor="sound" className="text-base">Ovoz</Label>
          <p className="text-sm text-gray-500 dark:text-gray-400">Yangi xabarlar uchun ovoz chalinsin</p>
        </div>
        <Switch
          id="sound"
          checked={sound}
          onCheckedChange={(val) => {
            setSound(val);
            localStorage.setItem('soundEnabled', String(val));
            window.dispatchEvent(new CustomEvent('settings-sound-changed', { detail: { enabled: val } }));
          }}
          className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-800"
        />
      </div>
    </div>
  );

  const NotificationsSection = () => (
    <div className="space-y-6">
      <SectionHeader title="Bildirishnomalar" desc="Xabarnomalar sozlamalari" />
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Label htmlFor="notifications" className="text-base">Yangi xabarlar</Label>
          <p className="text-sm text-gray-500 dark:text-gray-400">Yangi xabarlarda bildirish berilsin</p>
        </div>
        <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-800" />
      </div>
    </div>
  );

  const AdvancedSection = () => (
    <div className="space-y-6">
      <SectionHeader title="Qoʻshimcha" desc="Ilovaning qoʻshimcha parametrlarini boshqaring" />
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Label htmlFor="hide-phone" className="text-base">Telefon raqamini yashirish</Label>
          <p className="text-sm text-gray-500 dark:text-gray-400">Profilingizda telefon raqami ko‘rinmasin</p>
        </div>
        <Switch
          id="hide-phone"
          checked={hidePhone}
          onCheckedChange={(val) => {
            setHidePhone(val);
            localStorage.setItem('hidePhoneNumber', String(val));
            window.dispatchEvent(new CustomEvent('settings-hide-phone-changed', { detail: { hidden: val } }));
          }}
          className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-800"
        />
      </div>
    </div>
  );
  const renderContent = () => {
    switch (active) {
      case 'chat':
        return <ChatSettingsSection />;
      case 'notifications':
        return <NotificationsSection />;
      case 'advanced':
        return <AdvancedSection />;
      default:
        return <ChatSettingsSection />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden dark:bg-gray-900">
        <div className="flex h-[560px]">
          {/* Left sidebar */}
          <div className="w-64 border-r bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <DialogHeader className="p-4">
              <DialogTitle className="text-base">Sozlamalar</DialogTitle>
              <DialogDescription className="text-xs">Chat sozlamalari</DialogDescription>
            </DialogHeader>
            <div className="px-2 pb-2 space-y-1 overflow-y-auto h-full">
              {sections.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    active === s.key
                      ? 'bg-blue-600 text-white dark:bg-blue-700'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* Right content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {renderContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;