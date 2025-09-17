module.exports = (sequelize, Sequelize) => {
  const MessageRead = sequelize.define("messageRead", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    messageId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'messages',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    readAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    }
  }, {
    indexes: [
      {
        unique: true,
        fields: ['messageId', 'userId'],
        name: 'unique_message_user_read'
      }
    ]
  });
  return MessageRead;
};

