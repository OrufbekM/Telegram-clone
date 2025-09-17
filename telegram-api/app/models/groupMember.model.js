module.exports = (sequelize, Sequelize) => {
  const GroupMember = sequelize.define("groupMember", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    groupId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'groups',
        key: 'id'
      }
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    role: {
      type: Sequelize.ENUM('member', 'admin', 'creator'),
      defaultValue: 'member'
    },
    joinedAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  });
  return GroupMember;
};

