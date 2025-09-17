module.exports = (sequelize, Sequelize) => {
  const Group = sequelize.define("group", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    type: {
      type: Sequelize.ENUM('group', 'channel'),
      defaultValue: 'group'
    },
    isPrivate: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    creatorId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    avatar: {
      type: Sequelize.STRING,
      allowNull: true
    },
    memberCount: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    }
  });
  return Group;
};

