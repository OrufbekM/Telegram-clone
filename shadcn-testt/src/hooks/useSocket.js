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
      console.log('🔗 WebSocket connected, authenticating user:', userId);
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

        // Handle all message types
        switch (data.type) {
          case "newMessage":
            if (onMessage) {
              onMessage(data.data);
            }
            window.dispatchEvent(new CustomEvent('new-message', { detail: data.data }));
            break;

          case "message":
            if (onMessage) {
              onMessage(data.data);
            }
            window.dispatchEvent(new CustomEvent('message', { detail: data.data }));
            break;

          case "userStatusUpdate":
            console.log('🔵 User status update received:', data.data);
            if (onStatusUpdate) onStatusUpdate(data.data);
            window.dispatchEvent(new CustomEvent('user-status-update-global', { detail: data.data }));
            break;

          case "userProfileUpdated":
            console.log('🔄 User profile update received:', data);
            if (onStatusUpdate) {
              onStatusUpdate({
                type: 'profileUpdate',
                userId: data.data.userId,
                updates: data.data.updates
              });
            }
            // Hyphenated event name (used by several components)
            window.dispatchEvent(new CustomEvent('user-profile-updated', { 
              detail: { 
                userId: data.data.userId, 
                updates: data.data.updates 
              } 
            }));
            // CamelCase event name (backward compatibility for ChatApp listener)
            window.dispatchEvent(new CustomEvent('userProfileUpdated', { 
              detail: { 
                userId: data.data.userId, 
                updates: data.data.updates 
              } 
            }));
            break;

          case "pong":
            // Heartbeat response, no action needed
            break;

          case "authSuccess":
            console.log('✅ WebSocket auth successful:', data.data);
            break;

          case "groupCreated":
            window.dispatchEvent(new CustomEvent('group-created', { detail: data.data }));
            break;

          case "channelCreated":
            window.dispatchEvent(new CustomEvent('channel-created', { detail: data.data }));
            break;

          case "groupJoined":
            window.dispatchEvent(new CustomEvent('group-joined', { detail: data.data }));
            break;

          case "channelJoined":
            window.dispatchEvent(new CustomEvent('channel-joined', { detail: data.data }));
            break;

          case "messageEdit":
            window.dispatchEvent(new CustomEvent('message-edited', {
              detail: {
                messageId: data.messageId,
                content: data.content,
                chatId: data.chatId,
                chatType: data.chatType,
                timestamp: data.timestamp
              }
            }));
            break;

          case "messageDelete":
            window.dispatchEvent(new CustomEvent('message-deleted', {
              detail: {
                messageId: data.messageId,
                chatId: data.chatId,
                chatType: data.chatType,
                timestamp: data.timestamp
              }
            }));
            break;

          case "messageRead":
            window.dispatchEvent(new CustomEvent('message-read', { detail: data.data }));
            break;

          case "messageReadReceipt":
            window.dispatchEvent(new CustomEvent('message-read', { detail: data.data }));
            break;

          case "chatRead":
            window.dispatchEvent(new CustomEvent('chat-read', { detail: data.data }));
            break;

          case "messageViewUpdate":
            window.dispatchEvent(new CustomEvent('message-view-update', { detail: data.data }));
            break;

          case "messageViewEnded":
            window.dispatchEvent(new CustomEvent('message-view-ended', { detail: data.data }));
            break;

          case "chatDeleted":
            window.dispatchEvent(new CustomEvent('chat-deleted', { detail: data.data }));
            break;

          case "privateChatCreated":
            window.dispatchEvent(new CustomEvent('private-chat-created', { detail: data.data }));
            break;

          case "chatHistoryCleared":
            if (onMessage) {
              onMessage(data);
            }
            break;

          case "clearChatHistorySuccess":
            window.dispatchEvent(new CustomEvent('clear-history-success', { detail: data.data }));
            break;

          case "clearChatHistoryError":
            window.dispatchEvent(new CustomEvent('clear-history-error', { detail: data.data }));
            break;

          case "typingStart":
            // No action needed for typing indicators in sidebar
            break;

          case "typingStop":
            // No action needed for typing indicators in sidebar
            break;

          case "memberPromoted":
            console.log('👑 Member promoted:', data.data);
            window.dispatchEvent(new CustomEvent('memberPromoted', { detail: data }));
            break;

          case "memberDemoted":
            console.log('🙅 Member demoted:', data.data);
            window.dispatchEvent(new CustomEvent('memberDemoted', { detail: data }));
            break;

          case "memberRemoved":
            console.log('❌ Member removed:', data.data);
            window.dispatchEvent(new CustomEvent('memberRemoved', { detail: data }));
            break;

          case "memberLeft":
            window.dispatchEvent(new CustomEvent('memberLeft', { detail: data.data }));
            const { groupId: leftGroupId, userId: leftUserId } = data.data || {};
            if (leftGroupId && leftUserId && parseInt(leftUserId) === parseInt(userId)) {
              window.dispatchEvent(new CustomEvent('chat-deleted', {
                detail: {
                  chatType: 'group',
                  chatId: leftGroupId,
                  deletedBy: leftUserId,
                  timestamp: new Date().toISOString()
                }
              }));
            }
            break;

          case "groupInfoUpdated":
            console.log('📋 Group info updated:', data.data);
            window.dispatchEvent(new CustomEvent('groupInfoUpdated', { detail: data }));
            // Normalize to sidebar/chat listeners
            const { groupId: updatedGroupId, updates } = data.data;
            window.dispatchEvent(new CustomEvent('group-info-updated', {
              detail: {
                groupId: updatedGroupId,
                ...updates,
                updatedBy: 'websocket'
              }
            }));
            break;

          case "channelInfoUpdated":
            console.log('📋 Channel info updated:', data.data);
            window.dispatchEvent(new CustomEvent('channelInfoUpdated', { detail: data }));
            break;

          case "groupDeleted":
            console.log('🗑️ Group deleted:', data.data);
            window.dispatchEvent(new CustomEvent('groupDeleted', { detail: data }));
            // Normalize to sidebar/chat listeners
            const { groupId: deletedGroupId, deletedBy } = data.data || {};
            if (deletedGroupId) {
              window.dispatchEvent(new CustomEvent('chat-deleted', {
                detail: {
                  chatType: 'group',
                  chatId: deletedGroupId,
                  deletedBy: deletedBy,
                  timestamp: new Date().toISOString()
                }
              }));
            }
            break;

          case "userStatusUpdate":
            console.log('🔵 User status update event:', data.data);
            window.dispatchEvent(new CustomEvent('userStatusUpdate', { detail: data }));
            break;

          case "groupOnlineCountUpdate":
            console.log('🔵 Group online count update:', data.data);
            const { groupId: onlineGroupId, onlineCount, updatedUserId, isOnline } = data.data;
            window.dispatchEvent(new CustomEvent('group-online-count-updated', {
              detail: { groupId: onlineGroupId, onlineCount, updatedUserId, isOnline }
            }));
            break;

          case "channelLeft":
            console.log('📢 Channel left:', data.data);
            window.dispatchEvent(new CustomEvent('channelLeft', { detail: data.data }));
            break;

          case "channelAdminGranted":
            console.log('👑 Channel admin granted:', data.data);
            window.dispatchEvent(new CustomEvent('channelAdminGranted', { detail: data.data }));
            break;

          case "channelAdminRevoked":
            console.log('🙅 Channel admin revoked:', data.data);
            window.dispatchEvent(new CustomEvent('channelAdminRevoked', { detail: data.data }));
            break;

          

          default:
            // Handle any other message types
            console.log('📥 WebSocket message received:', data.type, data);
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Reconnecting... Attempt ${reconnectAttemptsRef.current}`);
          connectWebSocket();
        }, 1000 * reconnectAttemptsRef.current);
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