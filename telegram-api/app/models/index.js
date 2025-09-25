const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
});
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.users = require("./user.model.js")(sequelize, Sequelize);
db.messages = require("./message.model.js")(sequelize, Sequelize);
db.messageReads = require("./messageRead.model.js")(sequelize, Sequelize);
db.groups = require("./group.model.js")(sequelize, Sequelize);
db.channels = require("./channel.model.js")(sequelize, Sequelize);
db.channelMembers = require("./channelMember.model.js")(sequelize, Sequelize);
db.groupMembers = require("./groupMember.model.js")(sequelize, Sequelize);
db.privateChats = require("./privateChat.model.js")(sequelize, Sequelize);
db.users.hasMany(db.messages, { foreignKey: 'userId', as: 'messages' });
db.messages.belongsTo(db.users, { foreignKey: 'userId', as: 'user' });
db.users.hasMany(db.groups, { foreignKey: 'creatorId', as: 'createdGroups' });
db.groups.belongsTo(db.users, { foreignKey: 'creatorId', as: 'creator' });
db.users.hasMany(db.channels, { foreignKey: 'creatorId', as: 'createdChannels' });
db.channels.belongsTo(db.users, { foreignKey: 'creatorId', as: 'creator' });
db.users.belongsToMany(db.groups, { 
  through: db.groupMembers, 
  foreignKey: 'userId', 
  as: 'joinedGroups' 
});
db.groups.belongsToMany(db.users, { 
  through: db.groupMembers, 
  foreignKey: 'groupId', 
  as: 'members' 
});
// Optionally, channels can reuse groupMembers or a dedicated channelMembers model.
db.users.belongsToMany(db.channels, {
  through: db.channelMembers,
  foreignKey: 'userId',
  as: 'joinedChannels'
});
db.channels.belongsToMany(db.users, {
  through: db.channelMembers,
  foreignKey: 'channelId',
  as: 'subscribers'
});
db.channelMembers.belongsTo(db.users, { foreignKey: 'userId', as: 'User' });
db.channelMembers.belongsTo(db.channels, { foreignKey: 'channelId', as: 'Channel' });
db.users.hasMany(db.channelMembers, { foreignKey: 'userId', as: 'channelMemberships' });
db.channels.hasMany(db.channelMembers, { foreignKey: 'channelId', as: 'channelMemberships' });
db.users.hasMany(db.privateChats, { foreignKey: 'user1Id', as: 'privateChatsAsUser1' });
db.users.hasMany(db.privateChats, { foreignKey: 'user2Id', as: 'privateChatsAsUser2' });
db.privateChats.belongsTo(db.users, { foreignKey: 'user1Id', as: 'user1' });
db.privateChats.belongsTo(db.users, { foreignKey: 'user2Id', as: 'user2' });
db.privateChats.belongsTo(db.messages, { foreignKey: 'lastMessageId', as: 'lastMessage' });
db.messages.hasOne(db.privateChats, { foreignKey: 'lastMessageId', as: 'asLastMessageInChat' });
db.messages.hasMany(db.messageReads, { foreignKey: 'messageId', as: 'reads' });
db.messageReads.belongsTo(db.messages, { foreignKey: 'messageId', as: 'message' });
db.users.hasMany(db.messageReads, { foreignKey: 'userId', as: 'readMessages' });
db.messageReads.belongsTo(db.users, { foreignKey: 'userId', as: 'reader' });
db.groupMembers.belongsTo(db.users, { foreignKey: 'userId', as: 'User' });
db.groupMembers.belongsTo(db.groups, { foreignKey: 'groupId', as: 'Group' });
db.users.hasMany(db.groupMembers, { foreignKey: 'userId', as: 'groupMemberships' });
db.groups.hasMany(db.groupMembers, { foreignKey: 'groupId', as: 'groupMemberships' });
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});
module.exports = db;

