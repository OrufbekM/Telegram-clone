import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import {
  Search,
  Plus,
  Users,
  Hash,
  Lock,
  MessageCircle,
  LogOut,
  Folder,
  User,
  LayoutGrid,
  Megaphone,
  X,
  Menu
} from "lucide-react";
import { useGroups } from "../hooks/useGroups";
import { useUsers } from "../hooks/useUsers";
import { useSearch } from "../hooks/useSearch";
import { useAuth } from "../hooks/useAuth";
import { usePrivateChats } from "../hooks/usePrivateChats";
import { useChannels } from "../hooks/useChannels";
import { useToast } from "../hooks/use-toast";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
import GroupLeaveModal from "./GroupLeaveModal";
import OnlineStatusIndicator from "./OnlineStatusIndicator";
import AvatarWithStatus from "./AvatarWithStatus";
import ProfileDialog from "./ProfileDialog";
import ProfileSheet from "./ProfileSheet";
import EntityInfoDialog from "./EntityInfoDialog";
import { storage } from "../utils/storageUtils";

const ChatSidebar = ({
  currentChat,
  currentChatType,
  onChatSelect,
  onCreateGroup,
  onLogout,
  user,
  userStatuses = {},
  isChatsLoading = false,
  hasLoadedChats = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ users: [], groups: [] });
  const [searchType, setSearchType] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  // State variables that were missing
  const [groups, setGroups] = useState([]);
  const [channels, setChannels] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [groupMemberships, setGroupMemberships] = useState({});
  const [channelMemberships, setChannelMemberships] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [infoEntity, setInfoEntity] = useState(null);

  // Refs
  const searchInputRef = useRef(null);
  const API_URL = "http://localhost:3000";
  const toAbsoluteUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `${API_URL}${url}`;
  };

  const { getUserGroups, joinGroup, leaveGroup, checkGroupStatus } =
    useGroups();
  const { getPrivateChats } = useUsers();
  const { startPrivateChat } = usePrivateChats();
  const { universalSearch } = useSearch();
  const { getUserProfile } = useAuth();
  const { toast } = useToast();
  const {
    createChannel,
    getUserChannels,
    joinChannel,
    leaveChannel,
    getChannelStatus,
  } = useChannels();
  const {
    unreadCounts,
    getUnreadCountFromState,
    clearUnreadCount,
    incrementUnreadCount,
  } = useUnreadMessages(user, currentChat, currentChatType);

  // Handle profile updates via WebSocket
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      const { userId, updates } = event.detail;
      
      // Update private chats
      setPrivateChats(prevChats => 
        prevChats.map(chat => {
          if (chat?.user?.id === userId) {
            return {
              ...chat,
              user: {
                ...chat.user,
                ...updates
              }
            };
          }
          return chat;
        })
      );

      // Update group members
      setGroups(prevGroups => 
        prevGroups.map(group => {
          const updatedMembers = group.members?.map(member => 
            member.id === userId ? { ...member, ...updates } : member
          );
          return {
            ...group,
            members: updatedMembers || group.members
          };
        })
      );

      // Update channel members
      setChannels(prevChannels => 
        prevChannels.map(channel => {
          const updatedMembers = channel.members?.map(member => 
            member.id === userId ? { ...member, ...updates } : member
          );
          return {
            ...channel,
            members: updatedMembers || channel.members
          };
        })
      );
    };

    window.addEventListener('user-profile-updated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    const listener = async (e) => {
      const targetUser = e.detail;
      await handleStartPrivateChat(targetUser);
      window.dispatchEvent(new Event("focus-message-input"));
    };
    window.addEventListener("sidebar-start-chat", listener);
    return () => window.removeEventListener("sidebar-start-chat", listener);
  }, []);

  useEffect(() => {
    const handleGroupCreated = (e) => {
      const newGroup = e.detail;
      setGroups((prev) => {
        const updatedGroups = [...prev, newGroup];
        const cacheKey = `sidebar_groups_${user?.id}`;
        storage.setSession(cacheKey, JSON.stringify(updatedGroups));
        return updatedGroups;
      });
      setGroupMemberships((prev) => {
        const updated = {
          ...prev,
          [newGroup.id]: { isMember: true, role: "creator" },
        };
        const membershipsCacheKey = `sidebar_group_memberships_${user?.id}`;
        storage.setSession(membershipsCacheKey, JSON.stringify(updated));
        return updated;
      });
    };

    const handleChannelCreated = (e) => {
      const newChannel = e.detail;
      setChannels((prev) => {
        const updatedChannels = [...prev, newChannel];
        const cacheKey = `sidebar_channels_${user?.id}`;
        storage.setSession(cacheKey, JSON.stringify(updatedChannels));
        return updatedChannels;
      });
      setChannelMemberships((prev) => {
        const updated = {
          ...prev,
          [newChannel.id]: { isMember: true, role: "creator" },
        };
        const membershipsCacheKey = `sidebar_channel_memberships_${user?.id}`;
        storage.setSession(membershipsCacheKey, JSON.stringify(updated));
        return updated;
      });
    };

    const handleGroupJoined = (e) => {
      const joinedGroup = e.detail;
      setGroups((prev) => {
        const exists = prev.find((g) => g.id === joinedGroup.id);
        if (!exists) {
          const updatedGroups = [...prev, joinedGroup];
          const cacheKey = `sidebar_groups_${user?.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedGroups));
          return updatedGroups;
        }
        return prev;
      });
      setGroupMemberships((prev) => {
        const updated = {
          ...prev,
          [joinedGroup.id]: { isMember: true, role: "member" },
        };
        const membershipsCacheKey = `sidebar_group_memberships_${user?.id}`;
        storage.setSession(membershipsCacheKey, JSON.stringify(updated));
        return updated;
      });
    };

    const handleChannelJoined = (e) => {
      const joinedChannel = e.detail;
      setChannels((prev) => {
        const exists = prev.find((c) => c.id === joinedChannel.channelId);
        if (!exists) {
          const updatedChannels = [...prev, joinedChannel.channel];
          const cacheKey = `sidebar_channels_${user?.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedChannels));
          return updatedChannels;
        }
        return prev;
      });
      setChannelMemberships((prev) => {
        const updated = {
          ...prev,
          [joinedChannel.channelId]: { isMember: true, role: "member" },
        };
        const membershipsCacheKey = `sidebar_channel_memberships_${user?.id}`;
        storage.setSession(membershipsCacheKey, JSON.stringify(updated));
        return updated;
      });
    };

    const handleChatDeleted = (e) => {
      const { chatType, chatId, deletedBy } = e.detail;
      if (
        currentChat &&
        (currentChat.id === chatId || currentChat.id === parseInt(chatId)) &&
        (currentChat.type === chatType || chatType === "private")
      ) {
        onChatSelect(null, null);
        storage.removeSession("currentChat");
      }
      if (chatType === "private") {
        setPrivateChats((prev) => {
          const beforeCount = prev.length;
          const updatedChats = prev.filter((chat) => {
            const chatIdToCheck = chat.chatId || chat.id;
            const shouldKeep =
              chatIdToCheck != chatId &&
              parseInt(chatIdToCheck) !== parseInt(chatId);
            return shouldKeep;
          });
          const cacheKey = `sidebar_private_chats_${user?.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedChats));
          return [...updatedChats];
        });
      } else if (chatType === "group") {
        setGroups((prev) => {
          const beforeCount = prev.length;
          const updatedGroups = prev.filter((group) => {
            const shouldKeep =
              group.id != chatId && parseInt(group.id) !== parseInt(chatId);
            return shouldKeep;
          });
          const cacheKey = `sidebar_groups_${user?.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedGroups));
          return [...updatedGroups];
        });
      } else if (chatType === "channel") {
        setChannels((prev) => {
          const beforeCount = prev.length;
          const updatedChannels = prev.filter((channel) => {
            const shouldKeep =
              channel.id != chatId && parseInt(channel.id) !== parseInt(chatId);
            return shouldKeep;
          });
          const cacheKey = `sidebar_channels_${user?.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedChannels));
          return [...updatedChannels];
        });
      }
    };

    const handleRealTimeMessage = (e) => {
      const message = e.detail;
      if (message.chatType === "private") {
        setPrivateChats((prev) => {
          const updatedChats = prev.map((chat) => {
            const chatId = chat.chatId || chat.id;
            if (
              chatId === message.chatId ||
              parseInt(chatId) === parseInt(message.chatId)
            ) {
              const updatedChat = {
                ...chat,
                lastMessage: {
                  id: message.id,
                  content: message.content,
                  timestamp: message.timestamp,
                  userId: message.user.id,
                },
                lastMessageAt: message.timestamp,
              };
              return updatedChat;
            }
            return chat;
          });
          const cacheKey = `sidebar_private_chats_${user?.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedChats));
          return updatedChats;
        });
      } else if (message.chatType === "group") {
        // Handle group message updates
        setGroups((prev) => {
          const updatedGroups = prev.map((group) => {
            if (group.id === message.chatId) {
              return {
                ...group,
                lastMessage: {
                  id: message.id,
                  content: message.content,
                  timestamp: message.timestamp,
                  userId: message.user?.id,
                },
                lastMessageAt: message.timestamp,
              };
            }
            return group;
          });
          const cacheKey = `sidebar_groups_${user?.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedGroups));
          return updatedGroups;
        });
      } else if (message.chatType === "channel") {
        // Handle channel message updates
        setChannels((prev) => {
          const updatedChannels = prev.map((channel) => {
            if (channel.id === message.chatId) {
              return {
                ...channel,
                lastMessage: {
                  id: message.id,
                  content: message.content,
                  timestamp: message.timestamp,
                  userId: message.user?.id,
                },
                lastMessageAt: message.timestamp,
              };
            }
            return channel;
          });
          const cacheKey = `sidebar_channels_${user?.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedChannels));
          return updatedChannels;
        });
      }
    };

    const handleGlobalUserStatusUpdate = (e) => {
      const { userId, isOnline } = e.detail;
      setGroups((prev) =>
        prev.map((group) => {
          return group;
        })
      );
    };

    const handleGroupOnlineCountUpdate = (e) => {
      const { groupId, onlineCount } = e.detail;
      setGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? { ...group, onlineMembersCount: onlineCount }
            : group
        )
      );
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === groupId
            ? { ...channel, onlineMembersCount: onlineCount }
            : channel
        )
      );
      const groupsCacheKey = `sidebar_groups_${user?.id}`;
      const channelsCacheKey = `sidebar_channels_${user?.id}`;
      setGroups((current) => {
        const cacheKey = groupsCacheKey;
        storage.setSession(cacheKey, JSON.stringify(current));
        return current;
      });
      setChannels((current) => {
        const cacheKey = channelsCacheKey;
        storage.setSession(cacheKey, JSON.stringify(current));
        return current;
      });
    };

    const handleGroupInfoUpdate = (e) => {
      const { groupId, avatar, updatedBy } = e.detail;
      console.log("рџ“ќ Group info update received:", {
        groupId,
        avatar,
        updatedBy,
      });
      setGroups((prev) =>
        prev.map((group) => {
          if (group.id === groupId) {
            const updatedGroup = { ...group };
            if (avatar !== undefined) updatedGroup.avatar = avatar;
            return updatedGroup;
          }
          return group;
        })
      );
      setChannels((prev) =>
        prev.map((channel) => {
          if (channel.id === groupId) {
            const updatedChannel = { ...channel };
            if (avatar !== undefined) updatedChannel.avatar = avatar;
            return updatedChannel;
          }
          return channel;
        })
      );
      const groupsCacheKey = `sidebar_groups_${user?.id}`;
      const channelsCacheKey = `sidebar_channels_${user?.id}`;
      setTimeout(() => {
        setGroups((current) => {
          storage.setSession(groupsCacheKey, JSON.stringify(current));
          return current;
        });
        setChannels((current) => {
          storage.setSession(channelsCacheKey, JSON.stringify(current));
          return current;
        });
      }, 100);
    };

    const handleChannelInfoUpdate = (e) => {
      const { channelId, updates, updatedBy } = e.detail;
      console.log("рџ“ќ Channel info update received:", {
        channelId,
        updates,
        updatedBy,
      });
      setChannels((prev) =>
        prev.map((channel) => {
          if (channel.id === channelId) {
            return { ...channel, ...updates };
          }
          return channel;
        })
      );
      const channelsCacheKey = `sidebar_channels_${user?.id}`;
      setTimeout(() => {
        setChannels((current) => {
          storage.setSession(channelsCacheKey, JSON.stringify(current));
          return current;
        });
      }, 100);
    };

    const handlePrivateChatCreated = (e) => {
      const chatData = e.detail?.chatData;
      if (chatData) {
        setPrivateChats((prev) => {
          const exists = prev.find(
            (chat) =>
              (chat.id || chat.chatId) === (chatData.id || chatData.chatId)
          );
          if (!exists) {
            const updatedChats = [...prev, chatData];
            const cacheKey = `sidebar_private_chats_${user?.id}`;
            storage.setSession(cacheKey, JSON.stringify(updatedChats));
            return updatedChats;
          }
          return prev;
        });
      }
    };

    const handleNewMessage = (e) => {
      // Handle new message for updating last message in chat list
      const message = e.detail;
      if (message && message.chatType === "private") {
        setPrivateChats((prev) => {
          const updatedChats = prev.map((chat) => {
            const chatId = chat.chatId || chat.id;
            if (
              chatId === message.chatId ||
              parseInt(chatId) === parseInt(message.chatId)
            ) {
              return {
                ...chat,
                lastMessage: {
                  id: message.id,
                  content: message.content,
                  timestamp: message.timestamp,
                  userId: message.user?.id,
                },
                lastMessageAt: message.timestamp,
              };
            }
            return chat;
          });
          const cacheKey = `sidebar_private_chats_${user?.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedChats));
          return updatedChats;
        });
      } else if (message && message.chatType === "group") {
        // Handle group message updates
        setGroups((prev) => {
          const updatedGroups = prev.map((group) => {
            if (group.id === message.chatId) {
              return {
                ...group,
                lastMessage: {
                  id: message.id,
                  content: message.content,
                  timestamp: message.timestamp,
                  userId: message.user?.id,
                },
                lastMessageAt: message.timestamp,
              };
            }
            return group;
          });
          const cacheKey = `sidebar_groups_${user?.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedGroups));
          return updatedGroups;
        });
      } else if (message && message.chatType === "channel") {
        // Handle channel message updates
        setChannels((prev) => {
          const updatedChannels = prev.map((channel) => {
            if (channel.id === message.chatId) {
              return {
                ...channel,
                lastMessage: {
                  id: message.id,
                  content: message.content,
                  timestamp: message.timestamp,
                  userId: message.user?.id,
                },
                lastMessageAt: message.timestamp,
              };
            }
            return channel;
          });
          const cacheKey = `sidebar_channels_${user?.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedChannels));
          return updatedChannels;
        });
      }
    };

    const handleChannelLeft = (e) => {
      const { channelId, userId } = e.detail;
      if (parseInt(userId) === parseInt(user?.id)) {
        setChannels((prev) => {
          const updatedChannels = prev.filter(
            (channel) => channel.id !== channelId
          );
          const cacheKey = `sidebar_channels_${user?.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedChannels));
          return updatedChannels;
        });
        setChannelMemberships((prev) => {
          const updated = { ...prev };
          delete updated[channelId];
          const membershipsCacheKey = `sidebar_channel_memberships_${user?.id}`;
          storage.setSession(membershipsCacheKey, JSON.stringify(updated));
          return updated;
        });
      }
    };

    const handleChannelDeleted = (e) => {
      const { channelId, deletedBy } = e.detail;
      setChannels((prev) => {
        const updatedChannels = prev.filter(
          (channel) => channel.id !== channelId
        );
        const cacheKey = `sidebar_channels_${user?.id}`;
        storage.setSession(cacheKey, JSON.stringify(updatedChannels));
        return updatedChannels;
      });
      setChannelMemberships((prev) => {
        const updated = { ...prev };
        delete updated[channelId];
        const membershipsCacheKey = `sidebar_channel_memberships_${user?.id}`;
        storage.setSession(membershipsCacheKey, JSON.stringify(updated));
        return updated;
      });
      
      // If the deleted channel is the current chat, close it
      if (currentChat && currentChat.id === channelId && currentChatType === 'channel') {
        onChatSelect(null, null);
        storage.removeSession("currentChat");
      }
    };

    // Add listener for message read events to update unread counts
    const handleMessageRead = (e) => {
      const { chatType, chatId } = e.detail;
      // This will trigger a re-render to update unread counts
      if (chatType === "private") {
        setPrivateChats(prev => [...prev]);
      } else if (chatType === "group") {
        setGroups(prev => [...prev]);
      } else if (chatType === "channel") {
        setChannels(prev => [...prev]);
      }
    };

    // Add listener for user profile updates
    const handleUserProfileUpdate = (e) => {
      const updatedUser = e.detail;
      // Update private chats with updated user info
      setPrivateChats(prev => 
        prev.map(chat => {
          if (chat.otherUser?.id === updatedUser.id) {
            return {
              ...chat,
              otherUser: {
                ...chat.otherUser,
                ...updatedUser
              }
            };
          }
          return chat;
        })
      );
    };

    window.addEventListener("group-created", handleGroupCreated);
    window.addEventListener("channel-created", handleChannelCreated);
    window.addEventListener("group-joined", handleGroupJoined);
    window.addEventListener("channel-joined", handleChannelJoined);
    window.addEventListener("chat-deleted", handleChatDeleted);
    window.addEventListener("private-chat-created", handlePrivateChatCreated);
    window.addEventListener("new-message", handleNewMessage);
    window.addEventListener("message", handleRealTimeMessage);
    window.addEventListener("user-status-update-global", handleGlobalUserStatusUpdate);
    window.addEventListener("group-online-count-updated", handleGroupOnlineCountUpdate);
    window.addEventListener("group-info-updated", handleGroupInfoUpdate);
    window.addEventListener("channelInfoUpdated", handleChannelInfoUpdate);
    window.addEventListener("channelLeft", handleChannelLeft);
    window.addEventListener("channelDeleted", handleChannelDeleted);
    window.addEventListener("message-read", handleMessageRead);
    window.addEventListener("userProfileUpdated", handleUserProfileUpdate);

    const handleRefreshChannels = async () => {
      const token = storage.getPersistent("chatToken");
      if (!token) return;
      try {
        await fetchChannels(token);
      } catch (err) {
        console.error("Error refreshing channels after create:", err);
      }
    };
    window.addEventListener("channel-created", handleRefreshChannels);

    return () => {
      window.removeEventListener("group-created", handleGroupCreated);
      window.removeEventListener("channel-created", handleChannelCreated);
      window.removeEventListener("group-joined", handleGroupJoined);
      window.removeEventListener("channel-joined", handleChannelJoined);
      window.removeEventListener("chat-deleted", handleChatDeleted);
      window.removeEventListener("private-chat-created", handlePrivateChatCreated);
      window.removeEventListener("new-message", handleNewMessage);
      window.removeEventListener("message", handleRealTimeMessage);
      window.removeEventListener("user-status-update-global", handleGlobalUserStatusUpdate);
      window.removeEventListener("group-online-count-updated", handleGroupOnlineCountUpdate);
      window.removeEventListener("group-info-updated", handleGroupInfoUpdate);
      window.removeEventListener("channelInfoUpdated", handleChannelInfoUpdate);
      window.removeEventListener("channelLeft", handleChannelLeft);
      window.removeEventListener("channelDeleted", handleChannelDeleted);
      window.removeEventListener("message-read", handleMessageRead);
      window.removeEventListener("userProfileUpdated", handleUserProfileUpdate);
      window.removeEventListener("channel-created", handleRefreshChannels);
    };
  }, [user, currentChat, onChatSelect]);

  const fetchUserData = async () => {
    const token = storage.getPersistent("chatToken");
    if (!token) {
      return;
    }
    if (!isChatsLoading) {
      setIsLoading(true);
    }
    try {
      await Promise.all([
        fetchGroups(token),
        fetchPrivateChats(token),
        fetchChannels(token),
      ]);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      if (!isChatsLoading) {
        setIsLoading(false);
      }
    }
  };

  const fetchGroups = async (token) => {
    try {
      const data = await getUserGroups(token);
      const groupsData = data.groups || [];
      setGroups(groupsData);
      await checkAllGroupMemberships(token, groupsData);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchChannels = async (token) => {
    try {
      const data = await getUserChannels(token);
      const channelsData = data.channels || [];
      setChannels(channelsData);
      await checkAllChannelMemberships(token, channelsData);
    } catch (error) {
      console.error("Error fetching channels:", error);
    }
  };

  const checkAllGroupMemberships = async (token, groupsList) => {
    const memberships = {};
    for (const group of groupsList) {
      try {
        const status = await checkGroupStatus(token, group.id);
        memberships[group.id] = status;
      } catch (error) {
        console.error(
          `Error checking membership for group ${group.id}:`,
          error
        );
        memberships[group.id] = { isMember: false, canJoin: true };
      }
    }
    setGroupMemberships(memberships);
  };

  const checkAllChannelMemberships = async (token, channelsList) => {
    const memberships = {};
    for (const ch of channelsList) {
      try {
        const status = await getChannelStatus(token, ch.id);
        memberships[ch.id] = status;
      } catch (error) {
        console.error(`Error checking membership for channel ${ch.id}:`, error);
        memberships[ch.id] = { isMember: false, role: "none" };
      }
    }
    setChannelMemberships(memberships);
    const membershipsCacheKey = `sidebar_channel_memberships_${user?.id}`;
    storage.setSession(membershipsCacheKey, JSON.stringify(memberships));
  };

  const fetchPrivateChats = async (token) => {
    try {
      const data = await getPrivateChats(token);
      const list = data?.privateChats || data?.chats || [];
      const chatsArray = Array.isArray(list)
        ? list.filter((chat) => {
            const isValidChat =
              chat && chat.isActive !== false && chat.otherUser;
            return isValidChat;
          })
        : [];
      setPrivateChats(chatsArray);
      const cacheKey = `sidebar_private_chats_${user?.id}`;
      storage.setSession(cacheKey, JSON.stringify(chatsArray));
    } catch (error) {
      setPrivateChats([]);
      const cacheKey = `sidebar_private_chats_${user?.id}`;
      storage.removeSession(cacheKey);
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;
      await joinGroup(token, groupId);
      toast({
        title: "Guruhga qo'shildingiz!",
        description: "Endi xabar yozishingiz mumkin",
        variant: "default",
      });
      await fetchGroups(token);
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const handleLeaveGroup = async (groupId, role) => {
    const group = groups.find((g) => g.id === groupId);
    setSelectedGroup({ ...group, role });
    setLeaveModalOpen(true);
  };

  const confirmLeaveGroup = async (deleteForEveryone = false) => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;

      await leaveGroup(token, selectedGroup.id, deleteForEveryone);

      toast({
        title: deleteForEveryone ? "Guruh o'chirildi!" : "Guruhdan chiqdingiz!",
        description: deleteForEveryone
          ? "Guruh barcha a'zolar uchun o'chirildi"
          : "Guruh xabarlarini ko'ra olmaysiz",
        variant: "default",
      });
      await fetchGroups(token);
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleJoinChannel = async (channelId) => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;
      await joinChannel(token, channelId);
      toast({
        title: "Kanaga obuna bo'ldingiz!",
        description: "Kanal xabarlarini ko'rasiz",
      });
      await fetchChannels(token);
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLeaveChannel = async (channelId) => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;
      await leaveChannel(token, channelId);
      toast({
        title: "Kanaldan chiqdingiz!",
        description: "Kanal xabarlarini ko'ra olmaysiz",
      });
      await fetchChannels(token);
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim() || query.length < 2) {
      setSearchResults({ users: [], groups: [] });
      return;
    }
    setIsSearching(true);
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) {
        toast({
          title: "Xatolik!",
          description: "Avtorizatsiya kerak",
          variant: "destructive",
        });
        return;
      }
      const localResults = findLocalResults(query, searchType);
      let apiResults = { users: [], groups: [] };
      try {
        const data = await universalSearch(token, query, searchType);
        if (data && data.results) {
          apiResults = {
            users: data.results.users || [],
            groups: data.results.groups || [],
          };
        }
      } catch (apiError) {}
      const allUsers = [...localResults.users, ...apiResults.users];
      const allGroups = [...localResults.groups, ...apiResults.groups];
      const uniqueUsers = allUsers.reduce((acc, user) => {
        if (!acc.find((u) => u.id === user.id)) {
          acc.push(user);
        }
        return acc;
      }, []);
      const uniqueGroups = allGroups.reduce((acc, group) => {
        if (!acc.find((g) => g.id === group.id)) {
          acc.push(group);
        }
        return acc;
      }, []);
      const combinedResults = {
        users: uniqueUsers,
        groups: uniqueGroups,
      };
      setSearchResults(combinedResults);
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      const totalResults =
        combinedResults.users.length + combinedResults.groups.length;
      if (totalResults > 0) {
        toast({
          title: "Qidiruv natijalari",
          description: `${totalResults} ta natija topildi`,
          variant: "default",
        });
      } else {
        toast({
          title: "Qidiruv natijalari",
          description: "Hech qanday natija topilmadi",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("рџ”Ќ Search error:", error);
      setSearchResults({ users: [], groups: [] });
      toast({
        title: "Qidiruv xatosi",
        description: "Qidiruv amalga oshirilmadi",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const findLocalResults = (query, type) => {
    const results = { users: [], groups: [] };
    const queryLower = query.toLowerCase();
    if (type === "all" || type === "groups" || type === "channels") {
      results.groups = groups
        .filter((group) => {
          const matchesQuery =
            group.name.toLowerCase().includes(queryLower) ||
            (group.description &&
              group.description.toLowerCase().includes(queryLower));
          if (type === "groups") return matchesQuery && group.type === "group";
          if (type === "channels")
            return matchesQuery && group.type === "channel";
          return matchesQuery;
        })
        .map((group) => ({
          ...group,
          isMember: groupMemberships[group.id]?.isMember || false,
        }));
    }
    if (type === "all" || type === "users") {
    }
    return results;
  };

  const handleStartPrivateChat = async (targetUser) => {
    try {
      const token = storage.getPersistent("chatToken");
      const created = await startPrivateChat(token, targetUser.id);
      await fetchPrivateChats(token);
      toast({
        title: "Private chat yaratildi!",
        description: "Endi xabar yozishingiz mumkin",
      });
      const chatId = created?.chatId;
      if (chatId) {
        const chat = {
          id: chatId,
          user: {
            id: targetUser.id,
            username: targetUser.username,
            avatar: targetUser.avatar,
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
          },
        };
        onChatSelect(chat, "private");
        setSearchQuery("");
        setSearchResults({ users: [], groups: [] });
        return chat;
      } else {
        const data = await getPrivateChats(token);
        const found = (data.privateChats || []).find(
          (c) => (c.otherUser?.id || c.user?.id) === targetUser.id
        );
        if (found) {
          const chat = {
            id: found.chatId || found.id,
            user: found.otherUser || found.user,
            lastMessage: found.lastMessage,
          };
          onChatSelect(chat, "private");
          setSearchQuery("");
          setSearchResults({ users: [], groups: [] });
          return chat;
        }
      }
    } catch (error) {
      console.error("Error starting private chat:", error);
      toast({
        title: "Xatolik!",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const selectChat = (chat, type) => {
    clearUnreadCount(type, chat.id);
    onChatSelect({ ...chat, type }, type);
  };

  return (
    <div className="w-96 bg-sidebar border-r border-sidebar-border flex flex-col h-screen overflow-hidden text-sidebar-foreground dark:bg-gray-900">
      <div className="p-4 pl-1 border-b border-sidebar-border" style={{paddingTop: "30px"}}>
        <div className="flex items-center justify-between mb-4">
          <div
            className="cursor-pointer p-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-gray-800"
            onClick={() => setIsProfileSheetOpen(true)}>
            <Menu className="w-6 h-6 text-sidebar-foreground" />
          </div>
          <div className="flex-1"></div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Qidirish..."
              className="pl-10 w-full bg-sidebar text-sidebar-foreground placeholder:text-muted-foreground"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              disabled={isSearching}
              ref={searchInputRef}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            )}
            {!isSearching && searchQuery && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-sidebar-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="border-b border-sidebar-border">
        <div className="flex">
          <button
            className={`flex items-center basis-1/2 sm:basis-1/4 px-2 py-2 text-sm font-medium text-center ${
              activeTab === "all"
                ? "text-sidebar-primary border-b-2 border-sidebar-primary bg-sidebar-accent dark:bg-gray-800"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-gray-800"
            }`}
            onClick={() => setActiveTab("all")}>
            <LayoutGrid className="w-4 h-4 inline mr-1" />
            Hammasi
          </button>
          <button
            className={`flex items-center basis-1/2 sm:basis-1/4 px-2 py-2 text-sm font-medium text-center ${
              activeTab === "users"
                ? "text-sidebar-primary border-b-2 border-sidebar-primary bg-sidebar-accent dark:bg-gray-800"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-gray-800"
            }`}
            onClick={() => setActiveTab("users")}>
            <User className="w-4 h-4 inline mr-1" />
            Shaxsiy
          </button>
          <button
            className={`flex items-center basis-1/2 sm:basis-1/4 px-2 py-2 text-sm font-medium text-center ${
              activeTab === "groups"
                ? "text-sidebar-primary border-b-2 border-sidebar-primary bg-sidebar-accent dark:bg-gray-800"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-gray-800"
            }`}
            onClick={() => setActiveTab("groups")}>
            <Users className="w-4 h-4 inline mr-1" />
            Guruhlar
          </button>
          <button
            className={`flex items-center basis-1/2 sm:basis-1/4 px-2 py-2 text-sm font-medium text-center ${
              activeTab === "channels"
                ? "text-sidebar-primary border-b-2 border-sidebar-primary bg-sidebar-accent dark:bg-gray-800"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-gray-800"
            }`}
            onClick={() => setActiveTab("channels")}>
            <Megaphone className="w-4 h-4 inline mr-1" />
            Kanallar
          </button>
        </div>
      </div>
      {searchQuery && searchQuery.trim().length >= 1 && (
        <div className="border-b border-gray-200">
          {}
          {searchResults.users.length > 0 || searchResults.groups.length > 0 ? (
            <>
              {}
              {searchResults.users.length > 0 && (
                <div>
                
                  {searchResults.users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer dark:text-gray-100 dark:hover:bg-blue-900/30"
                      onClick={() => handleStartPrivateChat(user)}>
                      <Avatar className="w-10 h-10 mr-3">
                        {user?.avatar && (
                          <AvatarImage
                            src={toAbsoluteUrl(user.avatar)}
                            alt="avatar"
                          />
                        )}
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 dark:text-gray-400">
                            {user.firstName} {user.lastName}
                          </p>
                          <OnlineStatusIndicator
                            isOnline={
                              userStatuses[user.id]?.isOnline || user.isOnline
                            }
                            lastSeen={
                              userStatuses[user.id]?.lastSeen || user.lastSeen
                            }
                            size="xs"
                            username={user.username}
                            debug={user.username}
                          />
                        </div>
                        <p className="text-sm text-gray-500 text-gray-900 dark:text-gray-400">
                          {user.username}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {}
              {searchResults.groups.filter((group) => group.type === "group")
                .length > 0 && (
                <div>
                  {searchResults.groups
                    .filter((group) => group.type === "group")
                    .map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer dark:text-gray-100 dark:hover:bg-blue-900/30"
                        onClick={() => onChatSelect(group, "group")}
                        onDoubleClick={() =>
                          setInfoEntity({ type: "group", data: group })
                        }>
                        <Avatar className="w-10 h-10 mr-3">
                          {group?.avatar && (
                            <AvatarImage
                              src={toAbsoluteUrl(group.avatar)}
                              alt="guruh rasmi"
                            />
                          )}
                          <AvatarFallback className="bg-green-100 text-green-600">
                            <Users className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <p className="font-medium text-gray-900 text-gray-900 dark:text-gray-400">
                              {group.name}
                            </p>
                            {group.isPrivate && (
                              <Lock className="w-3 h-3 ml-1 text-gray-400" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {group.description}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-gray-400">
                            <span>{group.memberCount || 0} a'zo</span>
                            {group.isMember &&
                              group.onlineMembersCount !== undefined && (
                                <>
                                  <span>вЂў</span>
                                  <span className="text-green-600">
                                    {group.onlineMembersCount} onlayn
                                  </span>
                                </>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              {}
              {searchResults.groups.filter((group) => group.type === "channel")
                .length > 0 && (
                <div>
                  {searchResults.groups
                    .filter((group) => group.type === "channel")
                    .map((channel) => (
                      <div
                        key={channel.id}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer dark:text-gray-100 dark:hover:bg-blue-900/30"
                        onClick={() => onChatSelect(channel, "channel")}
                        onDoubleClick={() =>
                          setInfoEntity({ type: "channel", data: channel })
                        }>
                        <Avatar className="w-10 h-10 mr-3">
                          {channel?.avatar && (
                            <AvatarImage
                              src={toAbsoluteUrl(channel.avatar)}
                              alt="kanal"
                            />
                          )}
                          <AvatarFallback className="bg-purple-100 text-purple-600">
                            <Hash className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <p className="font-medium text-gray-900 text-gray-900 dark:text-gray-400">
                              {channel.name}
                            </p>
                            {channel.isPrivate && (
                              <Lock className="w-3 h-3 ml-1 text-gray-400" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {channel.description}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-gray-400">
                            <span>{channel.memberCount || 0} a'zo</span>
                            
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          ) : (
            !isSearching && (
              <div className="p-4 text-center">
                <div className="text-gray-400 mb-2">
                  <Search className="w-8 h-8 mx-auto" />
                </div>
                <p className="text-sm text-gray-500">
                  "{searchQuery}" uchun natija topilmadi
                </p>
              </div>
            )
          )}
        </div>
      )}
      <ScrollArea className="flex-1 overflow-y-auto">
        {}
        {isLoading && (
          <div className="p-3">
            {}
            <div className="mb-4">
              <Skeleton className="h-4 w-24 mb-2" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center p-2 mb-1">
                  <Skeleton className="w-10 h-10 rounded-full mr-3" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
            {}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-16" />
              </div>
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center p-2 mb-1">
                  <Skeleton className="w-10 h-10 rounded-full mr-3" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28 mb-1" />
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-2 w-12" />
                  </div>
                </div>
              ))}
            </div>
            {}
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center p-2 mb-1">
                  <Skeleton className="w-10 h-10 rounded-full mr-3" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-28 mb-1" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {}
        {!isLoading && (
          <>
            {}
            {(activeTab === "all" || activeTab === "users") && (
              <div className="p-3">
                
                {privateChats.map((chat) => (
                  <div
                    key={chat.chatId || chat.id}
                    className={`flex items-center p-2 rounded-lg cursor-pointer mb-1 ${
                      currentChat?.id === (chat.chatId || chat.id) &&
                      currentChat?.type === "private"
                        ? "bg-blue-50 dark:bg-gray-900"
                        : "hover:bg-gray-50 hover:dark:bg-gray-900  "
                    }`}
                    onClick={() =>
                      selectChat(
                        {
                          id: chat.chatId || chat.id,
                          user: chat.otherUser || chat.user,
                          lastMessage: chat.lastMessage,
                        },
                        "private"
                      )
                    }>
                    <AvatarWithStatus
                      user={chat.otherUser || chat.user}
                      size="md"
                      isOnline={
                        userStatuses[chat.otherUser?.id || chat.user?.id]
                          ?.isOnline ||
                        chat.otherUser?.isOnline ||
                        chat.user?.isOnline
                      }
                      showStatusDot={true}
                      className="mr-3"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900 truncate dark:text-gray-400">

                          {chat.otherUser?.firstName || chat.user?.username ||
                            "Unknown"} {chat.otherUser?.lastName || ""}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {chat.lastMessage?.content || "Hali xabar yo'q"}
                      </p>
                    </div>
                    {}
                    {(() => {
                      const unreadCount = getUnreadCountFromState(
                        "private",
                        chat.chatId || chat.id
                      );
                      return unreadCount > 0 ? (
                        <div className="ml-2 bg-blue-500 text-white text-xs font-medium rounded-full min-w-[20px] h-5 flex items-center justify-center px-2">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            )}
            {}
            {(activeTab === "all" || activeTab === "groups") && (
              <div className="p-3">
                {groups
                  .filter((group) => group.type === "group")
                  .map((group) => (
                    <div
                      key={group.id}
                      className={`flex items-center p-2 rounded-lg cursor-pointer mb-1 ${
                        currentChat?.id === group.id &&
                        currentChat?.type === "group"
                          ? "bg-blue-50 dark:bg-gray-900"
                          : "hover:bg-gray-50 hover:dark:bg-gray-900"
                      }`}
                      onClick={() => selectChat(group, "group")}>
                      <Avatar className="w-10 h-10 mr-3">
                        {group?.avatar && (
                          <AvatarImage
                            src={toAbsoluteUrl(group.avatar)}
                            alt="guruh rasmi"
                          />
                        )}
                        <AvatarFallback className="bg-green-100 text-green-600">
                          <Users className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <p className="font-medium text-gray-900 truncate dark:text-gray-400">
                            {group.name}
                          </p>
                          {group.isPrivate && (
                            <Lock className="w-3 h-3 ml-1 text-gray-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {group.description}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <span>{group.memberCount} a'zo</span>
                          {(group.isMember ||
                            groupMemberships[group.id]?.isMember) &&
                            group.onlineMembersCount !== undefined && (
                              <>
                                <span>•</span>
                                <span className="text-green-600">
                                  {group.onlineMembersCount} onlayn
                                </span>
                              </>
                            )}
                        </div>
                      </div>
                      {}
                      {(() => {
                        const unreadCount = getUnreadCountFromState(
                          "group",
                          group.id
                        );
                        return unreadCount > 0 &&
                          groupMemberships[group.id]?.isMember ? (
                          <div className="ml-2 mr-2 bg-green-500 text-white text-xs font-medium rounded-full min-w-[20px] h-5 flex items-center justify-center px-2">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ))}
              </div>
            )}
            {(activeTab === "all" || activeTab === "channels") && (
              <div className="p-3">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className={`flex items-center p-2 rounded-lg cursor-pointer mb-1 ${
                      currentChat?.id === channel.id &&
                      currentChat?.type === "channel"
                        ? "bg-blue-50 dark:bg-gray-900"
                        : "hover:bg-gray-50 hover:dark:bg-gray-900"
                    }`}
                    onClick={() => selectChat(channel, "channel")}>
                    <Avatar className="w-10 h-10 mr-3">
                      {channel?.avatar && (
                        <AvatarImage
                          src={toAbsoluteUrl(channel.avatar)}
                          alt="kanal"
                        />
                      )}
                      <AvatarFallback className="bg-purple-100 text-purple-600">
                        <Hash className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="font-medium text-gray-900 truncate dark:text-gray-400">
                          {channel.name}
                        </p>
                        {channel.isPrivate && (
                          <Lock className="w-3 h-3 ml-1 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {channel.description}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <span>{channel.memberCount || 0} a'zo</span>
                      </div>
                    </div>
                    {}
                    {(() => {
                      const unreadCount = getUnreadCountFromState(
                        "channel",
                        channel.id
                      );
                      return unreadCount > 0 &&
                        channelMemberships[channel.id]?.isMember ? (
                        <div className="ml-2 mr-2 bg-purple-500 text-white text-xs font-medium rounded-full min-w-[20px] h-5 flex items-center justify-center px-2">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </ScrollArea>
      <ProfileDialog
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        onLogout={onLogout}
        userStatuses={userStatuses}
      />
      <ProfileSheet
        open={isProfileSheetOpen}
        onOpenChange={setIsProfileSheetOpen}
        user={user}
        userStatuses={userStatuses}
        onLogout={onLogout}
      />
      {infoEntity && (
        <EntityInfoDialog
          open={!!infoEntity}
          onOpenChange={() => setInfoEntity(null)}
          entity={infoEntity}
          onJoin={async (groupId) => {
            const token = storage.getPersistent("chatToken");
            await joinGroup(token, groupId);
            await fetchUserData();
          }}
          onLeave={async (groupId) => {
            const token = storage.getPersistent("chatToken");
            await leaveGroup(token, groupId);
            await fetchUserData();
          }}
        />
      )}

      <GroupLeaveModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onConfirm={confirmLeaveGroup}
        groupName={selectedGroup?.name || ""}
        isCreator={selectedGroup?.role === "creator"}
      />
    </div>
  );
};
export default ChatSidebar;
