 import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import {
  Send,
  Users,
  Plus,
  MessageCircle,
  MoreVertical,
  Hash,
  Check,
  CheckCheck,
  ChevronDown,
  Paperclip,
  Mic,
  MicOff,
  ArrowLeft,
  Smile,
  X,
  Edit2,
  Trash2,
  Info,
  Eye,
} from "lucide-react";
import { useGroups } from "../hooks/useGroups";
import { useChat } from "../hooks/useChat";
import { useChannels } from "../hooks/useChannels";
import { useToast } from "../hooks/use-toast";
import EmojiPicker from "./EmojiPicker";
import TypingIndicator from "./TypingIndicator";
import ImageUpload from "./ImageUpload";
import GroupInfoDialog from "./GroupInfoDialog";
import ChannelInfoDialog from "./ChannelInfoDialog";
import OnlineStatusIndicator from "./OnlineStatusIndicator";
import VoiceMessagePlayer from "./VoiceMessagePlayer";
import sendSound from "../assets/sounds/sound.mp3";
import { useTyping } from "../hooks/useTyping";
import { storage } from "../utils/storageUtils";
import { ImagePreview } from "./ImagePreview";
import GroupLeaveModal from "./GroupLeaveModal";
import ClearHistoryDialog from "./ClearHistoryDialog";

