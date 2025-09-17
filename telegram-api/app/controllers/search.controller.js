const db = require("../models");
const User = db.users;
const Group = db.groups;
exports.searchAll = async (req, res) => {
  try {
    const { query, type } = req.query;
    if (!query || query.length < 2) {
      return res.status(400).json({
        message: "Search query must be at least 2 characters long!"
      });
    }
    let results = {};
    if (!type || type === 'users' || type === 'all') {
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
        limit: 10
      });
      results.users = users;
    }
    if (!type || type === 'groups' || type === 'all') {
      const groups = await Group.findAll({
        where: {
          [db.Sequelize.Op.or]: [
            { name: { [db.Sequelize.Op.iLike]: `%${query}%` } },
            { description: { [db.Sequelize.Op.iLike]: `%${query}%` } }
          ]
        },
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }],
        attributes: ['id', 'name', 'description', 'type', 'isPrivate', 'avatar', 'memberCount'],
        limit: 10
      });
      results.groups = groups;
    }
    if (type === 'channels') {
      const channels = await Group.findAll({
        where: {
          type: 'channel',
          [db.Sequelize.Op.or]: [
            { name: { [db.Sequelize.Op.iLike]: `%${query}%` } },
            { description: { [db.Sequelize.Op.iLike]: `%${query}%` } }
          ]
        },
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }],
        attributes: ['id', 'name', 'description', 'type', 'isPrivate', 'avatar', 'memberCount'],
        limit: 10
      });
      results.channels = channels;
    }
    if (type === 'groups_only') {
      const groupsOnly = await Group.findAll({
        where: {
          type: 'group',
          [db.Sequelize.Op.or]: [
            { name: { [db.Sequelize.Op.iLike]: `%${query}%` } },
            { description: { [db.Sequelize.Op.iLike]: `%${query}%` } }
          ]
        },
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }],
        attributes: ['id', 'name', 'description', 'type', 'isPrivate', 'avatar', 'memberCount'],
        limit: 10
      });
      results.groups = groupsOnly;
    }
    res.status(200).json({
      query: query,
      type: type || 'all',
      results: results,
      total: {
        users: results.users ? results.users.length : 0,
        groups: results.groups ? results.groups.length : 0,
        channels: results.channels ? results.channels.length : 0
      }
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({
      message: err.message || "Some error occurred while searching."
    });
  }
};
exports.advancedSearch = async (req, res) => {
  try {
    const { query, type, isPrivate, minMembers, maxMembers } = req.query;
    if (!query || query.length < 2) {
      return res.status(400).json({
        message: "Search query must be at least 2 characters long!"
      });
    }
    let whereClause = {
      [db.Sequelize.Op.or]: [
        { name: { [db.Sequelize.Op.iLike]: `%${query}%` } },
        { description: { [db.Sequelize.Op.iLike]: `%${query}%` } }
      ],
      isActive: true
    };
    if (type && type !== 'all') {
      whereClause.type = type;
    }
    if (isPrivate !== undefined) {
      whereClause.isPrivate = isPrivate === 'true';
    }
    if (minMembers) {
      whereClause.memberCount = {
        [db.Sequelize.Op.gte]: parseInt(minMembers)
      };
    }
    if (maxMembers) {
      whereClause.memberCount = {
        ...whereClause.memberCount,
        [db.Sequelize.Op.lte]: parseInt(maxMembers)
      };
    }
    const results = await Group.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
      }],
      attributes: ['id', 'name', 'description', 'type', 'isPrivate', 'avatar', 'memberCount'],
      order: [['memberCount', 'DESC'], ['name', 'ASC']],
      limit: 20
    });
    res.status(200).json({
      query: query,
      filters: { type, isPrivate, minMembers, maxMembers },
      results: results,
      total: results.length
    });
  } catch (err) {
    console.error('Advanced search error:', err);
    res.status(500).json({
      message: err.message || "Some error occurred while searching."
    });
  }
};

