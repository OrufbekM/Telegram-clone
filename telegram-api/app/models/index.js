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
db.groupMembers = require("./groupMember.model.js")(sequelize, Sequelize);
db.privateChats = require("./privateChat.model.js")(sequelize, Sequelize);
db.users.hasMany(db.messages, { foreignKey: 'userId', as: 'messages' });
db.messages.belongsTo(db.users, { foreignKey: 'userId', as: 'user' });
db.users.hasMany(db.groups, { foreignKey: 'creatorId', as: 'createdGroups' });
db.groups.belongsTo(db.users, { foreignKey: 'creatorId', as: 'creator' });
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

