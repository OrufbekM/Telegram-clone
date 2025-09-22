const db = require("../models");
const User = db.users;
const PrivateChat = db.privateChats;
const Message = db.messages;
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) {
      return res.status(400).json({
        message: "Search query must be at least 2 characters long!"
      });
    }
    const users = await User.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { username: { [db.Sequelize.Op.iLike]: `%${query}%` } },
          { firstName: { [db.Sequelize.Op.iLike]: `%${query}%` } },
          { lastName: { [db.Sequelize.Op.iLike]: `%${query}%` } }
        ],
        id: { [db.Sequelize.Op.ne]: req.userId },
        isActive: true
      },
      attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'isOnline', 'lastSeen'],
      limit: 20
    });
    res.status(200).json({
      users: users
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while searching users."
    });
  }
};
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'bio', 'isOnline', 'lastSeen', 'isActive']
    });
    if (!user) {
      return res.status(404).json({
        message: "User not found!"
      });
    }
    res.status(200).json({
      user: user
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while retrieving user profile."
    });
  }
};
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, bio, phone } = req.body;
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found!"
      });
    }
    await user.update({
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      bio: bio || user.bio,
      phone: phone || user.phone
    });
    res.status(200).json({
      message: "Profile updated successfully!",
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        phone: user.phone,
        avatar: user.avatar
      }
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while updating profile."
    });
  }
};
exports.updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) {
      return res.status(400).json({
        message: "Avatar URL is required!"
      });
    }
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found!"
      });
    }
    await user.update({ avatar });
    res.status(200).json({
      message: "Avatar updated successfully!",
      avatar: user.avatar
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while updating avatar."
    });
  }
};
exports.startPrivateChat = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({
        message: "Target user ID is required!"
      });
    }
    const targetUserIdInt = parseInt(targetUserId, 10);
    if (Number.isNaN(targetUserIdInt)) {
      return res.status(400).json({
        message: "Target user ID must be a valid number!"
      });
    }
    if (targetUserIdInt === req.userId) {
      return res.status(400).json({
        message: "Cannot start chat with yourself!"
      });
    }
    const targetUser = await User.findByPk(targetUserIdInt);
    if (!targetUser) {
      return res.status(404).json({
        message: "Target user not found!"
      });
    }
    let chat = await PrivateChat.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { user1Id: req.userId, user2Id: targetUserIdInt },
          { user1Id: targetUserIdInt, user2Id: req.userId }
        ],
        isActive: true
      }
    });
    
    if (!chat) {
      chat = await PrivateChat.create({
        user1Id: req.userId,
        user2Id: targetUserIdInt,
        isActive: true
      });
    }
    
    res.status(200).json({
      message: "Private chat started!",
      chatId: chat.id
    });
  } catch (err) {
    console.error('Error in startPrivateChat:', err);
    res.status(500).json({
      message: err.message || "Some error occurred while starting private chat."
    });
  }
};
exports.getPrivateChats = async (req, res) => {
  try {
    console.log(`рџ”Ќ Fetching private chats for user ${req.userId}`);
    const chats = await PrivateChat.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { user1Id: req.userId },
          { user2Id: req.userId }
        ],
        isActive: true
      },
      include: [
        {
          model: User,
          as: 'user1',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'isOnline']
        },
        {
          model: User,
          as: 'user2',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'isOnline']
        },
        {
          model: Message,
          as: 'lastMessage',
          required: false,
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'firstName', 'lastName']
          }]
        }
      ],
      order: [['lastMessageAt', 'DESC NULLS LAST']]
    });
    console.log(`рџ“Ѓ Found ${chats.length} active private chats in database`);
    const formattedChats = chats.map((chat, index) => {
      const otherUser = chat.user1.id === req.userId ? chat.user2 : chat.user1;
      const formatted = {
        chatId: chat.id,
        id: chat.id, // Also include as 'id' for consistency
        otherUser: otherUser,
        lastMessageAt: chat.lastMessageAt,
        lastMessage: chat.lastMessage ? {
          id: chat.lastMessage.id,
          content: chat.lastMessage.content,
          timestamp: chat.lastMessage.timestamp,
          userId: chat.lastMessage.userId,
          user: chat.lastMessage.user
        } : null,
        isActive: chat.isActive
      };
      console.log(`  рџ’¬ [${index + 1}] Chat ${chat.id}: user1=${chat.user1Id}, user2=${chat.user2Id}, otherUser=${otherUser.username}, lastMessageId=${chat.lastMessageId}`);
      if (chat.lastMessage) {
        console.log(`       LastMessage (via association): "${chat.lastMessage.content}" by user ${chat.lastMessage.userId} at ${chat.lastMessage.timestamp}`);
      } else if (chat.lastMessageId) {
        console.log(`       LastMessage: ID ${chat.lastMessageId} but association failed to load`);
      } else {
        console.log(`       LastMessage: null (no messages yet)`);
      }
      return formatted;
    });
    console.log(`рџ“‹ Returning ${formattedChats.length} formatted private chats for user ${req.userId}`);
    res.status(200).json({
      chats: formattedChats,
      privateChats: formattedChats
    });
  } catch (err) {
    console.error('Error in getPrivateChats:', err);
    res.status(500).json({
      message: err.message || "Some error occurred while retrieving private chats."
    });
  }
};
exports.updateOnlineStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found!"
      });
    }
    const updateData = {
      isOnline: isOnline !== undefined ? isOnline : false,
      lastSeen: new Date()
    };
    await user.update(updateData);
    res.status(200).json({
      message: "Online status updated successfully!",
      isOnline: user.isOnline,
      lastSeen: user.lastSeen
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while updating online status."
    });
  }
};
exports.getUsersOnlineStatus = async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        message: "User IDs array is required!"
      });
    }
    const users = await User.findAll({
      where: {
        id: userIds,
        isActive: true
      },
      attributes: ['id', 'username', 'isOnline', 'lastSeen']
    });
    const statusMap = {};
    users.forEach(user => {
      statusMap[user.id] = {
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      };
    });
    res.status(200).json({
      statusMap
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while retrieving online status."
    });
  }
};
exports.setUserOffline = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({
        isOnline: false,
        lastSeen: new Date()
      });
    }
  } catch (err) {
    console.error('Error setting user offline:', err);
  }
};
exports.setUserOnline = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({
        isOnline: true,
        lastSeen: new Date()
      });
      console.log(`вњ… User ${userId} set ONLINE in database`);
    }
  } catch (err) {
    console.error('Error setting user online:', err);
  }
};
exports.setEnhancedUserOnline = async (userId, location, sessionId) => {
  try {
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({
        isOnline: true,
        lastSeen: new Date()
      });
      console.log(`вњ… Enhanced: User ${userId} set ONLINE from ${location} (session: ${sessionId})`);
    }
  } catch (err) {
    console.error('Error setting enhanced user online:', err);
  }
};
exports.setEnhancedUserOffline = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({
        isOnline: false,
        lastSeen: new Date()
      });
      console.log(`вќЊ Enhanced: User ${userId} set OFFLINE in database`);
    }
  } catch (err) {
    console.error('Error setting enhanced user offline:', err);
  }
};
exports.getUserById = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'isOnline', 'lastSeen']
    });
    return user;
  } catch (err) {
    console.error('Error getting user by ID:', err);
    return null;
  }
};
exports.checkOnlineVisibility = async (viewerId, targetUserId) => {
  try {
    const targetUser = await User.findByPk(targetUserId, {
      attributes: ['id', 'isOnline', 'lastSeen']
    });
    if (!targetUser) {
      return { canSee: false, isOnline: false, lastSeen: null };
    }
    return {
      canSee: true,
      isOnline: targetUser.isOnline,
      lastSeen: targetUser.lastSeen,
      location: 'web'
    };
  } catch (err) {
    console.error('Error checking online visibility:', err);
    return { canSee: false, isOnline: false, lastSeen: null };
  }
};
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }
    await user.update({ isActive: false });
    res.status(200).json({
      message: "User account deleted successfully!",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while deleting user.",
    });
  }
};
exports.setSelectiveOnlineStatus = async (req, res) => {
  try {
    const { location, sessionId, isOnline, visibilitySettings } = req.body;
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found!"
      });
    }
    const updateData = {
      isOnline: isOnline !== undefined ? isOnline : false,
      lastSeen: new Date(),
      currentLocation: location || null,
      currentSessionId: sessionId || null
    };
    if (visibilitySettings) {
      if (visibilitySettings.onlineVisibility) {
        updateData.onlineVisibility = visibilitySettings.onlineVisibility;
      }
      if (visibilitySettings.allowedLocations) {
        updateData.allowedLocations = visibilitySettings.allowedLocations;
      }
      if (visibilitySettings.hiddenFromUsers) {
        updateData.hiddenFromUsers = visibilitySettings.hiddenFromUsers;
      }
      if (visibilitySettings.visibleToUsers) {
        updateData.visibleToUsers = visibilitySettings.visibleToUsers;
      }
      if (visibilitySettings.showOnlineStatus !== undefined) {
        updateData.showOnlineStatus = visibilitySettings.showOnlineStatus;
      }
    }
    await user.update(updateData);
    res.status(200).json({
      message: "Selective online status updated successfully!",
      status: {
        isOnline: user.isOnline,
        location: user.currentLocation,
        sessionId: user.currentSessionId,
        visibility: user.onlineVisibility
      }
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while updating selective online status."
    });
  }
};
exports.checkOnlineVisibility = async (viewerUserId, targetUserId) => {
  try {
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser || !targetUser.isOnline || !targetUser.showOnlineStatus) {
      return {
        canSee: false,
        isOnline: false,
        lastSeen: targetUser ? targetUser.lastSeen : null
      };
    }
    switch (targetUser.onlineVisibility) {
      case 'nobody':
        return {
          canSee: false,
          isOnline: false,
          lastSeen: targetUser.lastSeen
        };
      case 'custom':
        const canSeeCustom = targetUser.visibleToUsers && 
                             targetUser.visibleToUsers.includes(parseInt(viewerUserId));
        return {
          canSee: canSeeCustom,
          isOnline: canSeeCustom ? targetUser.isOnline : false,
          lastSeen: targetUser.lastSeen,
          location: canSeeCustom ? targetUser.currentLocation : null
        };
      case 'contacts':
        const isHidden = targetUser.hiddenFromUsers && 
                        targetUser.hiddenFromUsers.includes(parseInt(viewerUserId));
        return {
          canSee: !isHidden,
          isOnline: !isHidden ? targetUser.isOnline : false,
          lastSeen: targetUser.lastSeen,
          location: !isHidden ? targetUser.currentLocation : null
        };
      case 'everyone':
      default:
        const isHiddenFromEveryone = targetUser.hiddenFromUsers && 
                                    targetUser.hiddenFromUsers.includes(parseInt(viewerUserId));
        return {
          canSee: !isHiddenFromEveryone,
          isOnline: !isHiddenFromEveryone ? targetUser.isOnline : false,
          lastSeen: targetUser.lastSeen,
          location: !isHiddenFromEveryone ? targetUser.currentLocation : null
        };
    }
  } catch (err) {
    console.error('Error checking online visibility:', err);
    return {
      canSee: false,
      isOnline: false,
      lastSeen: null
    };
  }
};
exports.getEnhancedUsersOnlineStatus = async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        message: "User IDs array is required!"
      });
    }
    const statusMap = {};
    for (const userId of userIds) {
      const visibility = await exports.checkOnlineVisibility(req.userId, userId);
      statusMap[userId] = visibility;
    }
    res.status(200).json({
      statusMap
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while retrieving enhanced online status."
    });
  }
};
exports.updateOnlinePrivacySettings = async (req, res) => {
  try {
    const { 
      onlineVisibility, 
      showOnlineStatus, 
      allowedLocations, 
      hiddenFromUsers, 
      visibleToUsers 
    } = req.body;
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found!"
      });
    }
    const updateData = {};
    if (onlineVisibility !== undefined) updateData.onlineVisibility = onlineVisibility;
    if (showOnlineStatus !== undefined) updateData.showOnlineStatus = showOnlineStatus;
    if (allowedLocations !== undefined) updateData.allowedLocations = allowedLocations;
    if (hiddenFromUsers !== undefined) updateData.hiddenFromUsers = hiddenFromUsers;
    if (visibleToUsers !== undefined) updateData.visibleToUsers = visibleToUsers;
    await user.update(updateData);
    res.status(200).json({
      message: "Privacy settings updated successfully!",
      settings: {
        onlineVisibility: user.onlineVisibility,
        showOnlineStatus: user.showOnlineStatus,
        allowedLocations: user.allowedLocations,
        hiddenFromUsers: user.hiddenFromUsers,
        visibleToUsers: user.visibleToUsers
      }
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while updating privacy settings."
    });
  }
};
exports.setEnhancedUserOnline = async (userId, location = null, sessionId = null) => {
  try {
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({
        isOnline: true,
        lastSeen: new Date(),
        currentLocation: location,
        currentSessionId: sessionId
      });
    }
    return user;
  } catch (err) {
    console.error('Error setting enhanced user online:', err);
    return null;
  }
};
exports.setEnhancedUserOffline = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({
        isOnline: false,
        lastSeen: new Date(),
        currentLocation: null,
        currentSessionId: null
      });
    }
    return user;
  } catch (err) {
    console.error('Error setting enhanced user offline:', err);
    return null;
  }
};
exports.getUserById = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
    });
    return user;
  } catch (err) {
    console.error('Error getting user by ID:', err);
    return null;
  }
};

