const db = require("../models");
const Group = db.groups;
const GroupMember = db.groupMembers;
const User = db.users;
const Message = db.messages;
const MessageRead = db.messageReads;

// Create channel (stored in groups table with type='channel')
exports.createChannel = async (req, res) => {
  try {
    const { name, description, isPrivate, avatar } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Channel name is required!" });
    }
    const channel = await Group.create({
      name,
      description,
      avatar,
      type: "channel",
      isPrivate: !!isPrivate,
      creatorId: req.userId,
    });
    await GroupMember.create({ groupId: channel.id, userId: req.userId, role: "creator" });
    await channel.update({ memberCount: 1 });
    
    // Broadcast channel creation to all connected users
    if (req.app.locals.wss) {
      const channelData = {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        avatar: channel.avatar,
        type: channel.type,
        isPrivate: channel.isPrivate,
        creatorId: channel.creatorId,
        memberCount: channel.memberCount,
      };
      
      req.app.locals.wss.clients.forEach((client) => {
        if (client.readyState === 1 && client.userId) {
          try {
            client.send(JSON.stringify({
              type: 'channelCreated',
              data: channelData
            }));
          } catch (wsError) {
            console.error('WebSocket channel creation broadcast error:', wsError);
          }
        }
      });
    }
    
    res.status(201).json({
      message: "Channel created successfully!",
      channel: {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        avatar: channel.avatar,
        type: channel.type,
        isPrivate: channel.isPrivate,
        creatorId: channel.creatorId,
        memberCount: channel.memberCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Error creating channel." });
  }
};

// List channels for current user
exports.getUserChannels = async (req, res) => {
  try {
    const channels = await Group.findAll({
      include: [
        {
          model: User,
          as: "members",
          through: { attributes: ["role", "joinedAt"] },
          attributes: ["id", "username", "firstName", "lastName", "avatar", "isOnline"],
        },
      ],
      where: { type: "channel", "$members.id$": req.userId },
    });
    const withOnline = channels.map((ch) => ({
      ...ch.toJSON(),
      onlineMembersCount: ch.members ? ch.members.filter((m) => m.isOnline).length : 0,
    }));
    res.status(200).json({ channels: withOnline });
  } catch (err) {
    res.status(500).json({ message: err.message || "Error getting channels." });
  }
};

// Join channel (no approval for public)
exports.joinChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Group.findByPk(channelId);
    if (!channel || channel.type !== "channel") {
      return res.status(404).json({ message: "Channel not found!" });
    }
    const existing = await GroupMember.findOne({ where: { groupId: channelId, userId: req.userId } });
    if (existing) {
      return res.status(400).json({ message: "Already a member." });
    }
    if (channel.isPrivate) {
      return res.status(403).json({ message: "Private channel invites not implemented." });
    }
    await GroupMember.create({ groupId: channelId, userId: req.userId, role: "member" });
    await channel.update({ memberCount: channel.memberCount + 1 });
    
    // Broadcast channel join to channel members
    if (req.app.locals.wss) {
      const channelData = {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        avatar: channel.avatar,
        type: channel.type,
        isPrivate: channel.isPrivate,
        memberCount: channel.memberCount,
      };
      
      const members = await GroupMember.findAll({
        where: { groupId: channelId, isActive: true },
        attributes: ['userId']
      });
      const memberIds = members.map(member => member.userId);
      
      req.app.locals.wss.clients.forEach((client) => {
        if (client.readyState === 1 && 
            client.userId && 
            memberIds.includes(parseInt(client.userId))) {
          try {
            client.send(JSON.stringify({
              type: 'channelJoined',
              data: {
                channelId: channel.id,
                userId: req.userId,
                channel: channelData
              }
            }));
          } catch (wsError) {
            console.error('WebSocket channel join broadcast error:', wsError);
          }
        }
      });
    }
    
    res.status(200).json({ message: "Joined channel!" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Error joining channel." });
  }
};

// Leave channel
exports.leaveChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const member = await GroupMember.findOne({ where: { groupId: channelId, userId: req.userId } });
    if (!member) {
      return res.status(404).json({ message: "You are not a member of this channel!" });
    }
    await member.destroy();
    const channel = await Group.findByPk(channelId);
    if (channel) await channel.update({ memberCount: Math.max(0, channel.memberCount - 1) });
    
    // Broadcast channel leave to channel members
    if (req.app.locals.wss) {
      const members = await GroupMember.findAll({
        where: { groupId: channelId, isActive: true },
        attributes: ['userId']
      });
      const memberIds = members.map(member => member.userId);
      
      req.app.locals.wss.clients.forEach((client) => {
        if (client.readyState === 1 && 
            client.userId && 
            memberIds.includes(parseInt(client.userId))) {
          try {
            client.send(JSON.stringify({
              type: 'channelLeft',
              data: {
                channelId: channelId,
                userId: req.userId
              }
            }));
          } catch (wsError) {
            console.error('WebSocket channel leave broadcast error:', wsError);
          }
        }
      });
    }
    
    res.status(200).json({ message: "Left channel." });
  } catch (err) {
    res.status(500).json({ message: err.message || "Error leaving channel." });
  }
};