const ChatArea = ({
  currentChat,
  chatType,
  user,
  sendChatViewEvent,
  sendMessageViewEvent,
  endMessageViewEvent,
  onDeleteChat,
  onClearHistory,
  socket,
  userStatuses = {},
}) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(
    (typeof window !== 'undefined' && localStorage.getItem('soundEnabled')) === 'true'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [groupStatus, setGroupStatus] = useState(null);
  const [channelStatus, setChannelStatus] = useState(null);
  const [messageReadStatus, setMessageReadStatus] = useState({}); // Track read status per message
  const [messageViewStatus, setMessageViewStatus] = useState({}); // Track who is currently viewing each message
  const [showJumpButton, setShowJumpButton] = useState(false); // Show jump to bottom button
  const [newMessagesCount, setNewMessagesCount] = useState(0); // Count of new messages since scroll up
  const [wasTyping, setWasTyping] = useState(false); // Track previous typing state
  const [showGroupInfo, setShowGroupInfo] = useState(false); // GroupInfoDialog visibility
  const [isRecording, setIsRecording] = useState(false); // Voice recording state
  const [recordingTime, setRecordingTime] = useState(0); // Recording duration
  const [audioBlob, setAudioBlob] = useState(null); // Recorded audio blob
  const [mediaRecorder, setMediaRecorder] = useState(null); // MediaRecorder instance
  const [recordingTimer, setRecordingTimer] = useState(null); // Timer for recording duration
  const recordingTimerRef = useRef(null); // Ref to ensure timer cleanup
  const [volumeLevels, setVolumeLevels] = useState([]); // Store volume levels during recording
  const audioContextRef = useRef(null); // Audio context for volume analysis
  const analyserRef = useRef(null); // Audio analyser node
  const [showGroupDeleteModal, setShowGroupDeleteModal] = useState(false); // Group delete modal
  const [showGroupLeaveModal, setShowGroupLeaveModal] = useState(false); // Group leave modal
  const [imagePreviewData, setImagePreviewData] = useState(null); // Image preview data
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false); // Clear history dialog

  const {
    sendMessage,
    fetchMessages,
    createWebSocket,
    editMessage,
    deleteMessage,
    markChatAsRead,
    markMessagesAsRead,
  } = useChat();

  const { checkGroupStatus, joinGroup, leaveGroup, deleteGroup } = useGroups();
  const { getChannelStatus, joinChannel, leaveChannel } = useChannels();
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Emoji picker state
  const [showImageUpload, setShowImageUpload] = useState(false); // Image upload state
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const inputRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const sendAudioRef = useRef(null);
  const audioChunksRef = useRef([]);

  const API_URL = "http://localhost:3000";
  const toAbsoluteUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `${API_URL}${url}`;
  };

  const { typingUsers, hasTypingUsers, typingText, startTyping, stopTyping } =
    useTyping(socket, chatType, currentChat?.id, user?.id);

  // Play send sound (guarded by user setting). Create a fresh Audio for reliable playback.
  const playSendSound = () => {
    try {
      const enabled = soundEnabled || (localStorage.getItem('soundEnabled') === 'true');
      if (!enabled) return;
      const audio = new Audio(sendSound);
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch (_) {}
  };

  useEffect(() => {
    const onSoundChanged = (e) => {
      const { enabled } = e.detail || {};
      if (typeof enabled === 'boolean') setSoundEnabled(enabled);
    };
    window.addEventListener('settings-sound-changed', onSoundChanged);
    return () => window.removeEventListener('settings-sound-changed', onSoundChanged);
  }, []);

  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    message: null,
  });
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState("");

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    const isOwn = msg.user?.id === user?.id;
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      message: isOwn ? msg : null,
    });
  };

  const closeContextMenu = () =>
    setContextMenu({ visible: false, x: 0, y: 0, message: null });

  // Voice recording functions
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      // Set up audio context for volume analysis
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      audioChunksRef.current = [];
      setVolumeLevels([]);

      // Volume monitoring function
      const monitorVolume = () => {
        if (!analyserRef.current || !isRecording) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average =
          dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalizedVolume = Math.min(average / 128, 1); // Normalize to 0-1

        setVolumeLevels((prev) => [...prev, normalizedVolume]);

        if (isRecording) {
          requestAnimationFrame(monitorVolume);
        }
      };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());

        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }

        // Force a re-render to ensure send button is enabled
        setTimeout(() => {
          // This timeout ensures the audioBlob state is properly set
        }, 100);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      // Start volume monitoring
      monitorVolume();

      // Clear any existing timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      // Start timer
      const timer = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      setRecordingTimer(timer);
      recordingTimerRef.current = timer;
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: "Mikrofonga ruxsat berilmadi",
        variant: "destructive",
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }

    // Clear timer using both state and ref
    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    // Don't reset recordingTime here - keep it for display and sending
  };

  const cancelVoiceRecording = () => {
    stopVoiceRecording();
    setAudioBlob(null);
    setRecordingTime(0);
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Handle profile updates via WebSocket (attach regardless of socket availability)
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      const { userId, updates } = event.detail;

      // Update messages if the sender's profile was updated
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          if (msg.senderId === userId) {
            return {
              ...msg,
              sender: {
                ...msg.sender,
                ...updates,
              },
            };
          }
          return msg;
        })
      );
    };

    window.addEventListener("user-profile-updated", handleProfileUpdate);

    return () => {
      window.removeEventListener("user-profile-updated", handleProfileUpdate);
    };
  }, []);

  // Handle WebSocket connection
  useEffect(() => {
    const handleImagePreview = (event) => {
      setImagePreviewData(event.detail);
    };

    window.addEventListener("open-image-preview", handleImagePreview);
    
    return () => {
      window.removeEventListener("open-image-preview", handleImagePreview);
    };
  }, []);

  const sendVoiceMessage = async () => {
    if (!audioBlob) {
      console.error("No audio blob available");
      return;
    }

    try {
      const token = storage.getPersistent("chatToken");
      if (!token) {
        console.error("No chat token found");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result.split(",")[1];

          const messageData = {
            content: "",
            voiceMessage: {
              data: base64Audio,
              duration: recordingTime,
              mimeType: audioBlob.type || "audio/webm",
              volumeLevels: volumeLevels, // Add volume levels to message data
            },
            chatType,
            chatId: currentChat.id,
          };

          console.log("Sending voice message:", {
            duration: recordingTime,
            mimeType: audioBlob.type,
            dataLength: base64Audio.length,
          });

          const result = await sendMessage(token, messageData);

          // Reset voice recording state after successful send
          setAudioBlob(null);
          setRecordingTime(0);

          // optimistic append for self
          if (result?.data) {
            const newMessage = {
              id: result.data.id,
              content: result.data.content,
              voiceMessage: result.data.voiceMessage,
              chatType: result.data.chatType,
              chatId: result.data.chatId,
              timestamp: result.data.timestamp,
              user: result.data.user,
            };

            setMessages((prev) => {
              const updatedMessages = [...prev, newMessage];
              const cacheKey = `messages_${user?.id}_${chatType}_${currentChat.id}`;
              storage.setSession(cacheKey, JSON.stringify(updatedMessages));
              return updatedMessages;
            });

            // Auto-scroll to bottom
            setTimeout(() => {
              const scrollArea = scrollAreaRef.current?.querySelector(
                "[data-radix-scroll-area-viewport]"
              );
              if (scrollArea) {
                scrollArea.scrollTo({
                  top: scrollArea.scrollHeight,
                  behavior: "smooth",
                });
              } else {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }
            }, 50);

            toast({
              title: "Ovozli xabar yuborildi",
              description: "Ovozli xabar muvaffaqiyatli yuborildi",
            });
          }
        } catch (apiError) {
          console.error("API Error:", apiError);
          toast({
            title: "Xatolik!",
            description:
              apiError?.response?.data?.message ||
              apiError.message ||
              "Ovozli xabarni yuborishda xatolik",
            variant: "destructive",
          });
          // Don't reset state on error so user can try again
        }
      };

      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        toast({
          title: "Xatolik!",
          description: "Audio faylni o'qishda xatolik",
          variant: "destructive",
        });
        // Don't reset state on error
      };

      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error("Voice message error:", error);
      toast({
        title: "Xatolik!",
        description:
          error?.response?.data?.message ||
          error.message ||
          "Ovozli xabar yuborishda xatolik",
        variant: "destructive",
      });
      // Don't reset state on error so user can try again
    }
  };

  // Format recording time
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get all images from messages for preview carousel
  const getAllChatImages = () => {
    const allImages = [];
    messages.forEach(msg => {
      if (msg.images && Array.isArray(msg.images)) {
        allImages.push(...msg.images);
      } else if (msg.image) {
        allImages.push(msg.image);
      }
    });
    return allImages;
  };

  // Get message container style based on message type
  const getMessageContainerStyle = (msg, isSelf) => {
    // Image + Text combo - special styling
    if (msg.image && msg.content) {
      return "p-0 rounded-2xl"; // Container for image+text combo
    }

    // Voice messages, standalone images, and text messages have no container background
    // (text messages now handle their own styling, images and voice have no background)
    return "p-0"; // Minimal container styling
  };

  // Handle image upload completion with caption support
  const handleImageUploadComplete = async (imageData) => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;

      let messageData;
      if (imageData?.images && Array.isArray(imageData.images)) {
        messageData = {
          content: imageData.caption || "",
          images: imageData.images,
          chatType,
          chatId: currentChat.id,
        };
      } else {
        messageData = {
          content: imageData.caption || "",
          image: imageData.url,
          chatType,
          chatId: currentChat.id,
        };
      }

      const result = await sendMessage(token, messageData);
      setShowImageUpload(false); // Upload dialog yopish

      // optimistic append for self
      if (result?.data) {
        const newMessage = {
          id: result.data.id,
          content: result.data.content,
          image: result.data.image,
          images: result.data.images,
          chatType: result.data.chatType,
          chatId: result.data.chatId,
          timestamp: result.data.timestamp,
          user: result.data.user,
        };

        setMessages((prev) => {
          const updatedMessages = [...prev, newMessage];
          // Cache updated messages immediately (user-scoped)
          const cacheKey = `messages_${user?.id}_${chatType}_${currentChat.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedMessages));
          return updatedMessages;
        });

        // sound already played prior to API call

        // Auto-scroll to bottom
        setTimeout(() => {
          const scrollArea = scrollAreaRef.current?.querySelector(
            "[data-radix-scroll-area-viewport]"
          );
          if (scrollArea) {
            scrollArea.scrollTo({
              top: scrollArea.scrollHeight,
              behavior: "smooth",
            });
          } else {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }
        }, 50);
      }
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Add missing state for delete checkbox
  const [deleteForEveryone, setDeleteForEveryone] = useState(false);

  // Handle group delete
  const handleGroupDelete = async () => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;

      if (deleteForEveryone) {
        // Delete group for everyone (only creator can do this)
        await deleteGroup(token, currentChat.id);
        toast({
          title: "Guruh o'chirildi",
          description: "Guruh hamma uchun o'chirildi",
        });
      } else {
        // Just leave the group
        await leaveGroup(token, currentChat.id);
        toast({
          title: "Chiqildi",
          description: "Guruhdan muvaffaqiyatli chiqildi",
        });
      }

      setShowGroupDeleteModal(false);
      setDeleteForEveryone(false);

      // Trigger chat deletion event
      window.dispatchEvent(
        new CustomEvent("chat-deleted", {
          detail: {
            chatType: "group",
            chatId: currentChat.id,
            deletedBy: user?.id,
          },
        })
      );
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  // Handle group leave
  const handleGroupLeave = async () => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;

      await leaveGroup(token, currentChat.id);
      toast({
        title: "Chiqildi",
        description: "Guruhdan muvaffaqiyatli chiqildi",
      });

      setShowGroupLeaveModal(false);
      setGroupStatus({ isMember: false });

      // Remove from UI immediately
      window.dispatchEvent(
        new CustomEvent("chat-deleted", {
          detail: {
            chatType: "group",
            chatId: currentChat.id,
            deletedBy: user?.id,
            timestamp: new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  // Handle channel leave
  const handleChannelLeave = async () => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;
      await leaveChannel(token, currentChat.id);
      toast({ title: "Kanaldan chiqdingiz!", description: "Endi kanal xabarlarini ko'rmaysiz" });
      // Clear current chat if we left the opened channel
      onDeleteChat?.({ id: currentChat.id }, 'channel');
      setShowMenu(false);
    } catch (error) {
      toast({ title: "Xatolik!", description: error?.message || "Kanaldan chiqishda xatolik", variant: "destructive" });
    }
  };

  // Real-time WebSocket connection and event listeners
  useEffect(() => {
    if (!currentChat) return;

  

  // Join chat room for real-time updates (only if socket is ready)
    if (socket && socket.send && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "join-chat",
          chatId: currentChat.id,
          chatType: chatType,
          userId: user?.id,
        })
      );
    }

    // Listen for new messages
    const handleNewMessage = (event) => {
      const messageData = event.detail;
      console.log("New message received:", messageData);

      // Only add if message belongs to current chat
      if (
        messageData.chatId === currentChat.id &&
        messageData.chatType === chatType
      ) {
        setMessages((prev) => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some((msg) => msg.id === messageData.id);
          if (exists) return prev;

          const updatedMessages = [...prev, messageData];

          // Update cache
          const cacheKey = `messages_${user?.id}_${chatType}_${currentChat.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedMessages));

          return updatedMessages;
        });

        // Auto-scroll to bottom for new messages if user is at bottom
        setTimeout(() => {
          const scrollArea = scrollAreaRef.current?.querySelector(
            "[data-radix-scroll-area-viewport]"
          );
          if (scrollArea) {
            const { scrollTop, scrollHeight, clientHeight } = scrollArea;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

            if (isNearBottom || messageData.user.id === user?.id) {
              scrollArea.scrollTo({
                top: scrollArea.scrollHeight,
                behavior: "smooth",
              });
            } else {
              // Show jump button and increment new messages count
              setShowJumpButton(true);
              setNewMessagesCount((prev) => prev + 1);
            }
          }
        }, 50);

        // Mark as read if user is active and message is not from self
        if (messageData.user.id !== user?.id && document.hasFocus()) {
          markMessageAsRead(messageData.id);
        } else if (messageData.user.id !== user?.id) {
          // Even if not in focus, we should still track that the message exists
          // This will be marked as read when the user scrolls to it or focuses the window
          console.log(
            "New message received but not in focus, will mark as read when focused"
          );
        }
      }
    };

    // Listen for message read status updates
    const handleMessageRead = (event) => {
      const data = event.detail;
      console.log("Message read status update:", data);

      // Handle single message read update
      if (data.messageId) {
        setMessageReadStatus((prev) => ({
          ...prev,
          [data.messageId]: data.readers || [],
        }));
      }

      // Handle multiple messages read update (bulk read)
      if (data.messageIds && Array.isArray(data.messageIds)) {
        const reader = data.reader;
        const readAt = data.timestamp;

        setMessageReadStatus((prev) => {
          const updated = { ...prev };
          data.messageIds.forEach((msgId) => {
            const currentReaders = updated[msgId] || [];
            const alreadyRead = currentReaders.some((r) => r.id === reader.id);

            if (!alreadyRead) {
              updated[msgId] = [
                ...currentReaders,
                {
                  id: reader.id,
                  username: reader.username,
                  readAt: readAt,
                },
              ];
            }
          });
          return updated;
        });
      }

      // Handle messageReadReceipt events (from server)
      if (data.type === "messageReadReceipt" && data.messageIds) {
        const reader = data.reader;
        const readAt = data.timestamp;

        setMessageReadStatus((prev) => {
          const updated = { ...prev };
          data.messageIds.forEach((msgId) => {
            const currentReaders = updated[msgId] || [];
            const alreadyRead = currentReaders.some((r) => r.id === reader.id);

            if (!alreadyRead) {
              updated[msgId] = [
                ...currentReaders,
                {
                  id: reader.id,
                  username: reader.username,
                  readAt: readAt,
                },
              ];
            }
          });
          return updated;
        });
      }
    };

    // Listen for message edit updates
    const handleMessageEdit = (event) => {
      const data = event.detail;
      console.log("Message edited:", data);
      if (data.chatId === currentChat.id) {
        setMessages((prev) => {
          const updatedMessages = prev.map((msg) =>
            msg.id === data.messageId
              ? { ...msg, content: data.content, isEdited: true }
              : msg
          );

          // Update cache immediately
          const cacheKey = `messages_${user?.id}_${chatType}_${currentChat.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedMessages));

          return updatedMessages;
        });
      }
    };

    // Listen for message delete updates
    const handleMessageDelete = (event) => {
      const data = event.detail;
      console.log("Message deleted:", data);
      if (data.chatId === currentChat.id) {
        setMessages((prev) => {
          const updatedMessages = prev.filter((msg) => msg.id !== data.messageId);

          // Update cache immediately with filtered messages
          const cacheKey = `messages_${user?.id}_${chatType}_${currentChat.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedMessages));

          return updatedMessages;
        });
      }
    };

    // Listen for typing status updates
    const handleTypingUpdate = (event) => {
      const data = event.detail;
      if (data.chatId === currentChat.id && data.userId !== user?.id) {
        // Handle typing indicator updates
        console.log("User typing:", data);
      }
    };

    // Listen for user online status updates
    const handleUserStatusUpdate = (event) => {
      const data = event.detail;
      // Update user online status for private chats
      if (chatType === "private" && currentChat.user?.id === data.userId) {
        // This will be handled by parent component managing userStatuses
        console.log("User status updated for private chat:", data);
      }
    };

    // Listen for chat history cleared
    const handleChatHistoryCleared = (event) => {
      const data = event.detail;
      console.log("Chat history cleared:", data);
      if (data.chatId === currentChat.id && data.chatType === chatType) {
        setMessages([]);
        setMessageReadStatus({});

        // Clear cache
        const cacheKey = `messages_${user?.id}_${chatType}_${currentChat.id}`;
        storage.removeSession(cacheKey);
      }
    };

    // Listen for channel deletion
    const handleChannelDeleted = (event) => {
      const data = event.detail;
      console.log("Channel deleted:", data);
      if (data.chatId === currentChat.id && data.chatType === "channel") {
        // Show toast notification
        toast({
          title: "Kanal o'chirildi",
          description: "Bu kanal yaratuvchi tomonidan o'chirildi",
          variant: "destructive",
        });
      }
    };

    // Register window event listeners (these match what useSocket/ChatApp dispatches)
    window.addEventListener("new-message", handleNewMessage);
    window.addEventListener("message", handleNewMessage);
    window.addEventListener("real-time-message", handleNewMessage);
    window.addEventListener("message-read", handleMessageRead);
    window.addEventListener("message-edited", handleMessageEdit);
    window.addEventListener("message-deleted", handleMessageDelete);
    window.addEventListener("typing-update", handleTypingUpdate);
    window.addEventListener("user-status-update-global", handleUserStatusUpdate);
    window.addEventListener("chat-history-cleared", handleChatHistoryCleared);
    window.addEventListener("channelDeleted", handleChannelDeleted);

    // Cleanup function
    return () => {
      window.removeEventListener("new-message", handleNewMessage);
      window.removeEventListener("message", handleNewMessage);
      window.removeEventListener("real-time-message", handleNewMessage);
      window.removeEventListener("message-read", handleMessageRead);
      window.removeEventListener("message-edited", handleMessageEdit);
      window.removeEventListener("message-deleted", handleMessageDelete);
      window.removeEventListener("typing-update", handleTypingUpdate);
      window.removeEventListener("user-status-update-global", handleUserStatusUpdate);
      window.removeEventListener("chat-history-cleared", handleChatHistoryCleared);
      window.removeEventListener("channelDeleted", handleChannelDeleted);

      // Leave chat room (only if socket is ready)
      if (socket && socket.send && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "leave-chat",
            chatId: currentChat.id,
            chatType: chatType,
            userId: user?.id,
          })
        );
      }
    };
  }, [currentChat?.id, chatType, user?.id, socket]);

  // Mark messages as read when component mounts or chat changes
  useEffect(() => {
    if (currentChat && user?.id && messages.length > 0) {
      // Mark unread messages as read when user opens chat
      const unreadMessages = messages.filter(
        (msg) =>
          msg.user.id !== user.id &&
          !messageReadStatus[msg.id]?.some((reader) => reader.id === user.id)
      );

      if (unreadMessages.length > 0) {
        unreadMessages.forEach((msg) => {
          markMessageAsRead(msg.id);
        });
      }
    }
  }, [currentChat?.id, messages.length, user?.id]);

  // Auto-scroll to bottom when messages load initially
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      setTimeout(() => {
        const scrollArea = scrollAreaRef.current?.querySelector(
          "[data-radix-scroll-area-viewport]"
        );
        if (scrollArea) {
          scrollArea.scrollTo({
            top: scrollArea.scrollHeight,
            behavior: "auto", // Use auto for initial load
          });
        } else {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }
      }, 100);
    }
  }, [messages.length, isLoading]);

  // Add scroll event listener to handle read status and jump button
  useEffect(() => {
    const scrollArea = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );

    if (!scrollArea) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      // Hide jump button if user scrolls to bottom
      if (isNearBottom) {
        setShowJumpButton(false);
        setNewMessagesCount(0);

        // Mark visible messages as read
        const visibleMessages = messages.filter(
          (msg) =>
            msg.user.id !== user?.id &&
            !messageReadStatus[msg.id]?.some((reader) => reader.id === user?.id)
        );

        visibleMessages.forEach((msg) => {
          markMessageAsRead(msg.id);
        });

        // Also mark as read on server for better consistency
        if (visibleMessages.length > 0) {
          const messageIds = visibleMessages.map((msg) => msg.id);
          const token = storage.getPersistent("chatToken");
          if (token) {
            markMessagesAsRead(
              token,
              chatType,
              currentChat.id,
              messageIds
            ).catch((err) => {
              console.error("Error marking messages as read on server:", err);
            });
          }
        }
      } else {
        // Show jump button if not at bottom
        const hasUnseenMessages = newMessagesCount > 0;
        if (hasUnseenMessages) {
          setShowJumpButton(true);
        }
      }
    };

    scrollArea.addEventListener("scroll", handleScroll);
    return () => scrollArea.removeEventListener("scroll", handleScroll);
  }, [messages, messageReadStatus, newMessagesCount, user?.id]);

  // Add all necessary useEffects and event handlers
  useEffect(() => {
    const hide = (e) => {
      // Don't close menu if click is inside the menu
      if (
        e.target.closest(".chat-header-menu") ||
        e.target.closest(".chat-header-menu-toggle")
      ) {
        return;
      }
      closeContextMenu();
      setShowMenu(false);
    };

    const handleWindowFocus = () => {
      // When window gains focus, mark visible messages as read
      if (currentChat && user?.id && messages.length > 0) {
        const visibleMessages = messages.filter(
          (msg) =>
            msg.user.id !== user.id &&
            !messageReadStatus[msg.id]?.some((reader) => reader.id === user.id)
        );

        visibleMessages.forEach((msg) => {
          markMessageAsRead(msg.id);
        });
      }
    };

    window.addEventListener("click", hide);
    window.addEventListener("scroll", hide);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("click", hide);
      window.removeEventListener("scroll", hide);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [currentChat, user?.id, messages, messageReadStatus]);

  useEffect(() => {
    if (currentChat) {
      // Reset states when chat changes
      setMessages([]);
      setMessageReadStatus({});
      setMessageViewStatus({});
      setEditingMessageId(null);
      setEditingContent("");

      loadMessages();
      if (chatType === "group") {
        checkGroupMembership();
      } else if (chatType === "channel") {
        checkChannelMembership();
      }
    }
  }, [currentChat?.id, chatType]);

  // Handle delete message function
  const handleDeleteMessage = async (message) => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;

      // Call API to delete message
      await deleteMessage(token, message.id);

      // Update local state and cache
      setMessages((prev) => {
        const updatedMessages = prev.filter((msg) => msg.id !== message.id);
        const cacheKey = `messages_${user?.id}_${chatType}_${currentChat.id}`;
        storage.setSession(cacheKey, JSON.stringify(updatedMessages));
        return updatedMessages;
      });

      toast({
        title: "Xabar o'chirildi",
        description: "Xabar muvaffaqiyatli o'chirildi",
        variant: "default",
      });

      closeContextMenu();
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: error.message || "Xabarni o'chirishda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  // Start editing a message
  const startEditingMessage = (message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
    closeContextMenu();
  };

  // Commit the edited message
  const commitEditMessage = async () => {
    if (
      !(editingContent || "").trim() ||
      editingContent ===
        messages.find((m) => m.id === editingMessageId)?.content
    ) {
      setEditingMessageId(null);
      setEditingContent("");
      return;
    }

    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;

      const updated = await editMessage(
        token,
        editingMessageId,
        editingContent
      );

      setMessages((prev) => {
        const updatedMessages = prev.map((msg) =>
          msg.id === editingMessageId
            ? { ...msg, content: editingContent, isEdited: true }
            : msg
        );
        // Update cache after edit (user-scoped)
        const cacheKey = `messages_${user?.id}_${chatType}_${currentChat.id}`;
        storage.setSession(cacheKey, JSON.stringify(updatedMessages));
        return updatedMessages;
      });

      setEditingMessageId(null);
      setEditingContent("");

      toast({
        title: "Xabar tahrirlandi",
        description: "Xabar muvaffaqiyatli tahrirlandi",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: error.message || "Xabarni tahrirlashda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  // Guruh statusini tekshirish
  const checkGroupMembership = async () => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;

      const status = await checkGroupStatus(token, currentChat.id);
      setGroupStatus(status);
    } catch (error) {
      console.error("Error checking group/channel status:", error);
      setGroupStatus({ isMember: false, canJoin: true });
    }
  };

  // Kanal statusini tekshirish
  const checkChannelMembership = async () => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;

      const status = await getChannelStatus(token, currentChat.id);
      setChannelStatus(status);
    } catch (error) {
      console.error("Error checking channel status:", error);
      setChannelStatus({ isMember: false, role: "none" });
    }
  };

  // Guruhga qo'shilish
  const handleJoinGroup = async () => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;

      await joinGroup(token, currentChat.id);
      toast({
        title: "Guruhga qo'shildingiz!",
        description: "Endi xabar yozishingiz mumkin",
      });
      checkGroupMembership();
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Xabar yuborish function
  const handleSendMessage = async () => {
    if (!(message || "").trim()) return;

    try {
      const token = storage.getPersistent("chatToken");
      if (!token) return;

      const messageData = {
        content: (message || "").trim(),
        chatType,
        chatId: currentChat.id,
      };

      // Play send sound immediately on user gesture to avoid autoplay restrictions
      playSendSound();

      const result = await sendMessage(token, messageData);
      setMessage("");

      // optimistic append for self
      if (result?.data) {
        const newMessage = {
          id: result.data.id,
          content: result.data.content,
          chatType: result.data.chatType,
          chatId: result.data.chatId,
          timestamp: result.data.timestamp,
          user: result.data.user,
        };

        setMessages((prev) => {
          const updatedMessages = [...prev, newMessage];
          // Cache updated messages immediately (user-scoped)
          const cacheKey = `messages_${user?.id}_${chatType}_${currentChat.id}`;
          storage.setSession(cacheKey, JSON.stringify(updatedMessages));
          return updatedMessages;
        });

        // Darhol pastga scroll qilish o'z xabaringiz uchun
        setTimeout(() => {
          const scrollArea = scrollAreaRef.current?.querySelector(
            "[data-radix-scroll-area-viewport]"
          );
          if (scrollArea) {
            scrollArea.scrollTo({
              top: scrollArea.scrollHeight,
              behavior: "smooth",
            });
          } else {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }
        }, 50);
      }
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Xabarlarni yuklash
  const loadMessages = async () => {
    if (!currentChat) return;

    try {
      setIsLoading(true);
      const token = storage.getPersistent("chatToken");
      if (!token) return;

      // Try to load from sessionStorage first for faster loading (user-scoped)
      const cacheKey = `messages_${user?.id}_${chatType}_${currentChat.id}`;
      const cachedMessages = storage.getSession(cacheKey);

      if (cachedMessages) {
        const parsedMessages = storage.safeParseJSON(cachedMessages);
        if (parsedMessages && Array.isArray(parsedMessages)) {
          setMessages(parsedMessages);
          // Show cached data immediately, then fetch fresh data
          setIsLoading(false);
        }
      }

      const data = await fetchMessages(token, chatType, currentChat.id);
      const freshMessages = data.messages || [];
      setMessages(freshMessages);

      // Initialize read status from messages
      const readStatusData = {};
      freshMessages.forEach((msg) => {
        if (msg.reads && msg.reads.length > 0) {
          readStatusData[msg.id] = msg.reads.map((read) => ({
            id: read.reader?.id || read.id,
            username: read.reader?.username || read.username,
            readAt: read.readAt,
          }));
        }
      });
      setMessageReadStatus(readStatusData);

      // Cache the fresh messages
      const serializedMessages = storage.safeStringifyJSON(freshMessages);
      if (serializedMessages) {
        storage.setSession(cacheKey, serializedMessages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark message as read function
  const markMessageAsRead = async (messageId) => {
    try {
      const token = storage.getPersistent("chatToken");
      if (!token || !socket || !messageId) return;

      // Check if already read by current user
      const currentReaders = messageReadStatus[messageId] || [];
      const alreadyRead = currentReaders.some(
        (reader) => reader.id === user?.id
      );
      if (alreadyRead) return;

      // Send read status to server via WebSocket
      if (socket.send && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "messageViewed",
            messageId,
            chatId: currentChat.id,
            chatType: chatType,
            userId: user?.id,
            timestamp: new Date().toISOString(),
          })
        );
      }

      // Update local read status optimistically
      setMessageReadStatus((prev) => ({
        ...prev,
        [messageId]: [
          ...currentReaders,
          {
            id: user.id,
            username: user.username,
            readAt: new Date().toISOString(),
          },
        ],
      }));

      // Also mark as read on the server
      try {
        await markMessagesAsRead(token, chatType, currentChat.id, [messageId]);
      } catch (error) {
        console.error("Error marking message as read on server:", error);
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const jumpToBottom = () => {
    const scrollArea = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (scrollArea) {
      // Use native scrollTo for more reliable scrolling
      scrollArea.scrollTo({
        top: scrollArea.scrollHeight,
        behavior: "smooth",
      });
    } else {
      // Fallback to scrollIntoView
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    setShowJumpButton(false);
    setNewMessagesCount(0);
  };

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Chat tanlang
          </h3>
          <p className="text-gray-500">
            Xabar yozish uchun chapdan chat tanlang
          </p>
        </div>
      </div>
    );
  }

  const isGroupMember = groupStatus?.isMember;
  const isChannelWriter =
    channelStatus?.role === "creator" || channelStatus?.role === "admin";

  const canClearForEveryone =
    chatType === "private" ||
    (chatType === "group" && (groupStatus?.role === "creator" || groupStatus?.role === "admin")) ||
    (chatType === "channel" && (channelStatus?.role === "creator" || channelStatus?.role === "admin"));

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center space-x-3">
          <div
            className="cursor-pointer  rounded-lg p-2 -m-2 transition-colors"
            onClick={() => {
              console.log(
                "🎯 Header clicked - chatType:",
                chatType,
                "currentChat.id:",
                currentChat?.id
              );
              if (chatType === "group" || chatType === "channel") {
                console.log(
                  "📋 Opening GroupInfoDialog for:",
                  chatType,
                  currentChat?.id
                );
                setShowGroupInfo(true);
              } else {
                console.log("👤 Opening user info for private chat");
                // Include online status information when opening user info
                const userWithStatus = {
                  ...currentChat.user,
                  isOnline: userStatuses[currentChat.user.id]?.isOnline ?? currentChat.user.isOnline ?? false,
                  lastSeen: userStatuses[currentChat.user.id]?.lastSeen ?? currentChat.user.lastSeen
                };
                window.dispatchEvent(
                  new CustomEvent("open-user-info", {
                    detail: userWithStatus,
                  })
                );
              }
            }}
            title={
              chatType === "group"
                ? "Guruh ma'lumotlarini ko'rish"
                : chatType === "channel"
                ? "Kanal ma'lumotlarini ko'rish"
                : "Foydalanuvchi ma'lumotlari"
            }>
            <Avatar className="w-10 h-10">
              {(chatType === "group" || chatType === "channel") &&
                currentChat?.avatar && (
                  <AvatarImage
                    src={toAbsoluteUrl(currentChat.avatar)}
                    alt={chatType === "channel" ? "kanal rasmi" : "guruh rasmi"}
                  />
                )}
              {chatType === "private" && currentChat.user?.avatar && (
                <AvatarImage
                  src={toAbsoluteUrl(currentChat.user.avatar)}
                  alt="avatar"
                />
              )}
              <AvatarFallback className="bg-green-100 text-green-600">
                {chatType === "group" ? (
                  <Users className="w-5 h-5" />
                ) : chatType === "channel" ? (
                  <Hash className="w-5 h-5" />
                ) : (
                  currentChat.user?.username?.[0]?.toUpperCase() || "U"
                )}
              </AvatarFallback>
            </Avatar>
          </div>

          <div
            className="cursor-pointer flex-1 rounded-lg pl-1  pr-5 m-2 transition-colors"
            onClick={() => {
              console.log(
                "🎯 Header name clicked - chatType:",
                chatType,
                "currentChat.id:",
                currentChat?.id
              );
              if (chatType === "group" || chatType === "channel") {
                console.log(
                  "📋 Opening GroupInfoDialog for:",
                  chatType,
                  currentChat?.id
                );
                setShowGroupInfo(true);
              } else {
                console.log("👤 Opening user info for private chat");
                // Include online status information when opening user info
                const userWithStatus = {
                  ...currentChat.user,
                  isOnline: userStatuses[currentChat.user.id]?.isOnline ?? currentChat.user.isOnline ?? false,
                  lastSeen: userStatuses[currentChat.user.id]?.lastSeen ?? currentChat.user.lastSeen
                };
                window.dispatchEvent(
                  new CustomEvent("open-user-info", {
                    detail: userWithStatus,
                  })
                );
              }
            }}
            title={
              chatType === "group"
                ? "Guruh ma'lumotlarini ko'rish"
                : chatType === "channel"
                ? "Kanal ma'lumotlarini ko'rish"
                : "Foydalanuvchi ma'lumotlari"
            }>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {chatType === "group" || chatType === "channel"
                ? currentChat.name
                : `${currentChat.user.firstName} ${currentChat.user.lastName}` || "Private chat"}
            </h2>
            {(chatType === "group" || chatType === "channel") && (
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-slate-400">
                <span>{currentChat.memberCount || 0} a'zo</span>
                {isGroupMember &&
                  currentChat.onlineMembersCount !== undefined && (
                    <>
                      <span>•</span>
                      <span className="text-green-600">
                        {currentChat.onlineMembersCount} onlayn
                      </span>
                    </>
                  )}
              </div>
            )}
            {/* Private chat online status */}
            {chatType === "private" && currentChat.user && (
              <OnlineStatusIndicator
                isOnline={
                  userStatuses[currentChat.user.id]?.isOnline ?? 
                  currentChat.user.isOnline ?? 
                  false
                }
                lastSeen={
                  userStatuses[currentChat.user.id]?.lastSeen ?? 
                  currentChat.user.lastSeen
                }
                size="xs"
                username={currentChat.user.username}
                debug={currentChat.user.username}
              />
            )}
          </div>
        </div>

        {/* Chat actions */}
        <div className="flex items-center space-x-2">
          {/* Group/Channel info button */}
          {(chatType === "group" || chatType === "channel") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              onClick={() => setShowGroupInfo(true)}
              title={
                chatType === "channel"
                  ? "Kanal ma'lumotlari"
                  : "Guruh ma'lumotlari"
              }>
              <Info className="h-4 w-4" />
            </Button>
          )}

          {/* Menu button */}
          <div className="relative chat-header-menu-toggle">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}>
              <MoreVertical className="h-4 w-4" />
            </Button>

            {/* Dropdown menu */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50 chat-header-menu">
                {/* Clear history: only for group/channel admins */}
                {(chatType === 'group' && isGroupMember) || (chatType === 'channel' && isChannelWriter) ? (
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowClearHistoryDialog(true);
                      setShowMenu(false);
                    }}>
                    Tarixni tozalash
                  </button>
                ) : null}

                {/* Private chat clear history */}
                {chatType === "private" && (
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowClearHistoryDialog(true);
                      setShowMenu(false);
                    }}>
                    Tarixni tozalash
                  </button>
                )}

                {/* Leave channel */}
                {chatType === 'channel' && channelStatus?.isMember && (
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-600 text-red-600 flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChannelLeave();
                    }}>
                     Kanaldan chiqish
                  </button>
                )}

                {/* Delete chat option */}
                {/* Private chat delete option */}
                {chatType === "private" && (
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700  text-red-600 border-b border-gray-100 dark:border-slate-700 flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDeleteChat) {
                        onDeleteChat();
                      }
                      setShowMenu(false);
                    }}>
                    <Trash2 width={20} /> Chatni o'chirish
                  </button>
                )}

                {/* Group-specific options */}
                {chatType === "group" && isGroupMember && (
                  <>
                    {groupStatus?.role === "creator" && (
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-600 text-red-600 border-b border-gray-100 dark:border-slate-700 flex items-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowGroupDeleteModal(true);
                          setShowMenu(false);
                        }}>
                        O'chirish va chiqish
                      </button>
                    )}

                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowGroupLeaveModal(true);
                        setShowMenu(false);
                      }}>
                      Guruhdan chiqish
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4">
            {/* Loading state */}
            {isLoading && messages.length === 0 && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-slate-400">
                <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Hali xabarlar yo'q</p>
                <p className="text-sm">Birinchi xabarni yuboring!</p>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, index) => {
              // In channels, all messages should appear on one side (outgoing style)
              const isSelf =
                chatType === "channel" ? true : msg.user?.id === user?.id;
              const isEditing = editingMessageId === msg.id;
              const messageReaders = messageReadStatus[msg.id] || [];
              const isRead = messageReaders.length > 0;

              return (
                <div
                  key={msg.id || index}
                  className={`flex mb-4 ${
                    isSelf ? "justify-end" : "justify-start"
                  }`}
                  onContextMenu={(e) => handleContextMenu(e, msg)}
                  data-message-id={msg.id}
                  data-message-user-id={msg.user.id}>
                  {!isSelf && (
                    <Avatar className="w-8 h-8 mr-2 self-end">
                      {msg.user?.avatar && (
                        <AvatarImage
                          src={toAbsoluteUrl(msg.user.avatar)}
                          alt="avatar"
                        />
                      )}
                      <AvatarFallback className="bg-gray-300 text-gray-700">
                        {msg.user?.username?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
                    {!isSelf && (
                      <div className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                        {msg.user?.firstName} {msg.user?.lastName}
                      </div>
                    )}

                     {isEditing ? (
                      <div
                        className={`p-3 rounded-lg ${
                          isSelf ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-slate-800"
                        }`}>
                        <Input
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              commitEditMessage();
                            } else if (e.key === "Escape") {
                              setEditingMessageId(null);
                              setEditingContent("");
                            }
                          }}
                          className="bg-white dark:bg-slate-900 text-black dark:text-white"
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={commitEditMessage}>
                            Saqlash
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingMessageId(null);
                              setEditingContent("");
                            }}>
                            Bekor qilish
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`${getMessageContainerStyle(msg, isSelf)} ${
                          msg.image && msg.content
                            ? "overflow-hidden shadow-sm"
                            : ""
                        }`}>
                        {/* Image rendering (single or album) */}
                        {msg.images && Array.isArray(msg.images) && msg.images.length > 0 && (
                          <div 
                            className={`relative ${msg.content ? "overflow-hidden rounded-t-2xl shadow-sm" : "overflow-hidden rounded-2xl shadow-sm"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open image preview carousel
                              const allChatImages = getAllChatImages();
                              setImagePreviewData({
                                images: msg.images,
                                allChatImages: allChatImages,
                                startIndex: 0
                              });
                            }}
                          >
                            <div className="grid grid-cols-2 gap-1 max-w-[300px] cursor-pointer">
                              {msg.images.slice(0, 4).map((u, i, arr) => {
                                const count = arr.length;
                                // Determine rounded corners so only the OUTER corners are rounded
                                let rounded = "";
                                if (msg.content) {
                                  // When there is a caption, only top corners should be rounded on the first row
                                  if (i === 0) rounded = "rounded-tl-2xl";
                                  else if (i === 1) rounded = "rounded-tr-2xl";
                                } else {
                                  // No caption: round outer corners based on index and count (up to 4)
                                  if (count === 1) {
                                    rounded = "rounded-2xl";
                                  } else if (count === 2) {
                                    rounded = i === 0 ? "rounded-l-2xl" : "rounded-r-2xl";
                                  } else if (count >= 3) {
                                    if (i === 0) rounded = "rounded-tl-2xl";
                                    else if (i === 1) rounded = "rounded-tr-2xl";
                                    else if (i === 2 && count === 3) rounded = "rounded-b-2xl"; // third spans bottom row
                                    else if (i === 2) rounded = "rounded-bl-2xl";
                                    else if (i === 3) rounded = "rounded-br-2xl";
                                  }
                                }
                                return (
                                  <img
                                    key={i}
                                    src={toAbsoluteUrl(u)}
                                    alt="img"
                                    className={`${rounded} w-full h-[150px] object-cover`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {/* Caption for album (images array) */}
                        {msg.content && msg.images && Array.isArray(msg.images) && msg.images.length > 0 && (
                          <div
                            className={`text-sm break-words whitespace-pre-wrap overflow-wrap-anywhere p-3 ${
                              chatType === "channel"
                                ? "bg-gray-200 text-gray-900 dark:bg-slate-800 dark:text-slate-100"
                                : isSelf
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200 text-gray-900 dark:bg-slate-800 dark:text-slate-100"
                            } rounded-b-2xl rounded-t-none`}
                          >
                            {msg.content}
                            <div className="flex items-center justify-end gap-1 mt-2">
                              {/* Channel view count */}
                              {chatType === "channel" && (
                                <div className="flex items-center gap-1">
                                  <Eye className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                                  <span className={`text-xs ${chatType === "channel" ? "text-gray-600 dark:text-slate-400" : isSelf ? "text-blue-200" : "text-gray-600 dark:text-slate-400"}`}>
                                    {Array.isArray(messageReaders) ? messageReaders.length : 0}
                                  </span>
                                </div>
                              )}
                              <span className={`text-xs ${chatType === "channel" ? "text-gray-600 dark:text-slate-400" : isSelf ? "text-blue-200" : "text-gray-600 dark:text-slate-400"}`}>
                                {msg.isEdited && "edited • "}
                                {new Date(msg.timestamp).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {isSelf && chatType !== 'channel' && (
                                <div>
                                  {isRead ? (
                                    <CheckCheck className="w-4 h-4 text-blue-300" title={`${messageReaders.length} kishi o'qidi`} />
                                  ) : (
                                    <Check className="w-4 h-4 text-blue-300" title="Yuborildi" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {msg.image && (
                          <div
                            className={`relative ${
                              msg.content
                                ? ""
                                : "overflow-hidden rounded-2xl shadow-sm"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open image preview carousel
                              const allChatImages = getAllChatImages();
                              setImagePreviewData({
                                images: [msg.image],
                                allChatImages: allChatImages,
                                startIndex: allChatImages.indexOf(msg.image)
                              });
                            }}
                          >
                            <img
                              src={toAbsoluteUrl(msg.image)}
                              alt="Yuborilgan rasm"
                              className={`max-w-full cursor-pointer hover:opacity-90 transition-opacity w-full block ${
                                msg.content ? "rounded-t-2xl" : "rounded-2xl"
                              }`}
                              style={{
                                maxWidth: "300px",
                                maxHeight: "300px",
                                display: "block",
                              }}
                            />
                          </div>
                        )}

                        {/* Voice message rendering */}
                        {msg.voiceMessage && (
                          <VoiceMessagePlayer
                            voiceMessage={msg.voiceMessage}
                            isSelf={isSelf}
                            timestamp={msg.timestamp}
                            isEdited={msg.isEdited}
                            isRead={isRead}
                            messageReaders={messageReaders}
                            chatType={chatType}
                          />
                        )}

                        {/* Text content */}
                        {msg.content && !msg.image && !msg.voiceMessage && !(msg.images && Array.isArray(msg.images) && msg.images.length > 0) && (
                          <div
                            className={`text-sm break-words text-left whitespace-pre-wrap overflow-wrap-anywhere p-3 pb-1 rounded-lg ${
                              chatType === "channel"
                                ? "bg-gray-200 text-gray-900 dark:bg-slate-800 dark:text-slate-100"
                                : isSelf
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200 text-gray-900 dark:bg-slate-800 dark:text-slate-100"
                            }`}>
                            {msg.content}
                            {/* Footer for text-only messages */}
                            <div className="flex items-center justify-end gap-1 mt-2">
                             
                              {/* Channel view count */}
                              {chatType === "channel" && (
                                <div className="flex items-center gap-1">
                                  <Eye className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                                  <span className={`text-xs ${chatType === "channel" ? "text-gray-600 dark:text-slate-400" : isSelf ? "text-blue-200" : "text-gray-600 dark:text-slate-400"}`}>
                                    {Array.isArray(messageReaders) ? messageReaders.length : 0}
                                  </span>
                                </div>
                              )}
                               <span className={`text-xs ${chatType === "channel" ? "text-gray-600 dark:text-slate-400" : isSelf ? "text-blue-200" : "text-gray-600 dark:text-slate-400"}`}>
                                {msg.isEdited && "edited • "}
                                {new Date(msg.timestamp).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                              </span>

                              {isSelf && chatType !== 'channel' && (
                                <div>
                                  {isRead ? (
                                    <CheckCheck className="w-4 h-4 text-blue-300" title={`${messageReaders.length} kishi o'qidi`} />
                                  ) : (
                                    <Check className="w-4 h-4 text-blue-300" title="Yuborildi" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Text content for image+text combinations */}
                        {msg.content && msg.image && (
                          <div
                            className={`text-sm break-words whitespace-pre-wrap overflow-wrap-anywhere p-3 ${
                              chatType === "channel"
                                ? "bg-gray-200 text-gray-900 dark:bg-slate-800 dark:text-slate-100"
                                : isSelf
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200 text-gray-900 dark:bg-slate-800 dark:text-slate-100"
                            } rounded-b-2xl rounded-t-none`}>
                            {msg.content}
                            {/* Footer inside the caption bubble to avoid white background */}
                            <div className="flex items-center justify-end gap-1 mt-2">
                              
                              {/* Channel view count */}
                              {chatType === "channel" && (
                                <div className="flex items-center gap-1">
                                  <Eye className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                                  <span className={`text-xs ${chatType === "channel" ? "text-gray-600 dark:text-slate-400" : isSelf ? "text-blue-200" : "text-gray-600 dark:text-slate-400"}`}>
                                    {Array.isArray(messageReaders) ? messageReaders.length : 0}
                                  </span>
                                </div>
                              )}
                              <span className={`text-xs ${chatType === "channel" ? "text-gray-600 dark:text-slate-400" : isSelf ? "text-blue-200" : "text-gray-600 dark:text-slate-400"}`}>
                                {msg.isEdited && "edited • "}
                                {new Date(msg.timestamp).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {isSelf && chatType !== 'channel' && (
                                <div>
                                  {isRead ? (
                                    <CheckCheck className="w-4 h-4 text-blue-300" title={`${messageReaders.length} kishi o'qidi`} />
                                  ) : (
                                    <Check className="w-4 h-4 text-blue-300" title="Yuborildi" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Text content for voice+text combinations */}
                        {msg.content && msg.voiceMessage && (
                          <div
                            className={`text-sm break-words whitespace-pre-wrap overflow-wrap-anywhere p-3 rounded-lg mt-2 ${
                              chatType === "channel"
                                ? "bg-gray-200 text-gray-900 dark:bg-slate-800 dark:text-slate-100"
                                : isSelf
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200 text-gray-900 dark:bg-slate-800 dark:text-slate-100"
                            }`}>
                            {msg.content}
                          </div>
                        )}

                        {/* Message footer for image-only (overlay). Text-only and image+text have inline footers; voice handled in component */}
                        {!msg.voiceMessage && msg.image && !msg.content && (
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 ${
                              msg.image && msg.content
                                ? "px-3 pb-2"
                                : msg.image && !msg.content
                                ? "absolute bottom-2 right-2 bg-black dark:bg-slate-900 bg-opacity-50 rounded px-2 py-1"
                                : "px-2 py-1"
                            }`}>
                            <span
                              className={`text-xs ${
                                msg.image && !msg.content
                                  ? "text-white dark:text-slate-100"
                                  : chatType === "channel"
                                  ? "text-gray-500 dark:text-slate-400"
                                  : isSelf
                                  ? "text-blue-200"
                                  : "text-gray-500 dark:text-slate-400"
                              }`}>
                              {msg.isEdited && "edited • "}
                              {new Date(msg.timestamp).toLocaleTimeString(
                                "uz-UZ",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                            {/* Channel view count */}
                            {chatType === "channel" && (
                              <span
                                className={`text-xs ${
                                  msg.image && !msg.content
                                    ? "text-white dark:text-slate-100"
                                    : "text-gray-400 dark:text-slate-400"
                                }`}
                                title="Ko'rilganlar soni">
                                {Array.isArray(messageReaders)
                                  ? messageReaders.length
                                  : 0}
                              </span>
                            )}

                            {isSelf && chatType !== 'channel' && (
                              <div>
                                {isRead ? (
                                  <CheckCheck
                                    className={`w-4 h-4 ${
                                      msg.image && !msg.content
                                        ? "text-white dark:text-slate-100"
                                        : isSelf
                                        ? "text-blue-300"
                                        : "text-gray-400 dark:text-slate-400"
                                    }`}
                                    title={`${messageReaders.length} `}
                                  />
                                ) : (
                                  <Check
                                    className={`w-4 h-4 ${
                                      msg.image && !msg.content
                                        ? "text-white dark:text-slate-100"
                                        : isSelf
                                        ? "text-blue-300"
                                        : "text-gray-400 dark:text-slate-400"
                                    }`}
                                    title="Yuborildi"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {hasTypingUsers && (
              <div className="flex items-center space-x-2 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                </div>
                <span className="text-sm text-gray-500 dark:text-slate-400">{typingText}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Jump to bottom button */}
        {showJumpButton && (
          <div className="absolute bottom-4 right-4">
            <Button
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700"
              onClick={jumpToBottom}>
              <ChevronDown className="h-5 w-5" />
              {newMessagesCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 dark:bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {newMessagesCount > 99 ? "99+" : newMessagesCount}
                </span>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Group join section */}
      {chatType === "group" && !isGroupMember && (
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <div className="text-center">
            <p className="text-gray-600 dark:text-slate-400 mb-3">Bu guruhga a'zo bo'lmagan siz</p>
            <Button
              onClick={handleJoinGroup}
              className="bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white">
              Guruhga qo'shilish
            </Button>
          </div>
        </div>
      )}

      {/* Channel join section */}
      {chatType === "channel" && !channelStatus?.isMember && (
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <div className="text-center">
            <p className="text-gray-600 dark:text-slate-400 mb-3">Bu kanalga a'zo emassiz</p>
            <Button
              onClick={async () => {
                try {
                  const token = storage.getPersistent("chatToken");
                  if (!token) return;
                  await joinChannel(token, currentChat.id);
                  toast({
                    title: "Kanalga qo'shildingiz!",
                    description: "Endi kanal xabarlarini ko'rasiz",
                  });
                  checkChannelMembership();
                } catch (error) {
                  toast({
                    title: "Xatolik!",
                    description:
                      error?.message || "Kanalga qo'shilishda xatolik",
                    variant: "destructive",
                  });
                }
              }}
              className="bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white">
              Kanalga qo'shilish
            </Button>
          </div>
        </div>
      )}

      {/* Message input */}
      {(chatType === "private" ||
        (chatType === "group" && isGroupMember) ||
        (chatType === "channel" && channelStatus?.isMember && isChannelWriter)) && (
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-end space-x-2">
            {/* Emoji Picker */}
            <EmojiPicker
              isOpen={showEmojiPicker}
              onToggle={setShowEmojiPicker}
              onEmojiSelect={(emoji) => {
                if (editingMessageId) {
                  setEditingContent((prev) => prev + emoji);
                } else {
                  setMessage((prev) => prev + emoji);
                }
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 100);
              }}
              className=""
            />

            {/* Voice Recording UI */}
            {isRecording && (
              <div className="flex-1 flex items-center space-x-3 bg-red-50 dark:bg-red-600 rounded-lg px-4 py-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-600 dark:text-red-500 font-medium">
                  Yozilmoqda... {formatRecordingTime(recordingTime)}
                </span>
                <div className="flex-1"></div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-red-600"
                  onClick={cancelVoiceRecording}
                  title="Bekor qilish">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Voice Message Preview */}
            {!isRecording && audioBlob && (
              <div className="flex-1 flex items-center space-x-3 bg-blue-50 dark:bg-blue-600 rounded-lg px-4 py-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-blue-600 dark:text-blue-500 font-medium">
                  Ovozli xabar ({formatRecordingTime(recordingTime)})
                </span>
                <div className="flex-1"></div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-red-600"
                  onClick={cancelVoiceRecording}
                  title="Bekor qilish">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Normal Message Input */}
            {!isRecording && !audioBlob && (
              <>
                <div className="flex-1 relative">
                  <Textarea
                    ref={inputRef}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      startTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (editingMessageId) {
                          commitEditMessage();
                        } else {
                          handleSendMessage();
                        }
                      }
                    }}
                    placeholder="Xabar yozing..."
                    className="flex-1 min-h-[40px] max-h-32 resize-none rounded-lg border p-2 bg-background dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    rows={1}
                  />
                </div>

                {/* Attachment Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  onClick={() => setShowImageUpload(true)}>
                  <Paperclip className="h-5 w-5" />
                </Button>
              </>
            )}

            {/* Send/Voice Button */}
            <div className="flex space-x-1">
              {/* Microphone Button */}
              <Button
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                variant="ghost"
                className={`h-10 w-10 p-0 flex-shrink-0 rounded-full ${
                  isRecording
                    ? "bg-red-100 dark:bg-red-600 hover:bg-red-200 dark:hover:bg-red-700"
                    : "hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}>
                <Mic className="h-5 w-5" />
              </Button>

              {/* Send Button */}
              <Button
                onClick={() => {
                  if (editingMessageId) {
                    commitEditMessage();
                  } else if (audioBlob) {
                    sendVoiceMessage();
                  } else {
                    handleSendMessage();
                  }
                }}
                disabled={
                  (!message?.trim() && !audioBlob) ||
                  (editingMessageId && !editingContent?.trim())
                }
                className="h-10 w-10 p-0 flex-shrink-0 rounded-full bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700">
                <Send className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className={`fixed bg-white dark:bg-slate-800 shadow-lg rounded-md py-1 z-50 ${contextMenu.visible ? 'block' : 'hidden'}`}
          style={{
            left: Math.min(Math.max(8, contextMenu.x), window.innerWidth - 105),
            top: Math.min(Math.max(8, contextMenu.y), window.innerHeight - 100),
          }}>
          {contextMenu.message?.user?.id === user?.id && (
            <>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                onClick={() => startEditingMessage(contextMenu.message)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Tahrirlash
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center"
                onClick={() => handleDeleteMessage(contextMenu.message)}>
                <Trash2 className="h-4 w-4 mr-2" />
                O'chirish
              </button>
            </>
          )}
        </div>
      )}

      {/* Image Upload Dialog */}
      {showImageUpload && (
        <ImageUpload
          autoOpen={true}
          isForMessage={true}
          onComplete={handleImageUploadComplete}
          onCancel={() => setShowImageUpload(false)}
        />
      )}

      {/* Info Dialogs */}
      {showGroupInfo && (
        <>
          {chatType === "group" ? (
            <GroupInfoDialog
              isOpen={showGroupInfo}
              onClose={() => {
                console.log("🚪 Closing GroupInfoDialog");
                setShowGroupInfo(false);
              }}
              groupId={currentChat?.id}
            />
          ) : (
            <ChannelInfoDialog
              isOpen={showGroupInfo}
              onClose={() => {
                console.log("🚪 Closing ChannelInfoDialog");
                setShowGroupInfo(false);
              }}
              channelId={currentChat?.id}
            />
          )}
        </>
      )}

      {/* Group Delete Modal */}
      {showGroupDeleteModal && (
        <div className="fixed inset-0 bg-gray-100/50 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-red-600 font-semibold text-lg">
                  {currentChat?.name?.charAt(0) || "G"}
                </span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {currentChat?.name || "Guruh"}
                </h3>
              </div>
            </div>

            <p className="text-gray-600 mb-4">Bu guruhdan chiqmoqchimisiz?</p>

            <div className="flex items-center mb-6">
              <input
                type="checkbox"
                id="deleteForEveryone"
                className="mr-2"
                onChange={(e) => setDeleteForEveryone(e.target.checked)}
              />
              <label
                htmlFor="deleteForEveryone"
                className="text-sm text-gray-700">
                Hamma uchun o'chirish
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                onClick={() => setShowGroupDeleteModal(false)}>
                Bekor qilish
              </button>
              <button
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                onClick={handleGroupDelete}>
                Chiqish
              </button>
            </div>
          </div>
        </div>
      )}

      <GroupLeaveModal
        isOpen={showGroupLeaveModal}
        onClose={() => setShowGroupLeaveModal(false)}
        onConfirm={handleGroupLeave}
        groupName={currentChat?.name || "Guruh"}
        isCreator={groupStatus?.role === 'creator'}
      />

      <ClearHistoryDialog
        open={showClearHistoryDialog}
        onOpenChange={setShowClearHistoryDialog}
        showForEveryoneToggle={canClearForEveryone}
        onConfirm={(forEveryone) => {
          if (onClearHistory) {
            onClearHistory(canClearForEveryone ? !!forEveryone : false);
          }
          setShowClearHistoryDialog(false);
        }}
      />

      {/* Image Preview Modal */}
      {imagePreviewData && (
        <ImagePreview
          images={imagePreviewData.images}
          allChatImages={imagePreviewData.allChatImages}
          currentImageIndex={imagePreviewData.startIndex}
          onClose={() => setImagePreviewData(null)}
        />
      )}
    </div>
  );
};

export default ChatArea;
