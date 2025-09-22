const db = require("../models");
const Group = db.groups;
const GroupMember = db.groupMembers;
const User = db.users;
const Message = db.messages;
const MessageRead = db.messageReads;
exports.createGroup = async (req, res) => {
  try {
    const { name, description, type, isPrivate, avatar } = req.body;
    if (!name) {
      return res.status(400).json({
        message: "Group name is required!"
      });
    }
    const group = await Group.create({
      name,
      description,
      avatar,
      type: type || 'group',
      isPrivate: isPrivate || false,
      creatorId: req.userId
    });
    await GroupMember.create({
      groupId: group.id,
      userId: req.userId,
      role: 'creator'
    });
    await group.update({ memberCount: 1 });
    const groupData = {
      id: group.id,
      name: group.name,
      description: group.description,
      avatar: group.avatar,
      type: group.type,
      isPrivate: group.isPrivate,
      creatorId: group.creatorId,
      memberCount: group.memberCount
    };
    if (req.app.locals.wss) {
      req.app.locals.wss.clients.forEach((client) => {
        if (client.readyState === 1 && client.userId && client.userId === req.userId) {
          try {
            client.send(JSON.stringify({
              type: 'groupCreated',
              data: groupData
            }));
          } catch (wsError) {
            console.error('WebSocket group creation broadcast error:', wsError);
          }
        }
      });
    }
    res.status(201).json({
      message: "Group created successfully!",
      group: groupData
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while creating group."
    });
  }
};
exports.getUserGroups = async (req, res) => {
  try {
    const groups = await Group.findAll({
      include: [{
        model: User,
        as: 'members',
        through: { attributes: ['role', 'joinedAt'] },
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'isOnline']
      }],
      where: {
        '$members.id$': req.userId
      }
    });
    const groupsWithOnlineCount = groups.map(group => {
      console.log(`рџ“‹ Group: ${group.name}, Members:`, group.members?.length || 0);
      if (group.members) {
        group.members.forEach(member => {
          console.log(`  - ${member.username}: isOnline=${member.isOnline}`);
        });
      }
      const onlineMembers = group.members ? 
        group.members.filter(member => member.isOnline).length : 0;
      console.log(`рџџў Group: ${group.name}, Online count: ${onlineMembers}`);
      return {
        ...group.toJSON(),
        onlineMembersCount: onlineMembers
      };
    });
    res.status(200).json({
      groups: groupsWithOnlineCount
    });
  } catch (err) {
    console.error('вќЊ Error in getUserGroups:', err);
    res.status(500).json({
      message: err.message || "Some error occurred while retrieving groups."
    });
  }
};
exports.getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findByPk(groupId, {
      include: [{
        model: User,
        as: 'members',
        through: { attributes: ['role', 'joinedAt'] },
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
      }]
    });
    if (!group) {
      return res.status(404).json({
        message: "Group not found!"
      });
    }
    res.status(200).json({
      group: group
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while retrieving group details."
    });
  }
};
exports.addMember = async (req, res) => {
  try {
    const { groupId, userId, role = 'member' } = req.body;
    const member = await GroupMember.findOne({
      where: { groupId, userId: req.userId }
    });
    if (!member || (member.role !== 'admin' && member.role !== 'creator')) {
      return res.status(403).json({
        message: "You don't have permission to add members!"
      });
    }
    const existingMember = await GroupMember.findOne({
      where: { groupId, userId }
    });
    if (existingMember) {
      return res.status(400).json({
        message: "User is already a member of this group!"
      });
    }
    await GroupMember.create({
      groupId,
      userId,
      role
    });
    const group = await Group.findByPk(groupId);
    await group.update({ memberCount: group.memberCount + 1 });
    res.status(200).json({
      message: "Member added successfully!"
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while adding member."
    });
  }
};
exports.requestToJoinGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({
        message: "Group not found!"
      });
    }
    const existingMember = await GroupMember.findOne({
      where: { groupId, userId: req.userId }
    });
    if (existingMember) {
      return res.status(400).json({
        message: "You are already a member of this group!"
      });
    }
    if (!group.isPrivate) {
      await GroupMember.create({
        groupId,
        userId: req.userId,
        role: 'member'
      });
      await group.update({ memberCount: group.memberCount + 1 });
      if (req.app.locals.wss) {
        req.app.locals.wss.clients.forEach((client) => {
          if (client.readyState === 1 && client.userId && client.userId === req.userId) {
            try {
              client.send(JSON.stringify({
                type: 'groupJoined',
                data: {
                  id: group.id,
                  name: group.name,
                  description: group.description,
                  avatar: group.avatar,
                  type: group.type,
                  isPrivate: group.isPrivate,
                  memberCount: group.memberCount
                }
              }));
            } catch (wsError) {
              console.error('WebSocket group join broadcast error:', wsError);
            }
          }
        });
      }
      return res.status(200).json({
        message: "Successfully joined the group!",
        joined: true
      });
    }
    res.status(200).json({
      message: "Join request sent! Waiting for admin approval.",
      joined: false,
      requiresApproval: true
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while requesting to join group."
    });
  }
};
exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { deleteForEveryone } = req.body; // New parameter for group deletion
    
    const member = await GroupMember.findOne({
      where: { groupId, userId: req.userId }
    });
    if (!member) {
      return res.status(404).json({
        message: "You are not a member of this group!"
      });
    }
    
    // If creator wants to delete for everyone
    if (member.role === 'creator' && deleteForEveryone === true) {
      const groupMessages = await Message.findAll({
        where: { chatType: 'group', chatId: groupId },
        attributes: ['id']
      });
      const messageIds = groupMessages.map(msg => msg.id);
      if (messageIds.length > 0) {
        await MessageRead.destroy({ where: { messageId: messageIds } });
      }
      await Message.destroy({ where: { chatType: 'group', chatId: groupId } });
      await GroupMember.destroy({ where: { groupId } });
      const group = await Group.findByPk(groupId);
      await group.destroy();
      await broadcastGroupUpdate(req.app.locals.wss, groupId, {
        type: 'groupDeleted',
        data: {
          groupId,
          deletedBy: req.userId,
          reason: 'Group deleted by creator'
        }
      });
      return res.status(200).json({
        message: "Group deleted successfully for everyone!",
        groupDeleted: true
      });
    }
    
    // Regular leave (including creator leaving without deleting)
    await member.destroy();
    const group = await Group.findByPk(groupId);
    await group.update({ memberCount: group.memberCount - 1 });
    await broadcastGroupUpdate(req.app.locals.wss, groupId, {
      type: 'memberLeft',
      data: {
        groupId,
        userId: req.userId
      }
    });
    res.status(200).json({
      message: "Successfully left the group!"
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while leaving group."
    });
  }
};
exports.checkGroupStatus = async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log('рџ”Ќ checkGroupStatus called:', { groupId, userId: req.userId });
    const group = await Group.findByPk(groupId, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
      }]
    });
    console.log('рџЏў Group found:', group ? { id: group.id, name: group.name } : 'NOT_FOUND');
    if (!group) {
      return res.status(404).json({
        message: "Group not found!"
      });
    }
    const member = await GroupMember.findOne({
      where: { groupId, userId: req.userId }
    });
    console.log('рџ‘¤ Member status:', member ? { role: member.role, isActive: member.isActive } : 'NOT_MEMBER');
    const onlineMembers = await getOnlineGroupMembers(groupId);
    if (member) {
      res.status(200).json({
        isMember: true,
        role: member.role,
        joinedAt: member.joinedAt,
        canLeave: true,
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          type: group.type,
          isPrivate: group.isPrivate,
          memberCount: group.memberCount,
          onlineMembersCount: onlineMembers.length,
          creator: group.creator
        }
      });
    } else {
      res.status(200).json({
        isMember: false,
        canJoin: !group.isPrivate,
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          type: group.type,
          isPrivate: group.isPrivate,
          memberCount: group.memberCount,
          creator: group.creator
        }
      });
    }
  } catch (err) {
    console.error('Error in checkGroupStatus:', err);
    res.status(500).json({
      message: err.message || "Some error occurred while checking group status."
    });
  }
};
const getOnlineGroupMembers = async (groupId) => {
  try {
    const members = await GroupMember.findAll({
      where: { groupId, isActive: true },
      include: [{
        model: User,
        attributes: ['id', 'username', 'isOnline', 'lastSeen']
      }]
    });
    const onlineMembers = members.filter(member => 
      member.User && member.User.isOnline
    );
    return onlineMembers;
  } catch (error) {
    console.error('Error getting online group members:', error);
    return [];
  }
};
exports.promoteToAdmin = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const requesterMember = await GroupMember.findOne({
      where: { groupId, userId: req.userId }
    });
    if (!requesterMember || (requesterMember.role !== 'admin' && requesterMember.role !== 'creator')) {
      return res.status(403).json({
        message: "You don't have permission to promote members!"
      });
    }
    const targetMember = await GroupMember.findOne({
      where: { groupId, userId }
    });
    if (!targetMember) {
      return res.status(404).json({
        message: "User is not a member of this group!"
      });
    }
    if (targetMember.role === 'creator') {
      return res.status(400).json({
        message: "Cannot modify creator's role!"
      });
    }
    if (targetMember.role === 'admin') {
      return res.status(400).json({
        message: "User is already an admin!"
      });
    }
    await targetMember.update({ role: 'admin' });
    await broadcastGroupUpdate(req.app.locals.wss, groupId, {
      type: 'memberPromoted',
      data: {
        groupId,
        userId,
        newRole: 'admin',
        promotedBy: req.userId
      }
    });
    res.status(200).json({
      message: "User promoted to admin successfully!"
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while promoting user."
    });
  }
};
exports.demoteFromAdmin = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const requesterMember = await GroupMember.findOne({
      where: { groupId, userId: req.userId }
    });
    if (!requesterMember || (requesterMember.role !== 'admin' && requesterMember.role !== 'creator')) {
      return res.status(403).json({
        message: "You don't have permission to demote members!"
      });
    }
    const targetMember = await GroupMember.findOne({
      where: { groupId, userId }
    });
    if (!targetMember) {
      return res.status(404).json({
        message: "User is not a member of this group!"
      });
    }
    if (targetMember.role === 'creator') {
      return res.status(400).json({
        message: "Cannot demote the group creator!"
      });
    }
    if (targetMember.role === 'member') {
      return res.status(400).json({
        message: "User is already a regular member!"
      });
    }
    if (requesterMember.role === 'admin' && targetMember.role === 'admin') {
      return res.status(403).json({
        message: "Admins cannot demote other admins!"
      });
    }
    await targetMember.update({ role: 'member' });
    await broadcastGroupUpdate(req.app.locals.wss, groupId, {
      type: 'memberDemoted',
      data: {
        groupId,
        userId,
        newRole: 'member',
        demotedBy: req.userId
      }
    });
    res.status(200).json({
      message: "User demoted from admin successfully!"
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while demoting user."
    });
  }
};
exports.removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const requesterMember = await GroupMember.findOne({
      where: { groupId, userId: req.userId }
    });
    if (!requesterMember || (requesterMember.role !== 'admin' && requesterMember.role !== 'creator')) {
      return res.status(403).json({
        message: "You don't have permission to remove members!"
      });
    }
    const targetMember = await GroupMember.findOne({
      where: { groupId, userId }
    });
    if (!targetMember) {
      return res.status(404).json({
        message: "User is not a member of this group!"
      });
    }
    if (targetMember.role === 'creator') {
      return res.status(400).json({
        message: "Cannot remove the group creator!"
      });
    }
    if (requesterMember.role === 'admin' && targetMember.role === 'admin') {
      return res.status(403).json({
        message: "Admins cannot remove other admins!"
      });
    }
    await targetMember.destroy();
    const group = await Group.findByPk(groupId);
    await group.update({ memberCount: group.memberCount - 1 });
    await broadcastGroupUpdate(req.app.locals.wss, groupId, {
      type: 'memberRemoved',
      data: {
        groupId,
        userId,
        removedBy: req.userId
      }
    });
    res.status(200).json({
      message: "Member removed successfully!"
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while removing member."
    });
  }
};
exports.updateGroupInfo = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, avatar } = req.body;
    const requesterMember = await GroupMember.findOne({
      where: { groupId, userId: req.userId }
    });
    if (!requesterMember || (requesterMember.role !== 'admin' && requesterMember.role !== 'creator')) {
      return res.status(403).json({
        message: "You don't have permission to update group info!"
      });
    }
    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({
        message: "Group not found!"
      });
    }
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (avatar !== undefined) updateData.avatar = avatar;
    await group.update(updateData);
    await broadcastGroupUpdate(req.app.locals.wss, groupId, {
      type: 'groupInfoUpdated',
      data: {
        groupId,
        updatedBy: req.userId,
        updates: updateData
      }
    });
    res.status(200).json({
      message: "Group information updated successfully!",
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        avatar: group.avatar
      }
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while updating group info."
    });
  }
};
exports.getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log('рџ”Ќ getGroupMembers called:', { groupId, userId: req.userId });
    const member = await GroupMember.findOne({
      where: { groupId, userId: req.userId }
    });
    console.log('рџ‘¤ Requester member:', member);
    if (!member) {
      console.log('вќЊ User is not a member of this group');
      return res.status(403).json({
        message: "You are not a member of this group!"
      });
    }
    const members = await GroupMember.findAll({
      where: { 
        groupId,
        isActive: true
      },
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'isOnline', 'lastSeen']
      }],
      order: [['role', 'ASC'], ['joinedAt', 'ASC']]
    });
    console.log('рџ‘Ґ Found members raw:', members.length);
    console.log('рџ‘Ґ Members data:', members.map(m => ({ 
      membershipId: m.id, 
      userId: m.userId, 
      role: m.role, 
      isActive: m.isActive,
      User: m.User ? {
        id: m.User.id,
        username: m.User.username,
        isOnline: m.User.isOnline
      } : 'NO_USER' 
    })));
    const formattedMembers = members
      .filter(member => member.User)
      .map(member => ({
        id: member.User.id,
        username: member.User.username,
        firstName: member.User.firstName,
        lastName: member.User.lastName,
        avatar: member.User.avatar,
        isOnline: member.User.isOnline,
        lastSeen: member.User.lastSeen,
        role: member.role,
        joinedAt: member.joinedAt
      }));

    const onlineCount = formattedMembers.filter(member => member.isOnline).length;

    res.status(200).json({
      members: formattedMembers,
      totalMembers: formattedMembers.length,
      onlineMembers: onlineCount
    });
  } catch (err) {
    console.error('вќЊ Error in getGroupMembers:', err);
    console.error('вќЊ Full error stack:', err.stack);
    res.status(500).json({
      message: err.message || "Some error occurred while getting group members.",
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
const broadcastGroupUpdate = async (wss, groupId, message) => {
  try {
    if (!wss) return;
    const members = await GroupMember.findAll({
      where: { groupId, isActive: true },
      attributes: ['userId']
    });
    const memberIds = members.map(member => member.userId);
    wss.clients.forEach((client) => {
      if (client.readyState === 1 && 
          client.userId && 
          memberIds.includes(client.userId)) {
        try {
          client.send(JSON.stringify(message));
        } catch (wsError) {
          console.error('WebSocket broadcast error:', wsError);
        }
      }
    });
  } catch (error) {
    console.error('Error broadcasting group update:', error);
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const member = await GroupMember.findOne({
      where: { groupId, userId: req.userId }
    });
    
    if (!member || member.role !== 'creator') {
      return res.status(403).json({
        message: "Only group creator can delete the group!"
      });
    }
    
    // Delete all group messages and related data
    const groupMessages = await Message.findAll({
      where: { chatType: 'group', chatId: groupId },
      attributes: ['id']
    });
    const messageIds = groupMessages.map(msg => msg.id);
    if (messageIds.length > 0) {
      await MessageRead.destroy({ where: { messageId: messageIds } });
    }
    await Message.destroy({ where: { chatType: 'group', chatId: groupId } });
    await GroupMember.destroy({ where: { groupId } });
    const group = await Group.findByPk(groupId);
    await group.destroy();
    
    await broadcastGroupUpdate(req.app.locals.wss, groupId, {
      type: 'groupDeleted',
      data: {
        groupId,
        deletedBy: req.userId,
        reason: 'Group deleted by creator'
      }
    });
    
    res.status(200).json({
      message: "Group deleted successfully!",
      groupDeleted: true
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Some error occurred while deleting group."
    });
  }
};