// Delete channel (only creator)
exports.deleteChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const member = await GroupMember.findOne({ 
      where: { groupId: channelId, userId: req.userId } 
    });
    
    if (!member || member.role !== 'creator') {
      return res.status(403).json({
        message: "Only channel creator can delete the channel!"
      });
    }
    
    const channel = await Group.findByPk(channelId);
    if (!channel || channel.type !== 'channel') {
      return res.status(404).json({ message: "Channel not found!" });
    }
    
    // Delete all channel messages and related data
    const channelMessages = await Message.findAll({
      where: { chatType: 'channel', chatId: channelId },
      attributes: ['id']
    });
    const messageIds = channelMessages.map(msg => msg.id);
    if (messageIds.length > 0) {
      await MessageRead.destroy({ where: { messageId: messageIds } });
    }
    await Message.destroy({ where: { chatType: 'channel', chatId: channelId } });
    await GroupMember.destroy({ where: { groupId: channelId } });
    await channel.destroy();
    
    // Broadcast channel deletion to all members
    if (req.app.locals.wss) {
      const members = await GroupMember.findAll({
        where: { groupId: channelId, isActive: true },
        attributes: ['userId']
      });
      const memberIds = members.map(member => member.userId);
      
      req.app.locals.wss.clients.forEach((client) => {
        if (client.readyState === 1 && 
            client.userId && 
            memberIds.includes(parseInt(client.userId))) {
          try {
            client.send(JSON.stringify({
              type: 'channelDeleted',
              data: {
                channelId: channelId,
                deletedBy: req.userId
              }
            }));
            
            // Also send chatDeleted event for UI consistency
            client.send(JSON.stringify({
              type: 'chatDeleted',
              data: {
                chatType: 'channel',
                chatId: channelId,
                deletedBy: req.userId,
                timestamp: new Date().toISOString()
              }
            }));
          } catch (wsError) {
            console.error('WebSocket channel deletion broadcast error:', wsError);
          }
        }
      });
    }
    
    res.status(200).json({
      message: "Channel deleted successfully!",
      channelDeleted: true
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while deleting channel."
    });
  }
};

