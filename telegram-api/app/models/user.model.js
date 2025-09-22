module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define("user", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false
    },
    firstName: {
      type: Sequelize.STRING,
      allowNull: true
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: true
    },
    avatar: {
      type: Sequelize.STRING,
      allowNull: true
    },
    bio: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    phone: {
      type: Sequelize.STRING,
      allowNull: true
    },
    isOnline: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    lastSeen: {
      type: Sequelize.DATE,
      allowNull: true
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    showOnlineStatus: {
      type: Sequelize.BOOLEAN,
      defaultValue: true // Umumiy online statusni ko'rsatish
    },
    allowedLocations: {
      type: Sequelize.JSON,
      defaultValue: ['all'] // ['all'] yoki ['telegram', 'web', 'mobile'] kabi
    },
    currentSessionId: {
      type: Sequelize.STRING,
      allowNull: true
    },
    currentLocation: {
      type: Sequelize.STRING,
      allowNull: true // 'telegram', 'web', 'mobile', etc.
    },
    onlineVisibility: {
      type: Sequelize.ENUM('everyone', 'contacts', 'nobody', 'custom'),
      defaultValue: 'everyone'
    },
    hiddenFromUsers: {
      type: Sequelize.JSON,
      defaultValue: []
    }
  }, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });
  
  return User;
};
