const db = require("../models");
const Group = db.groups;
const GroupMember = db.groupMembers;
const User = db.users;
exports.diagnosticGroupData = async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log('рџ”§ DIAGNOSTIC - Checking group data:', { groupId, userId: req.userId });
    const group = await Group.findByPk(groupId);
    console.log('рџ“Љ Group:', group ? {
      id: group.id,
      name: group.name,
      memberCount: group.memberCount,
      creatorId: group.creatorId
    } : 'NOT_FOUND');
    const allMembers = await GroupMember.findAll({
      where: { groupId },
      include: [{
        model: User,
        attributes: ['id', 'username', 'firstName', 'lastName']
      }]
    });
    console.log('рџ‘Ґ All members in DB:', allMembers.map(m => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      isActive: m.isActive,
      username: m.User ? m.User.username : 'NO_USER'
    })));
    const currentUserMember = await GroupMember.findOne({
      where: { groupId, userId: req.userId }
    });
    console.log('рџ‘¤ Current user membership:', currentUserMember ? {
      role: currentUserMember.role,
      isActive: currentUserMember.isActive,
      joinedAt: currentUserMember.joinedAt
    } : 'NOT_A_MEMBER');
    const activeMembers = await GroupMember.findAll({
      where: { groupId, isActive: true }
    });
    console.log('вњ… Active members count:', activeMembers.length);
    res.status(200).json({
      diagnostic: 'Group data diagnostic',
      group: group ? {
        id: group.id,
        name: group.name,
        memberCount: group.memberCount
      } : null,
      allMembersCount: allMembers.length,
      activeMembersCount: activeMembers.length,
      currentUserIsMember: !!currentUserMember,
      currentUserRole: currentUserMember ? currentUserMember.role : null,
      allMembers: allMembers.map(m => ({
        userId: m.userId,
        role: m.role,
        isActive: m.isActive,
        username: m.User ? m.User.username : null
      }))
    });
  } catch (err) {
    console.error('вќЊ DIAGNOSTIC ERROR:', err);
    res.status(500).json({
      message: err.message || "Diagnostic error occurred."
    });
  }
};

