import { useEffect, useRef } from "react";

export const useSocket = (userId, onMessage, onStatusUpdate) => {
  const wsRef = useRef(null);
  const heartbeatRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const sendChatViewEvent = (chatType, chatId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "chatViewed",
        chatType,
        chatId,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const sendMessageViewEvent = (messageId, chatType, chatId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "messageViewed",
        messageId,
        chatType,
        chatId,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const endMessageViewEvent = (messageId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "messageViewEnded",
        messageId,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const clearChatHistory = (chatType, chatId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "clearChatHistory",
        chatType,
        chatId,
        clearedBy: userId,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const connectWebSocket = () => {
    if (!userId) return;
    const ws = new WebSocket("ws://localhost:3000");
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      console.log('рџ”— WebSocket connected, authenticating user:', userId);
      ws.send(JSON.stringify({ 
        type: "auth", 
        userId,
        location: 'web'
      }));
      
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "ping", 
            timestamp: new Date().toISOString(),
            location: 'web'
          }));
        }
      }, 15000);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "newMessage" && onMessage) {
          onMessage(data.data);
          window.dispatchEvent(new CustomEvent('new-message', { detail: data.data }));
        }
        if (data.type === "message" && onMessage) {
          onMessage(data.data);
        }
        if (data.type === "userStatusUpdate" && onStatusUpdate) {
          console.log('рџџў User status update received:', data.data);
          onStatusUpdate(data.data);
        }
        if (data.type === "pong") {
        }
        if (data.type === "authSuccess") {
          console.log('вњ… WebSocket auth successful:', data.data);
        }
        if (data.type === "groupCreated") {
          window.dispatchEvent(new CustomEvent('group-created', { detail: data.data }));
        }
        if (data.type === "channelCreated") {
          window.dispatchEvent(new CustomEvent('channel-created', { detail: data.data }));
        }
        if (data.type === "groupJoined") {
          window.dispatchEvent(new CustomEvent('group-joined', { detail: data.data }));
        }
        if (data.type === "channelJoined") {
          window.dispatchEvent(new CustomEvent('channel-joined', { detail: data.data }));
        }
        if (data.type === "messageEdit") {
          window.dispatchEvent(new CustomEvent('message-edited', { detail: {
            messageId: data.messageId,
            content: data.content,
            chatId: data.chatId,
            chatType: data.chatType,
            timestamp: data.timestamp
          }}));
        }
        if (data.type === "messageDelete") {
          window.dispatchEvent(new CustomEvent('message-deleted', { detail: {
            messageId: data.messageId,
            chatId: data.chatId,
            chatType: data.chatType,
            timestamp: data.timestamp
          }}));
        }
        if (data.type === "messageRead") {
          window.dispatchEvent(new CustomEvent('message-read', { detail: data.data }));
        }
        if (data.type === "messageReadReceipt") {
          window.dispatchEvent(new CustomEvent('message-read', { detail: data.data }));
        }
        if (data.type === "chatRead") {
          window.dispatchEvent(new CustomEvent('chat-read', { detail: data.data }));
        }
        if (data.type === "messageViewUpdate") {
          window.dispatchEvent(new CustomEvent('message-view-update', { detail: data.data }));
        }
        if (data.type === "messageViewEnded") {
          window.dispatchEvent(new CustomEvent('message-view-ended', { detail: data.data }));
        }
        if (data.type === "chatDeleted") {
          window.dispatchEvent(new CustomEvent('chat-deleted', { detail: data.data }));
        }
        if (data.type === "privateChatCreated") {
          window.dispatchEvent(new CustomEvent('private-chat-created', { detail: data.data }));
        }
        if (data.type === "chatHistoryCleared") {
          if (onMessage) {
            onMessage(data);
          }
        }
        if (data.type === "clearChatHistorySuccess") {
          window.dispatchEvent(new CustomEvent('clear-history-success', { detail: data.data }));
        }
        if (data.type === "clearChatHistoryError") {
          window.dispatchEvent(new CustomEvent('clear-history-error', { detail: data.data }));
        }
        if (data.type === "typingStart") {
        }
        if (data.type === "typingStop") {
        }
        if (data.type === "memberPromoted") {
          console.log('рџ‘‘ Member promoted:', data.data);
          window.dispatchEvent(new CustomEvent('memberPromoted', { detail: data }));
        }
        if (data.type === "memberDemoted") {
          console.log('рџ‘¤ Member demoted:', data.data);
          window.dispatchEvent(new CustomEvent('memberDemoted', { detail: data }));
        }
        if (data.type === "memberRemoved") {
          console.log('вќЊ Member removed:', data.data);
          window.dispatchEvent(new CustomEvent('memberRemoved', { detail: data }));
        }
        if (data.type === "memberLeft") {
          window.dispatchEvent(new CustomEvent('memberLeft', { detail: data }));
          const { groupId, userId: leftUserId } = data.data || {};
          if (groupId && leftUserId && parseInt(leftUserId) === parseInt(userId)) {
            window.dispatchEvent(new CustomEvent('chat-deleted', { detail: {
              chatType: 'group',
              chatId: groupId,
              deletedBy: leftUserId,
              timestamp: new Date().toISOString()
            }}));
          }
        }
        if (data.type === "groupInfoUpdated") {
          console.log('рџ“ќ Group info updated:', data.data);
          window.dispatchEvent(new CustomEvent('groupInfoUpdated', { detail: data }));
        }
        if (data.type === "channelInfoUpdated") {
          console.log('рџ“ќ Channel info updated:', data.data);
          window.dispatchEvent(new CustomEvent('channelInfoUpdated', { detail: data }));
        }
        if (data.type === "groupDeleted") {
          console.log('рџ—‘пёЏ Group deleted:', data.data);
          window.dispatchEvent(new CustomEvent('groupDeleted', { detail: data }));
          // Normalize to sidebar/chat listeners
          const { groupId, deletedBy } = data.data || {};
          if (groupId) {
            window.dispatchEvent(new CustomEvent('chat-deleted', { detail: {
              chatType: 'group',
              chatId: groupId,
              deletedBy: deletedBy,
              timestamp: new Date().toISOString()
            }}));
          }
        }
        if (data.type === "groupInfoUpdated") {
          console.log('рџ“ќ Group info updated via WebSocket:', data.data);
          const { groupId, updates } = data.data;
          window.dispatchEvent(new CustomEvent('group-info-updated', { 
            detail: { 
              groupId, 
              ...updates,
              updatedBy: 'websocket'
            }
          }));
        }
        if (data.type === "userStatusUpdate") {
          console.log('рџџў User status update event:', data.data);
          window.dispatchEvent(new CustomEvent('userStatusUpdate', { detail: data }));
        }
        if (data.type === "groupOnlineCountUpdate") {
          console.log('рџ”ў Group online count update:', data.data);
          const { groupId, onlineCount, updatedUserId, isOnline } = data.data;
          window.dispatchEvent(new CustomEvent('group-online-count-updated', { 
            detail: { groupId, onlineCount, updatedUserId, isOnline }
          }));
        }
        if (data.type === "channelLeft") {
          console.log('рџ“¤ Channel left:', data.data);
          window.dispatchEvent(new CustomEvent('channelLeft', { detail: data.data }));
        }
        if (data.type === "channelAdminGranted") {
          console.log('рџ‘‘ Channel admin granted:', data.data);
          window.dispatchEvent(new CustomEvent('channelAdminGranted', { detail: data.data }));
        }
        if (data.type === "channelAdminRevoked") {
          console.log('рџ‘¤ Channel admin revoked:', data.data);
          window.dispatchEvent(new CustomEvent('channelAdminRevoked', { detail: data.data }));
        }
        if (data.type === "userProfileUpdated") {
          console.log('рџ‘¤ User profile updated:', data.data);
          window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: data.data }));
        }
      } catch (error) {
      }
    };
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [userId]);

  const getCurrentSocket = () => wsRef.current;

  return {
    socket: wsRef.current,
    getCurrentSocket,
    sendChatViewEvent,
    sendMessageViewEvent,
    endMessageViewEvent,
    clearChatHistory
  };
};