module.exports = (sequelize, Sequelize) => {
  const ChannelMember = sequelize.define("channelMember", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    channelId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'channels',
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
      type: Sequelize.ENUM('creator', 'admin', 'member'),
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
  return ChannelMember;
};


