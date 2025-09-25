const db = require("../models");
const Group = db.groups;
const GroupMember = db.groupMembers;
const User = db.users;

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
    res.status(200).json({ message: "Left channel." });
  } catch (err) {
    res.status(500).json({ message: err.message || "Error leaving channel." });
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
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Error getting channel status." });
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
    res.status(200).json({ message: "Admin granted." });
  } catch (err) {
    res.status(500).json({ message: err.message || "Error granting admin." });
  }
};