// Channel status for current user
exports.getChannelStatus = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Group.findByPk(channelId, {
      include: [{ model: User, as: "creator", attributes: ["id", "username", "firstName", "lastName", "avatar"] }],
    });
    if (!channel || channel.type !== "channel") {
      return res.status(404).json({ message: "Channel not found!" });
    }
    const member = await GroupMember.findOne({ where: { groupId: channelId, userId: req.userId } });
    if (member) {
      return res.status(200).json({
        isMember: true,
        role: member.role,
        joinedAt: member.joinedAt,
        group: {
          id: channel.id,
          name: channel.name,
          description: channel.description,
          avatar: channel.avatar,
          type: channel.type,
          isPrivate: channel.isPrivate,
          memberCount: channel.memberCount,
          createdAt: channel.createdAt,
          creator: channel.creator,
        },
      });
    }
    return res.status(200).json({
      isMember: false,
      role: "none",
      canJoin: !channel.isPrivate,
      group: {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        avatar: channel.avatar,
        type: channel.type,
        isPrivate: channel.isPrivate,
        memberCount: channel.memberCount,
        createdAt: channel.createdAt,
        creator: channel.creator,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Error getting channel status." });
  }
};

// Get channel members (reuse groupMembers schema)
exports.getChannelMembers = async (req, res) => {
  try {
    const { channelId } = req.params;
    const exists = await Group.findByPk(channelId);
    if (!exists || exists.type !== 'channel') {
      return res.status(404).json({ message: 'Channel not found!' });
    }
    const members = await GroupMember.findAll({
      where: { groupId: channelId, isActive: true },
      include: [{ model: User, as: 'User', attributes: ['id','username','firstName','lastName','avatar','isOnline','lastSeen'] }],
      order: [["role", "ASC"], ["joinedAt", "ASC"]]
    });
    const formatted = members
      .filter(m => m.User)
      .map(m => ({
        id: m.User.id,
        username: m.User.username,
        firstName: m.User.firstName,
        lastName: m.User.lastName,
        avatar: m.User.avatar,
        isOnline: m.User.isOnline,
        lastSeen: m.User.lastSeen,
        role: m.role,
        joinedAt: m.joinedAt
      }));
    const onlineCount = formatted.filter(m => m.isOnline).length;
    res.status(200).json({ members: formatted, totalMembers: formatted.length, onlineMembers: onlineCount });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error getting channel members.' });
  }
};

// Update channel info (creator or admin)
exports.updateChannelInfo = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { name, description, avatar } = req.body;
    const requester = await GroupMember.findOne({ where: { groupId: channelId, userId: req.userId } });
    if (!requester || (requester.role !== 'admin' && requester.role !== 'creator')) {
      return res.status(403).json({ message: 'You do not have permission to update channel info!' });
    }
    const channel = await Group.findByPk(channelId);
    if (!channel || channel.type !== 'channel') {
      return res.status(404).json({ message: 'Channel not found!' });
    }
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (avatar !== undefined) updateData.avatar = avatar;
    await channel.update(updateData);
    
    // Broadcast channel info update to channel members
    if (req.app.locals.wss) {
      const members = await GroupMember.findAll({
        where: { groupId: channelId, isActive: true },
        attributes: ['userId']
      });
      const memberIds = members.map(member => member.userId);
      
      req.app.locals.wss.clients.forEach((client) => {
        if (client.readyState === 1 && 
            client.userId && 
            memberIds.includes(parseInt(client.userId))) {
          try {
            client.send(JSON.stringify({
              type: 'channelInfoUpdated',
              data: {
                channelId: channel.id,
                updates: updateData,
                updatedBy: req.userId
              }
            }));
          } catch (wsError) {
            console.error('WebSocket channel info update broadcast error:', wsError);
          }
        }
      });
    }
    
    res.status(200).json({
      message: 'Channel information updated successfully!',
      channel: {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        avatar: channel.avatar,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error updating channel info.' });
  }
};

// Revoke admin (only creator)
exports.revokeAdmin = async (req, res) => {
  try {
    const { channelId, targetUserId } = req.body;
    const requester = await GroupMember.findOne({ where: { groupId: channelId, userId: req.userId } });
    if (!requester || requester.role !== 'creator') {
      return res.status(403).json({ message: 'Only creator can revoke admin!' });
    }
    const target = await GroupMember.findOne({ where: { groupId: channelId, userId: targetUserId } });
    if (!target) return res.status(404).json({ message: 'Target is not a member.' });
    if (target.role === 'creator') return res.status(400).json({ message: 'Creator cannot be changed.' });
    if (target.role === 'member') return res.status(400).json({ message: 'User is already a regular member.' });
    await target.update({ role: 'member' });
    
    // Broadcast admin revocation to channel members
    if (req.app.locals.wss) {
      const members = await GroupMember.findAll({
        where: { groupId: channelId, isActive: true },
        attributes: ['userId']
      });
      const memberIds = members.map(member => member.userId);
      
      req.app.locals.wss.clients.forEach((client) => {
        if (client.readyState === 1 && 
            client.userId && 
            memberIds.includes(parseInt(client.userId))) {
          try {
            client.send(JSON.stringify({
              type: 'channelAdminRevoked',
              data: {
                channelId: channelId,
                userId: targetUserId,
                revokedBy: req.userId
              }
            }));
          } catch (wsError) {
            console.error('WebSocket channel admin revocation broadcast error:', wsError);
          }
        }
      });
    }
    
    res.status(200).json({ message: 'Admin revoked.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error revoking admin.' });
  }
};

// Grant admin in channel (only creator)
exports.grantAdmin = async (req, res) => {
  try {
    const { channelId, targetUserId } = req.body;
    const requester = await GroupMember.findOne({ where: { groupId: channelId, userId: req.userId } });
    if (!requester || requester.role !== "creator") {
      return res.status(403).json({ message: "Only creator can grant admin!" });
    }
    const target = await GroupMember.findOne({ where: { groupId: channelId, userId: targetUserId } });
    if (!target) return res.status(404).json({ message: "Target is not a member." });
    if (target.role === "admin") return res.status(400).json({ message: "Already admin." });
    if (target.role === "creator") return res.status(400).json({ message: "Creator cannot be changed." });
    await target.update({ role: "admin" });
    
    // Broadcast admin grant to channel members
    if (req.app.locals.wss) {
      const members = await GroupMember.findAll({
        where: { groupId: channelId, isActive: true },
        attributes: ['userId']
      });
      const memberIds = members.map(member => member.userId);
      
      req.app.locals.wss.clients.forEach((client) => {
        if (client.readyState === 1 && 
            client.userId && 
            memberIds.includes(parseInt(client.userId))) {
          try {
            client.send(JSON.stringify({
              type: 'channelAdminGranted',
              data: {
                channelId: channelId,
                userId: targetUserId,
                grantedBy: req.userId
              }
            }));
          } catch (wsError) {
            console.error('WebSocket channel admin grant broadcast error:', wsError);
          }
        }
      });
    }
    
    res.status(200).json({ message: "Admin granted." });
  } catch (err) {
    res.status(500).json({ message: err.message || "Error granting admin." });
  }
};
