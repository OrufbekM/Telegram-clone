const db = require("../models");
const Message = db.messages;
const MessageRead = db.messageReads;
const User = db.users;
const Group = db.groups;
const GroupMember = db.groupMembers;
const PrivateChat = db.privateChats;

exports.sendMessage = async (req, res) => {
  try {
    const { content, image, images, voiceMessage, chatType, chatId, replyToMessageId } = req.body;

    if ((!content || !content.trim()) && !image && !voiceMessage && !(images && images.length)) {
      return res.status(400).json({
        message: "Content, image(s), or voice message is required!",
      });
    }

    if (!chatType || chatId === undefined || chatId === null) {
      return res.status(400).json({
        message: "chatType and chatId are required!",
      });
    }

    if (!["private", "group", "channel"].includes(chatType)) {
      return res.status(400).json({
        message: "Chat type must be 'private', 'group' or 'channel'!",
      });
    }

    const chatIdInt = parseInt(chatId, 10);

    if (Number.isNaN(chatIdInt)) {
      return res.status(400).json({ message: "chatId must be a number" });
    }

    let replyId = null;

    if (replyToMessageId !== undefined && replyToMessageId !== null) {
      const parsed = parseInt(replyToMessageId, 10);

      if (!Number.isNaN(parsed)) replyId = parsed;
    }

    if (chatType === "group" || chatType === "channel") {
      const groupMember = await db.groupMembers.findOne({
        where: { groupId: chatIdInt, userId: req.userId },
      });

      if (!groupMember) {
        return res.status(403).json({
          message: chatType === 'channel' ? "You are not a member of this channel!" : "You are not a member of this group!",
        });
      }
      // For channels, only creator/admins can post
      if (chatType === 'channel' && !["creator", "admin"].includes(groupMember.role)) {
        return res.status(403).json({ message: "Only channel admins can post messages!" });
      }
    } else if (chatType === "private") {
      const privateChat = await PrivateChat.findOne({
        where: {
          id: chatIdInt,
          [db.Sequelize.Op.or]: [
            { user1Id: req.userId },
            { user2Id: req.userId },
          ],
          isActive: true,
        },
      });

      if (!privateChat) {
        return res.status(403).json({
          message:
            "You don't have access to this private chat or chat has been deleted!",
        });
      }
    }

    // Handle voice message file saving
    let voiceFilePath = null;
    let voiceDuration = null;
    
    if (voiceMessage && voiceMessage.data) {
      const fs = require('fs');
      const path = require('path');
      
      try {
        console.log('Processing voice message: ', {
          path: voiceFilePath,
          duration: voiceMessage.duration,
          mimeType: voiceMessage.mimeType || 'audio/webm',
          volumeLevels: voiceMessage.volumeLevels || []
        });
        
        // Create unique filename for voice message
        const timestamp = Date.now();
        const filename = `voice_${req.userId}_${timestamp}.webm`;
        const voiceDir = path.join(__dirname, '../../uploads/voices');
        
        // Ensure voices directory exists
        if (!fs.existsSync(voiceDir)) {
          fs.mkdirSync(voiceDir, { recursive: true });
        }
        
        const fullPath = path.join(voiceDir, filename);
        
        // Convert base64 to buffer and save
        const audioBuffer = Buffer.from(voiceMessage.data, 'base64');
        fs.writeFileSync(fullPath, audioBuffer);
        
        voiceFilePath = `/uploads/voices/${filename}`;
        voiceDuration = voiceMessage.duration || 0;
        
        console.log('Voice message saved:', {
          filePath: voiceFilePath,
          duration: voiceDuration,
          fileSize: audioBuffer.length
        });
      } catch (error) {
        console.error('Error saving voice message:', error);
        return res.status(500).json({
          message: "Error saving voice message: " + error.message,
        });
      }
    }

    let message = null;
    // Support image albums sent as one message (store URLs JSON in images field)
    if (Array.isArray(images) && images.length > 0) {
      message = await Message.create({
        content: (content || null),
        image: null,
        images: JSON.stringify(images),
        voiceMessage: voiceFilePath,
        voiceDuration: voiceDuration,
        userId: req.userId,
        chatType,
        chatId: chatIdInt,
        replyToMessageId: replyId,
      });
    } else {
      message = await Message.create({
        content: content || null,
        image: image || null,
        voiceMessage: voiceFilePath,
        voiceDuration: voiceDuration,
        userId: req.userId,
        chatType,
        chatId: chatIdInt,
        replyToMessageId: replyId,
      });
    }

    const user = await User.findByPk(req.userId);

    const messageWithUser = {
      id: message.id,
      content: message.content,
      image: message.image,
      images: message.images ? JSON.parse(message.images) : null,
      voiceMessage: message.voiceMessage ? {
        url: message.voiceMessage,
        duration: message.voiceDuration,
        mimeType: voiceMessage ? voiceMessage.mimeType : 'audio/webm',
        volumeLevels: voiceMessage ? voiceMessage.volumeLevels : [],
        data: voiceMessage ? voiceMessage.data : null // Include base64 data for real-time transmission
      } : null,
      chatType: message.chatType,
      chatId: message.chatId,
      replyToMessageId: message.replyToMessageId,
      timestamp: message.timestamp,
      isEdited: !!message.isEdited,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
    };

    if (chatType === "private") {
      const chatToUpdate = await PrivateChat.findOne({
        where: {
          id: chatIdInt,
          isActive: true,
        },
        include: [
          {
            model: User,
            as: "user1",
            attributes: ["id", "username", "firstName", "lastName", "avatar"],
          },
          {
            model: User,
            as: "user2",
            attributes: ["id", "username", "firstName", "lastName", "avatar"],
          },
        ],
      });

      if (chatToUpdate) {
        const existingMessagesCount = await Message.count({
          where: {
            chatType: "private",
            chatId: chatIdInt,
          },
        });

        const isFirstMessage = existingMessagesCount === 1;

        if (isFirstMessage) {
          const otherUserId =
            chatToUpdate.user1Id === req.userId
              ? chatToUpdate.user2Id
              : chatToUpdate.user1Id;
          const chatDataForOtherUser = {
            id: chatToUpdate.id,
            chatId: chatToUpdate.id,
            lastMessage: {
              id: message.id,
              content: message.content,
              timestamp: message.timestamp,
              userId: req.userId,
            },
            lastMessageAt: message.timestamp,
            user: {
              id: user.id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: user.avatar,
            },
          };

          const chatDataForSender = {
            ...chatDataForOtherUser,
            user:
              otherUserId === chatToUpdate.user1Id
                ? {
                    id: chatToUpdate.user1.id,
                    username: chatToUpdate.user1.username,
                    firstName: chatToUpdate.user1.firstName,
                    lastName: chatToUpdate.user1.lastName,
                    avatar: chatToUpdate.user1.avatar,
                  }
                : {
                    id: chatToUpdate.user2.id,
                    username: chatToUpdate.user2.username,
                    firstName: chatToUpdate.user2.firstName,
                    lastName: chatToUpdate.user2.lastName,
                    avatar: chatToUpdate.user2.avatar,
                  },
          };

          req.app.locals.wss.clients.forEach((client) => {
            if (client.readyState === 1 && client.userId) {
              const clientUserId = parseInt(client.userId);
              if (clientUserId === otherUserId) {
                try {
                  const privateChatCreatedEvent = {
                    type: "privateChatCreated",
                    data: {
                      chatData: chatDataForOtherUser,
                    },
                  };
                  client.send(JSON.stringify(privateChatCreatedEvent));
                } catch (wsError) {}
              }
              if (clientUserId === parseInt(req.userId)) {
                try {
                  const privateChatCreatedEvent = {
                    type: "privateChatCreated",
                    data: {
                      chatData: chatDataForSender,
                    },
                  };
                  client.send(JSON.stringify(privateChatCreatedEvent));
                } catch (wsError) {}
              }
            }
          });
        }
      }
    }

    let broadcastCount = 0;
    req.app.locals.wss.clients.forEach((client) => {
      if (client.readyState === 1 && client.userId) {
        const clientUserIdStr = String(client.userId);
        const senderUserIdStr = String(req.userId);
        if (clientUserIdStr !== senderUserIdStr) {
          try {
            const broadcastData = {
              type: "newMessage",
              data: {
                ...messageWithUser,
                isDelivered: true,
                deliveredAt: new Date(),
              },
            };
            client.send(JSON.stringify(broadcastData));
            broadcastCount++;
          } catch (wsError) {}
        }
      }
    });
    const unreadUpdateEvent = {
      type: "unreadCountUpdate",
      data: {
        chatType,
        chatId: chatIdInt,
        senderId: req.userId,
        timestamp: new Date(),
      },
    };
    req.app.locals.wss.clients.forEach((client) => {
      if (
        client.readyState === 1 &&
        client.userId &&
        String(client.userId) !== String(req.userId)
      ) {
        try {
          client.send(JSON.stringify(unreadUpdateEvent));
        } catch (wsError) {}
      }
    });
    res.status(201).json({
      message: "Message sent successfully!",
      data: messageWithUser,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while sending message.",
    });
  }
};
exports.getMessages = async (req, res) => {
  try {
    const { chatType } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    if (
      !chatType ||
      req.query.chatId === undefined ||
      req.query.chatId === null
    ) {
      return res.status(400).json({
        message: "chatType and chatId are required!",
      });
    }
    const chatIdInt = parseInt(req.query.chatId, 10);
    if (Number.isNaN(chatIdInt)) {
      return res.status(400).json({ message: "chatId must be a number" });
    }
    if (chatType === "group" || chatType === "channel") {
      const groupMember = await db.groupMembers.findOne({
        where: { groupId: chatIdInt, userId: req.userId },
      });
      if (!groupMember) {
        return res.status(403).json({
          message: chatType === 'channel' ? "You are not a member of this channel!" : "You are not a member of this group!",
        });
      }
    } else if (chatType === "private") {
      const privateChat = await PrivateChat.findOne({
        where: {
          id: chatIdInt,
          [db.Sequelize.Op.or]: [
            { user1Id: req.userId },
            { user2Id: req.userId },
          ],
          isActive: true,
        },
      });
      if (!privateChat) {
        return res.status(403).json({
          message:
            "You don't have access to this private chat or chat has been deleted!",
        });
      }
    }
    const messages = await Message.findAndCountAll({
      where: {
        chatType,
        chatId: chatIdInt,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "firstName", "lastName", "avatar"],
        },
        {
          model: MessageRead,
          as: "reads",
          include: [
            {
              model: User,
              as: "reader",
              attributes: ["id", "username"],
            },
          ],
        },
      ],
      order: [["timestamp", "DESC"]],
      limit: limit,
      offset: offset,
    });
    // Transform messages to include proper voice message structure
    const transformedMessages = messages.rows.reverse().map((msg) => ({
      id: msg.id,
      content: msg.content,
      image: msg.image,
    images: msg.images ? JSON.parse(msg.images) : null,
      voiceMessage: msg.voiceMessage
        ? {
            url: msg.voiceMessage,
            duration: msg.voiceDuration,
            mimeType: "audio/webm",
            volumeLevels: [], // Will be populated from stored data later
          }
        : null,
      chatType: msg.chatType,
      chatId: msg.chatId,
      replyToMessageId: msg.replyToMessageId,
      timestamp: msg.timestamp,
      isEdited: !!msg.isEdited,
      user: msg.user,
      reads: msg.reads
    }));

    res.status(200).json({
      messages: transformedMessages,
      total: messages.count,
      limit: limit,
      offset: offset,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while retrieving messages.",
    });
  }
};
exports.updateMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.id, 10);
    const { content } = req.body;
    if (Number.isNaN(messageId)) {
      return res.status(400).json({ message: "Message id must be a number" });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Content is required" });
    }
    const message = await Message.findOne({
      where: { id: messageId, userId: req.userId },
    });
    if (!message) {
      return res
        .status(404)
        .json({ message: "Message not found or not owned by user" });
    }
    await message.update({ content: content.trim(), isEdited: true });
    const user = await User.findByPk(req.userId);
    const messageWithUser = {
      id: message.id,
      content: message.content,
      chatType: message.chatType,
      chatId: message.chatId,
      replyToMessageId: message.replyToMessageId,
      timestamp: message.timestamp,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
      isEdited: true,
    };
    req.app.locals.wss.clients.forEach((client) => {
      const clientUserId = parseInt(client.userId);
      const senderUserId = parseInt(req.userId);
      if (
        client.readyState === 1 &&
        client.userId &&
        clientUserId !== senderUserId &&
        !isNaN(clientUserId) &&
        !isNaN(senderUserId)
      ) {
        try {
          const editEvent = {
            type: "messageEdit",
            messageId: message.id,
            content: message.content,
            chatId: message.chatId,
            chatType: message.chatType,
            timestamp: new Date().toISOString(),
            broadcastId: `edit_${message.id}_${Date.now()}`,
          };
          client.send(JSON.stringify(editEvent));
        } catch (wsError) {}
      }
    });

    res.status(200).json({
      message: "Message updated successfully!",
      data: messageWithUser,
    });
  } catch (err) {
    res
      .status(500)
      .json({
        message: err.message || "Some error occurred while updating message.",
      });
  }
};
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { chatType, chatId, messageIds } = req.body;
    if (
      !chatType ||
      !chatId ||
      !messageIds ||
      !Array.isArray(messageIds) ||
      messageIds.length === 0
    ) {
      return res.status(400).json({
        message: "chatType, chatId and messageIds array are required!",
      });
    }
    const chatIdInt = parseInt(chatId, 10);
    if (Number.isNaN(chatIdInt)) {
      return res.status(400).json({ message: "chatId must be a number" });
    }
    if (chatType === "group" || chatType === "channel") {
      const groupMember = await db.groupMembers.findOne({
        where: { groupId: chatIdInt, userId: req.userId },
      });
      if (!groupMember) {
        return res.status(403).json({
          message: chatType === 'channel' ? "You are not a member of this channel!" : "You are not a member of this group!",
        });
      }
    } else if (chatType === "private") {
      const privateChat = await PrivateChat.findOne({
        where: {
          id: chatIdInt,
          [db.Sequelize.Op.or]: [
            { user1Id: req.userId },
            { user2Id: req.userId },
          ],
        },
      });
      if (!privateChat) {
        return res.status(403).json({
          message: "You don't have access to this private chat!",
        });
      }
    }
    const messageIdInts = messageIds
      .map((id) => parseInt(id, 10))
      .filter((id) => !Number.isNaN(id));
    if (messageIdInts.length === 0) {
      return res.status(400).json({ message: "No valid message IDs provided" });
    }
    const validMessages = await Message.findAll({
      where: {
        id: { [db.Sequelize.Op.in]: messageIdInts },
        chatType,
        chatId: chatIdInt,
      },
    });
    const validMessageIds = validMessages.map((m) => m.id);
    if (validMessageIds.length === 0) {
      return res.status(404).json({ message: "No valid messages found" });
    }
    const readReceipts = [];
    const now = new Date();
    for (const messageId of validMessageIds) {
      const [receipt, created] = await MessageRead.findOrCreate({
        where: {
          messageId,
          userId: req.userId,
        },
        defaults: {
          readAt: now,
        },
      });
      if (!created) {
        await receipt.update({ readAt: now });
      }
      readReceipts.push({
        messageId,
        userId: req.userId,
        readAt: receipt.readAt,
      });
    }
    const messages = await Message.findAll({
      where: { id: { [db.Sequelize.Op.in]: validMessageIds } },
      attributes: ["id", "userId", "chatId", "chatType"],
    });
    const messageSenders = [...new Set(messages.map((m) => m.userId))].filter(
      (id) => id !== req.userId
    );
    const currentUser = await User.findByPk(req.userId, {
      attributes: ["id", "username"],
    });
    const readStatusData = {
      type: "messageReadReceipt",
      data: {
        messageIds: validMessageIds,
        chatType,
        chatId: chatIdInt,
        reader: {
          id: currentUser.id,
          username: currentUser.username,
        },
        timestamp: now,
        readStatus: "read",
        icon: "double-check",
      },
    };
    let broadcastCount = 0;
    req.app.locals.wss.clients.forEach((client) => {
      if (
        client.readyState === 1 &&
        client.userId &&
        messageSenders.includes(parseInt(client.userId))
      ) {
        try {
          client.send(JSON.stringify(readStatusData));
          broadcastCount++;
        } catch (wsError) {}
      }
    });
    res.status(200).json({
      message: "Messages marked as read successfully",
      data: {
        readReceipts,
        messageIds: validMessageIds,
      },
    });
  } catch (err) {
    res.status(500).json({
      message:
        err.message || "Some error occurred while marking messages as read.",
    });
  }
};
exports.getUnreadCount = async (req, res) => {
  try {
    const { chatType, chatId } = req.query;
    if (!chatType || !chatId) {
      return res.status(400).json({
        message: "chatType and chatId are required!",
      });
    }
    const chatIdInt = parseInt(chatId, 10);
    if (Number.isNaN(chatIdInt)) {
      return res.status(400).json({ message: "chatId must be a number" });
    }
    if (chatType === "group") {
      const groupMember = await db.groupMembers.findOne({
        where: { groupId: chatIdInt, userId: req.userId },
      });
      if (!groupMember) {
        return res.status(403).json({
          message: "You are not a member of this group!",
        });
      }
    } else if (chatType === "private") {
      const privateChat = await PrivateChat.findOne({
        where: {
          id: chatIdInt,
          [db.Sequelize.Op.or]: [
            { user1Id: req.userId },
            { user2Id: req.userId },
          ],
          isActive: true,
        },
      });
      if (!privateChat) {
        return res.status(403).json({
          message: "You don't have access to this private chat!",
        });
      }
    }
    const unreadCount = await Message.count({
      where: {
        chatType,
        chatId: chatIdInt,
        userId: { [db.Sequelize.Op.ne]: req.userId },
      },
      include: [
        {
          model: MessageRead,
          as: "reads",
          required: false,
          where: { userId: req.userId },
        },
      ],
      having: db.Sequelize.literal("COUNT(reads.id) = 0"),
    });

    res.status(200).json({
      unreadCount,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while getting unread count.",
    });
  }
};
exports.getAllUnreadCounts = async (req, res) => {
  try {
    const userId = req.userId;
    const unreadCounts = {};
    const privateChats = await PrivateChat.findAll({
      where: {
        [db.Sequelize.Op.or]: [{ user1Id: userId }, { user2Id: userId }],
        isActive: true,
      },
      attributes: ["id"],
    });
    for (const chat of privateChats) {
      const unreadCount = await Message.count({
        where: {
          chatType: "private",
          chatId: chat.id,
          userId: { [db.Sequelize.Op.ne]: userId },
        },
        include: [
          {
            model: MessageRead,
            as: "reads",
            required: false,
            where: { userId: userId },
          },
        ],
        having: db.Sequelize.literal("COUNT(reads.id) = 0"),
      });
      if (unreadCount > 0) {
        unreadCounts[`private_${chat.id}`] = unreadCount;
      }
    }
    const groupMemberships = await db.groupMembers.findAll({
      where: { userId: userId },
      include: [
        {
          model: Group,
          as: "group",
          attributes: ["id", "type"],
        },
      ],
    });
    for (const membership of groupMemberships) {
      const groupId = membership.group.id;
      const groupType = membership.group.type;
      const unreadCount = await Message.count({
        where: {
          chatType: "group",
          chatId: groupId,
          userId: { [db.Sequelize.Op.ne]: userId },
        },
        include: [
          {
            model: MessageRead,
            as: "reads",
            required: false,
            where: { userId: userId },
          },
        ],
        having: db.Sequelize.literal("COUNT(reads.id) = 0"),
      });
      if (unreadCount > 0) {
        const key =
          groupType === "channel" ? `channel_${groupId}` : `group_${groupId}`;
        unreadCounts[key] = unreadCount;
      }
    }
    res.status(200).json({
      unreadCounts,
    });
  } catch (err) {
    res.status(500).json({
      message:
        err.message || "Some error occurred while getting unread counts.",
    });
  }
};
exports.markChatAsRead = async (req, res) => {
  try {
    const { chatType, chatId } = req.body;
    if (!chatType || !chatId) {
      return res.status(400).json({
        message: "chatType and chatId are required!",
      });
    }
    const chatIdInt = parseInt(chatId, 10);
    if (Number.isNaN(chatIdInt)) {
      return res.status(400).json({ message: "chatId must be a number" });
    }
    if (chatType === "group") {
      const groupMember = await db.groupMembers.findOne({
        where: { groupId: chatIdInt, userId: req.userId },
      });
      if (!groupMember) {
        return res.status(403).json({
          message: "You are not a member of this group!",
        });
      }
    } else if (chatType === "private") {
      const privateChat = await PrivateChat.findOne({
        where: {
          id: chatIdInt,
          [db.Sequelize.Op.or]: [
            { user1Id: req.userId },
            { user2Id: req.userId },
          ],
        },
      });
      if (!privateChat) {
        return res.status(403).json({
          message: "You don't have access to this private chat!",
        });
      }
    }
    const unreadMessages = await Message.findAll({
      where: {
        chatType,
        chatId: chatIdInt,
        userId: { [db.Sequelize.Op.ne]: req.userId },
      },
      attributes: ["id", "userId"],
      include: [
        {
          model: MessageRead,
          as: "reads",
          required: false,
          where: { userId: req.userId },
        },
      ],
    });
    const messagesToMark = unreadMessages
      .filter((msg) => !msg.reads || msg.reads.length === 0)
      .map((msg) => msg.id);
    if (messagesToMark.length === 0) {
      return res.status(200).json({
        message: "No new messages to mark as read",
        data: { messageIds: [] },
      });
    }
    const now = new Date();
    const readBulkData = messagesToMark.map((messageId) => ({
      messageId,
      userId: req.userId,
      readAt: now,
    }));
    await MessageRead.bulkCreate(readBulkData, {
      updateOnDuplicate: ["readAt"],
    });
    const messageSenders = [
      ...new Set(
        unreadMessages
          .filter((msg) => messagesToMark.includes(msg.id))
          .map((msg) => msg.userId)
      ),
    ];
    const currentUser = await User.findByPk(req.userId, {
      attributes: ["id", "username"],
    });
    const readStatusData = {
      type: "messageReadReceipt",
      data: {
        messageIds: messagesToMark,
        chatType,
        chatId: chatIdInt,
        reader: {
          id: currentUser.id,
          username: currentUser.username,
        },
        timestamp: now,
        isChatRead: true, // Indicates this was a bulk "mark chat as read" operation
        readStatus: "read",
        icon: "double-check",
      },
    };
    let broadcastCount = 0;
    req.app.locals.wss.clients.forEach((client) => {
      if (
        client.readyState === 1 &&
        client.userId &&
        messageSenders.includes(parseInt(client.userId))
      ) {
        try {
          const readNotification = {
            type: "messageReadReceipt",
            data: {
              messageIds: messagesToMark,
              chatType,
              chatId: chatIdInt,
              reader: {
                id: currentUser.id,
                username: currentUser.username,
              },
              timestamp: now,
              readStatus: "read",
              icon: "double-check",
            },
          };
          client.send(JSON.stringify(readNotification));
          broadcastCount++;
        } catch (wsError) {}
      }
    });

    res.status(200).json({
      message: "Chat marked as read successfully",
      data: {
        messageIds: messagesToMark,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while marking chat as read.",
    });
  }
};
exports.deleteMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.id, 10);
    if (Number.isNaN(messageId)) {
      return res.status(400).json({ message: "Message id must be a number" });
    }
    const message = await Message.findOne({
      where: { id: messageId, userId: req.userId },
    });
    if (!message) {
      return res
        .status(404)
        .json({ message: "Message not found or not owned by user" });
    }
    const deletedMessageInfo = {
      id: message.id,
      chatType: message.chatType,
      chatId: message.chatId,
    };
    await message.destroy();
    req.app.locals.wss.clients.forEach((client) => {
      const clientUserId = parseInt(client.userId);
      const senderUserId = parseInt(req.userId);
      if (
        client.readyState === 1 &&
        client.userId &&
        clientUserId !== senderUserId &&
        !isNaN(clientUserId) &&
        !isNaN(senderUserId)
      ) {
        try {
          const deleteEvent = {
            type: "messageDelete",
            messageId: deletedMessageInfo.id,
            chatId: deletedMessageInfo.chatId,
            chatType: deletedMessageInfo.chatType,
            timestamp: new Date().toISOString(),
            broadcastId: `delete_${deletedMessageInfo.id}_${Date.now()}`,
          };
          client.send(JSON.stringify(deleteEvent));
        } catch (wsError) {}
      }
    });

    res
      .status(200)
      .json({ message: "Message deleted successfully!", id: messageId });
  } catch (err) {
    res
      .status(500)
      .json({
        message: err.message || "Some error occurred while deleting message.",
      });
  }
};
exports.clearChatHistory = async (req, res) => {
  try {
    const { chatType, chatId } = req.body;
    if (!chatType || !chatId) {
      return res.status(400).json({
        message: "chatType and chatId are required!",
      });
    }
    const chatIdInt = parseInt(chatId, 10);
    if (Number.isNaN(chatIdInt)) {
      return res.status(400).json({ message: "chatId must be a number" });
    }
    if (chatType === "group") {
      const groupMember = await db.groupMembers.findOne({
        where: { groupId: chatIdInt, userId: req.userId },
      });
      if (!groupMember) {
        return res.status(403).json({
          message: "You are not a member of this group!",
        });
      }
    } else if (chatType === "private") {
      const privateChat = await PrivateChat.findOne({
        where: {
          id: chatIdInt,
          [db.Sequelize.Op.or]: [
            { user1Id: req.userId },
            { user2Id: req.userId },
          ],
        },
      });
      if (!privateChat) {
        return res.status(403).json({
          message: "You don't have access to this private chat!",
        });
      }
    }
    const messagesToDelete = await Message.findAll({
      where: {
        chatType,
        chatId: chatIdInt,
      },
      attributes: ["id"],
    });
    const messageIds = messagesToDelete.map((msg) => msg.id);
    if (messageIds.length > 0) {
      await MessageRead.destroy({
        where: {
          messageId: {
            [db.Sequelize.Op.in]: messageIds,
          },
        },
      });
    }
    if (chatType === "private") {
      await PrivateChat.update(
        { lastMessageId: null, lastMessageAt: null },
        { where: { id: chatIdInt } }
      );
    }
    const deletedCount = await Message.destroy({
      where: {
        chatType,
        chatId: chatIdInt,
      },
    });
    const clearEvent = {
      type: "chatHistoryCleared",
      data: {
        chatType,
        chatId: chatIdInt,
        clearedBy: req.userId,
        timestamp: new Date().toISOString(),
      },
    };
    req.app.locals.wss.clients.forEach((client) => {
      if (client.readyState === 1 && client.userId) {
        try {
          client.send(JSON.stringify(clearEvent));
        } catch (wsError) {}
      }
    });
    res.status(200).json({
      message: "Chat history cleared successfully!",
      data: {
        deletedCount,
        chatType,
        chatId: chatIdInt,
      },
    });
  } catch (err) {
    res.status(500).json({
      message:
        err.message || "Some error occurred while clearing chat history.",
    });
  }
};
exports.deleteChat = async (req, res) => {
  try {
    const { chatType, chatId } = req.body;
    if (!chatType || !chatId) {
      return res.status(400).json({
        message: "chatType and chatId are required!",
      });
    }
    const chatIdInt = parseInt(chatId, 10);
    if (Number.isNaN(chatIdInt)) {
      return res.status(400).json({ message: "chatId must be a number" });
    }
    if (chatType === "private") {
      const privateChat = await PrivateChat.findOne({
        where: {
          id: chatIdInt,
          [db.Sequelize.Op.or]: [
            { user1Id: req.userId },
            { user2Id: req.userId },
          ],
        },
      });
      if (!privateChat) {
        return res.status(403).json({
          message: "You don't have access to this private chat!",
        });
      }
      const messagesToDelete = await Message.findAll({
        where: {
          chatType: "private",
          chatId: chatIdInt,
        },
        attributes: ["id"],
      });
      const messageIds = messagesToDelete.map((msg) => msg.id);
      if (messageIds.length > 0) {
        await MessageRead.destroy({
          where: {
            messageId: {
              [db.Sequelize.Op.in]: messageIds,
            },
          },
        });
      }
      await privateChat.update({
        lastMessageId: null,
        lastMessageAt: null,
      });
      await Message.destroy({
        where: {
          chatType: "private",
          chatId: chatIdInt,
        },
      });
      await privateChat.update({ isActive: false });
      const deleteEvent = {
        type: "chatDeleted",
        data: {
          chatType: "private",
          chatId: chatIdInt,
          deletedBy: req.userId,
          timestamp: new Date().toISOString(),
        },
      };
      req.app.locals.wss.clients.forEach((client) => {
        if (client.readyState === 1 && client.userId) {
          try {
            client.send(JSON.stringify(deleteEvent));
          } catch (wsError) {}
        }
      });
    } else if (chatType === "group") {
      const groupMember = await db.groupMembers.findOne({
        where: { groupId: chatIdInt, userId: req.userId },
      });
      if (!groupMember) {
        return res.status(403).json({
          message: "You are not a member of this group!",
        });
      }
      await groupMember.destroy();
      const deleteEvent = {
        type: "chatDeleted",
        data: {
          chatType: "group",
          chatId: chatIdInt,
          deletedBy: req.userId,
          timestamp: new Date().toISOString(),
        },
      };
      req.app.locals.wss.clients.forEach((client) => {
        if (
          client.readyState === 1 &&
          client.userId &&
          parseInt(client.userId) === parseInt(req.userId)
        ) {
          try {
            client.send(JSON.stringify(deleteEvent));
          } catch (wsError) {}
        }
      });
    } else if (chatType === "channel") {
      const channelMember = await GroupMember.findOne({
        where: { groupId: chatIdInt, userId: req.userId },
      });
      if (!channelMember) {
        return res.status(403).json({
          message: "You are not a member of this channel!",
        });
      }
      await channelMember.destroy();
      const deleteEvent = {
        type: "chatDeleted",
        data: {
          chatType: "channel",
          chatId: chatIdInt,
          deletedBy: req.userId,
          timestamp: new Date().toISOString(),
        },
      };
      req.app.locals.wss.clients.forEach((client) => {
        if (
          client.readyState === 1 &&
          client.userId &&
          parseInt(client.userId) === parseInt(req.userId)
        ) {
          try {
            client.send(JSON.stringify(deleteEvent));
          } catch (wsError) {}
        }
      });
    }
    res.status(200).json({
      message: "Chat deleted successfully!",
      data: {
        chatType,
        chatId: chatIdInt,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while deleting chat.",
    });
  }
};
