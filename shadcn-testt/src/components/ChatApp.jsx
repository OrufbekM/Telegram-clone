import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/use-toast";
import { useSocket } from "../hooks/useSocket";
import { useGroups } from "../hooks/useGroups";
import { useChannels } from "../hooks/useChannels";
import { useUsers } from "../hooks/useUsers";
import { useChat } from "../hooks/useChat";
import { storage } from "../utils/storageUtils";
import LoginScreen from "./LoginScreen";
import ChatSidebar from "./ChatSidebar";
import ChatArea from "./ChatArea";
import WelcomeScreen from "./WelcomeScreen";
import CreateGroupDialog from "./CreateGroupDialog";
import CreateChannelDialog from "./CreateChannelDialog";
import UserInfoDialog from "./UserInfoDialog";
import EntityInfoDialog from "./EntityInfoDialog";
const ChatApp = () => {
  const [user, setUser] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [chatType, setChatType] = useState("private");
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showCreateChannelDialog, setShowCreateChannelDialog] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [entityInfo, setEntityInfo] = useState(null);
  const [userStatuses, setUserStatuses] = useState({});
  const [allChats, setAllChats] = useState({ groups: [], channels: [], privateChats: [] });
  const [isChatsLoading, setIsChatsLoading] = useState(false);
  const [hasLoadedChats, setHasLoadedChats] = useState(false);
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { getUserProfile } = useAuth();
  const { getUserGroups } = useGroups();
  const { getUserChannels } = useChannels();
  const { getPrivateChats } = useUsers();
  const { clearChatHistory, deleteChat } = useChat();
  const { toast } = useToast();
  const handleStatusUpdate = (statusData) => {
    const { userId, isOnline, lastSeen } = statusData;
    setUserStatuses(prev => {
      const newStatuses = {
        ...prev,
        [userId]: {
          isOnline,
          lastSeen
        }
      };
      if (currentChat && (chatType === 'group' || chatType === 'channel')) {
        window.dispatchEvent(new CustomEvent('group-member-status-changed', {
          detail: {
            groupId: currentChat.id,
            userId,
            isOnline,
            lastSeen
          }
        }));
      }
      window.dispatchEvent(new CustomEvent('user-status-update-global', {
        detail: {
          userId,
          isOnline,
          lastSeen
        }
      }));
      return newStatuses;
    });
  };
  const handleWebSocketMessage = (messageData) => {
    if (messageData) {
      if (messageData.chatId) {
        window.dispatchEvent(new CustomEvent('real-time-message', { 
          detail: messageData 
        }));
      }
      if (messageData.type === 'chatDeleted' || messageData.chatDeleted) {
        const deletionData = messageData.data || messageData.chatDeleted || messageData;
        window.dispatchEvent(new CustomEvent('chat-deleted', {
          detail: deletionData
        }));
        if (currentChat && currentChat.id === deletionData.chatId) {
          setCurrentChat(null);
          const cacheKey = `currentChat_${user?.id}`;
          storage.removePersistent(cacheKey);
          storage.removePersistent('currentChat');
          navigate('/chat', { replace: true });
          toast({
            title: "Chat o'chirildi",
            description: "Bu chat o'chirilgan va sizning panlingizdan ham olib tashlandi",
            variant: "destructive",
          });
        }
      }
      if (messageData.type === 'chatHistoryCleared') {
        const clearedBy = messageData.data?.clearedBy;
        window.dispatchEvent(new CustomEvent('chat-history-cleared', {
          detail: {
            ...messageData.data,
            clearedBy: clearedBy
          }
        }));
      }
    }
  };
  const { socket, getCurrentSocket, sendChatViewEvent, sendMessageViewEvent, endMessageViewEvent, clearChatHistory: clearHistoryViaWebSocket } = useSocket(user?.id, handleWebSocketMessage, handleStatusUpdate);
  useEffect(() => {
    if (user) {
      loadAllChats();
    }
  }, [user]);
  useEffect(() => {
    if (currentChat && chatType && user?.id) {
      const cacheKey = `currentChat_${user.id}`;
      storage.setPersistent(cacheKey, JSON.stringify({ chat: currentChat, type: chatType }));
      storage.setPersistent('currentChat', JSON.stringify({ chat: currentChat, type: chatType }));
    }
  }, [currentChat, chatType, user?.id]);
  useEffect(() => {
    if (user?.id && !currentChat && !chatId && hasLoadedChats && !isChatsLoading) {
      const userCacheKey = `currentChat_${user.id}`;
      const persistedChat = storage.getPersistent(userCacheKey) || storage.getPersistent('currentChat');
      if (persistedChat) {
        try {
          const { chat, type } = JSON.parse(persistedChat);
          console.log('рџ’ѕ Loading persisted chat from localStorage:', chat.id);
          const allAvailableChats = [...allChats.groups, ...allChats.channels, ...allChats.privateChats];
          const chatExists = allAvailableChats.some(c => (c.id || c.chatId).toString() === chat.id.toString());
          if (chatExists) {
            navigate(`/chat/${chat.id}`, { replace: true });
          } else {
            storage.removePersistent(userCacheKey);
            storage.removePersistent('currentChat');
          }
        } catch (error) {
          console.error('Error loading persisted chat:', error);
          storage.removePersistent(userCacheKey);
          storage.removePersistent('currentChat');
        }
      }
    }
  }, [user?.id, chatId, navigate, hasLoadedChats, isChatsLoading, currentChat, allChats]);
  useEffect(() => {
    const token = storage.getPersistent("chatToken");
    const userData = storage.getPersistent("chatUser");
    if (token && userData) {
      const userObj = JSON.parse(userData);
      setUser(userObj);
      fetchUserProfile(token, userObj.id);
      if (chatId && !currentChat) {
        console.log('рџ”„ Page refresh detected with chatId:', chatId, 'preparing to load chat after authentication');
      }
    }
  }, []);
  useEffect(() => {
    const handler = (e) => setUserInfo(e.detail);
    window.addEventListener("open-user-info", handler);
    return () => window.removeEventListener("open-user-info", handler);
  }, []);
  useEffect(() => {
    const handleChatDeleted = (e) => {
      const { chatType, chatId } = e.detail || {};
      const openedId = currentChat?.id || currentChat?.chatId;
      if (!openedId) return;
      if (parseInt(openedId) === parseInt(chatId)) {
        setCurrentChat(null);
        const cacheKey = user?.id ? `currentChat_${user.id}` : 'currentChat';
        storage.removePersistent(cacheKey);
        storage.removePersistent('currentChat');
        navigate('/chat', { replace: true });
      }
    };
    window.addEventListener('chat-deleted', handleChatDeleted);
    return () => window.removeEventListener('chat-deleted', handleChatDeleted);
  }, [currentChat, user?.id, navigate]);
  useEffect(() => {
    const startHandler = (e) => {
      window.dispatchEvent(
        new CustomEvent("sidebar-start-chat", { detail: e.detail })
      );
    };
    window.addEventListener("start-private-chat", startHandler);
    return () => window.removeEventListener("start-private-chat", startHandler);
  }, []);
  useEffect(() => {
    const openCreateChannel = () => setShowCreateChannelDialog(true);
    window.addEventListener("open-create-channel", openCreateChannel);
    return () =>
      window.removeEventListener("open-create-channel", openCreateChannel);
  }, []);
  useEffect(() => {
    const handleCurrentChatUpdate = (event) => {
      const { chatId, updates } = event.detail;
      if (currentChat && currentChat.id === chatId) {
        setCurrentChat(prev => ({
          ...prev,
          ...updates
        }));
      }
    };
    const handleOnlineCountUpdate = (event) => {
      const { groupId, onlineCount } = event.detail;
      if (currentChat && currentChat.id === groupId && (chatType === 'group' || chatType === 'channel')) {
        setCurrentChat(prev => ({
          ...prev,
          onlineMembersCount: onlineCount
        }));
      }
      setAllChats(prev => ({
        ...prev,
        groups: prev.groups.map(group => 
          group.id === groupId ? { ...group, onlineMembersCount: onlineCount } : group
        ),
        channels: prev.channels.map(channel => 
          channel.id === groupId ? { ...channel, onlineMembersCount: onlineCount } : channel
        )
      }));
    };
    const handleGroupInfoUpdate = (event) => {
      const { groupId, avatar, updatedBy } = event.detail;
      console.log('рџ“ќ ChatApp: Group info update received:', { groupId, avatar, updatedBy });
      if (currentChat && currentChat.id === groupId && (chatType === 'group' || chatType === 'channel')) {
        setCurrentChat(prev => {
          const updated = { ...prev };
          if (avatar !== undefined) updated.avatar = avatar;
          return updated;
        });
      }
      setAllChats(prev => ({
        ...prev,
        groups: prev.groups.map(group => {
          if (group.id === groupId) {
            const updated = { ...group };
            if (avatar !== undefined) updated.avatar = avatar;
            return updated;
          }
          return group;
        }),
        channels: prev.channels.map(channel => {
          if (channel.id === groupId) {
            const updated = { ...channel };
            if (avatar !== undefined) updated.avatar = avatar;
            return updated;
          }
          return channel;
        })
      }));
    };
    window.addEventListener('update-current-chat', handleCurrentChatUpdate);
    window.addEventListener('group-online-count-updated', handleOnlineCountUpdate);
    window.addEventListener('group-info-updated', handleGroupInfoUpdate);
    return () => {
      window.removeEventListener('update-current-chat', handleCurrentChatUpdate);
      window.removeEventListener('group-online-count-updated', handleOnlineCountUpdate);
      window.removeEventListener('group-info-updated', handleGroupInfoUpdate);
    };
  }, [currentChat, chatType]);
  useEffect(() => {
    const handleDeletedChatError = (e) => {
      const { chatType, chatId, error } = e.detail;
      if (currentChat && currentChat.id === chatId) {
        setCurrentChat(null);
        navigate('/chat', { replace: true });
        toast({
          title: "Chat o'chirilgan",
          description: "Bu chat o'chirilgan, asosiy sahifaga qaytdingiz",
          variant: "destructive",
        });
      }
    };
    window.addEventListener("chat-deleted-error", handleDeletedChatError);
    return () => window.removeEventListener("chat-deleted-error", handleDeletedChatError);
  }, [currentChat, navigate]);
  useEffect(() => {
    const handleClearHistorySuccess = (e) => {
      const { chatType, chatId, clearedBy } = e.detail;
      toast({
        title: "Tarix tozalandi",
        description: "Chat tarixi muvaffaqiyatli tozalandi",
      });
    };
    window.addEventListener("clear-history-success", handleClearHistorySuccess);
    return () => window.removeEventListener("clear-history-success", handleClearHistorySuccess);
  }, []);
  useEffect(() => {
    const handleClearHistoryError = (e) => {
      const { chatType, chatId, error } = e.detail;
      toast({
        title: "Xatolik!",
        description: error || "Tarixni tozalashda xatolik yuz berdi",
        variant: "destructive",
      });
    };
    window.addEventListener("clear-history-error", handleClearHistoryError);
    return () => window.removeEventListener("clear-history-error", handleClearHistoryError);
  }, []);
  const loadAllChats = async () => {
    const token = storage.getPersistent("chatToken");
    if (!token) return;
    console.log('рџ“Ґ Starting to load chats...');
    setIsChatsLoading(true);
    setHasLoadedChats(false);
    try {
      const [groupsData, channelsData, privateChatsData] = await Promise.all([
        getUserGroups(token),
        getUserChannels(token),
        getPrivateChats(token)
      ]);
      const newChats = {
        groups: groupsData.groups || [],
        channels: channelsData.channels || [],
        privateChats: privateChatsData.privateChats || privateChatsData.chats || []
      };
      console.log('вњ… Chats loaded successfully:', {
        groups: newChats.groups.length,
        channels: newChats.channels.length,
        privateChats: newChats.privateChats.length
      });
      setAllChats(newChats);
      setHasLoadedChats(true);
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setIsChatsLoading(false);
    }
  };
  const selectChatFromUrl = (chatId) => {
    console.log('рџ”Ќ SelectChatFromUrl called with chatId:', chatId);
    console.log('рџ“‹ Available chats:', { 
      groups: allChats.groups.length, 
      channels: allChats.channels.length, 
      privateChats: allChats.privateChats.length,
      hasLoadedChats,
      isChatsLoading
    });
    if (isChatsLoading || !hasLoadedChats) {
      console.log('вљ пёЏ SelectChatFromUrl called while chats are still loading or not loaded yet');
      return;
    }
    const group = allChats.groups.find(g => g.id.toString() === chatId);
    const channel = allChats.channels.find(c => c.id.toString() === chatId);
    const privateChat = allChats.privateChats.find(p => (p.chatId || p.id).toString() === chatId);
    if (group) {
      if (!currentChat || currentChat.id !== group.id || chatType !== "group") {
        setCurrentChat(group);
        setChatType("group");
      }
    } else if (channel) {
      if (!currentChat || currentChat.id !== channel.id || chatType !== "channel") {
        setCurrentChat(channel);
        setChatType("channel");
      }
    } else if (privateChat) {
      if (!currentChat || (currentChat.chatId || currentChat.id) !== (privateChat.chatId || privateChat.id) || chatType !== "private") {
        setCurrentChat(privateChat);
        setChatType("private");
      }
    } else {
      setCurrentChat(null);
      if (user?.id) {
        const cacheKey = `currentChat_${user.id}`;
        storage.removePersistent(cacheKey);
        storage.removePersistent('currentChat');
      }
      navigate('/chat', { replace: true });
    }
  };
  const fetchUserProfile = async (token, userId) => {
    try {
      const userData = await getUserProfile(token, userId);
      setUser((prev) => ({ ...prev, ...userData }));
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    fetchUserProfile(storage.getPersistent("chatToken"), userData.id);
  };
  const handleChatSelect = (chat, type) => {
    const currentChatId = currentChat?.id || currentChat?.chatId;
    const newChatId = chat.id || chat.chatId;
    setCurrentChat(chat);
    setChatType(type);
    setTimeout(() => {
      const targetUrl = `/chat/${newChatId}`;
      navigate(targetUrl);
    }, 0);
  };
  const handleDeleteChat = async (chat, type) => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;
      if (type === 'private') {
        const cacheKey = `sidebar_private_chats_${user?.id}`;
        const cachedPrivateChats = storage.getSession(cacheKey);
        if (cachedPrivateChats) {
          const chats = JSON.parse(cachedPrivateChats);
          const updatedChats = chats.filter(c => (c.chatId || c.id) !== chat.id);
          storage.setSession(cacheKey, JSON.stringify(updatedChats));
        }
      } else if (type === 'group') {
        const groupsCacheKey = `sidebar_groups_${user?.id}`;
        const membershipsCacheKey = `sidebar_group_memberships_${user?.id}`;
        const cachedGroups = storage.getSession(groupsCacheKey);
        if (cachedGroups) {
          const groups = JSON.parse(cachedGroups);
          const updatedGroups = groups.filter(g => g.id !== chat.id);
          storage.setSession(groupsCacheKey, JSON.stringify(updatedGroups));
        }
        const cachedMemberships = storage.getSession(membershipsCacheKey);
        if (cachedMemberships) {
          const memberships = JSON.parse(cachedMemberships);
          delete memberships[chat.id];
          storage.setSession(membershipsCacheKey, JSON.stringify(memberships));
        }
      }
      const currentChatCacheKey = `currentChat_${user?.id}`;
      const cachedCurrentChat = storage.getPersistent(currentChatCacheKey);
      if (cachedCurrentChat) {
        const { chat: currentCachedChat } = JSON.parse(cachedCurrentChat);
        if (currentCachedChat && currentCachedChat.id === chat.id) {
          storage.removePersistent(currentChatCacheKey);
        }
      } else {
        const oldCachedCurrentChat = storage.getPersistent('currentChat');
        if (oldCachedCurrentChat) {
          const { chat: currentCachedChat } = JSON.parse(oldCachedCurrentChat);
          if (currentCachedChat && currentCachedChat.id === chat.id) {
            storage.removePersistent('currentChat');
          }
        }
      }
      await deleteChat(token, type, chat.id);
      setCurrentChat(null);
      navigate('/chat');
      window.dispatchEvent(new CustomEvent('chat-deleted', {
        detail: {
          chatType: type,
          chatId: chat.id,
          deletedBy: user?.id,
          timestamp: new Date().toISOString()
        }
      }));
      await loadAllChats();
      toast({
        title: "Chat o'chirildi",
        description: "Chat muvaffaqiyatli o'chirildi va barcha joylardan tozalandi",
      });
    } catch (error) {
      console.error('Delete chat error:', error);
      toast({
        title: "Xatolik!",
        description: error.message || "Chatni o'chirishda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };
  const handleClearHistory = async (chat, type) => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;
      await clearChatHistory(token, type, chat.id);
      const userId = user?.id;
      if (userId) {
        const cacheKey = `messages_${userId}_${type}_${chat.id}`;
        storage.removeSession(cacheKey);
        const oldCacheKey = `messages_${type}_${chat.id}`;
        storage.removeSession(oldCacheKey);
      }
      if (currentChat?.id === chat.id) {
        window.dispatchEvent(new CustomEvent('chat-history-cleared', {
          detail: { 
            chatId: chat.id, 
            chatType: type, 
            clearedBy: user?.id 
          }
        }));
      }
      if (clearHistoryViaWebSocket) {
        clearHistoryViaWebSocket(type, chat.id);
      }
      toast({
        title: "Tarix tozalandi",
        description: "Chat tarixi muvaffaqiyatli tozalandi",
      });
    } catch (error) {
      console.error('Clear history error:', error);
      toast({
        title: "Xatolik!",
        description: error.message || "Tarixni tozalashda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };
  const handleCreateGroup = () => {
    setShowCreateGroupDialog(true);
  };
  const handleGroupCreated = () => {
  };
  const handleChannelCreated = () => {
  };
  const handleLogout = () => {
    storage.removePersistent("chatToken");
    storage.removePersistent("chatUser");
    if (user?.id) {
      const cacheKey = `currentChat_${user.id}`;
      storage.removePersistent(cacheKey);
    }
    storage.removePersistent('currentChat');
    storage.clearSessionData();
    setUser(null);
    setCurrentChat(null);
    setChatType("private");
    toast({
      title: "Chiqildi",
      description: "Tizimdan chiqildi",
    });
  };
  const handleMessageSent = (message) => {
  };
  if (!user) {
    return <LoginScreen onAuthSuccess={handleAuthSuccess} />;
  }
  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex">
      <ChatSidebar
        currentChat={currentChat}
        currentChatType={chatType}
        onChatSelect={handleChatSelect}
        onCreateGroup={handleCreateGroup}
        onLogout={handleLogout}
        user={user}
        onEntityInfoOpen={setEntityInfo}
        userStatuses={userStatuses} 
        isChatsLoading={isChatsLoading}
        hasLoadedChats={hasLoadedChats}
      />
      {currentChat ? (
        <ChatArea
          currentChat={currentChat}
          chatType={chatType}
          user={user}
          onMessageSent={handleMessageSent}
          sendChatViewEvent={sendChatViewEvent}
          sendMessageViewEvent={sendMessageViewEvent}
          endMessageViewEvent={endMessageViewEvent}
          onDeleteChat={() => handleDeleteChat(currentChat, chatType)}
          onClearHistory={() => handleClearHistory(currentChat, chatType)}
          socket={getCurrentSocket()}
          userStatuses={userStatuses}
        />
      ) : (
        <WelcomeScreen
          onCreateGroup={handleCreateGroup}
          onSearchUsers={() => {
          }}
        />
      )}
      <CreateGroupDialog
        open={showCreateGroupDialog}
        onOpenChange={setShowCreateGroupDialog}
        onGroupCreated={handleGroupCreated}
      />
      <CreateChannelDialog
        open={showCreateChannelDialog}
        onOpenChange={setShowCreateChannelDialog}
        onChannelCreated={handleChannelCreated}
      />
      <UserInfoDialog
        open={!!userInfo}
        onOpenChange={() => setUserInfo(null)}
        user={userInfo}
      />
      <EntityInfoDialog
        open={!!entityInfo}
        onOpenChange={() => setEntityInfo(null)}
        entity={entityInfo}
      />
    </div>
  );
};
export default ChatApp;

