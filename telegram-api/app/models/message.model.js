module.exports = (sequelize, Sequelize) => {
  const Message = sequelize.define("message", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: true // Rasm yuborish uchun null bo'lishi mumkin
    },
    image: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Rasm fayl yo\'li'
    },
    voiceMessage: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Ovozli xabar fayl yo\'li'
    },
    voiceDuration: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Ovozli xabar davomiyligi (soniyalarda)'
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    chatType: {
      type: Sequelize.ENUM('private', 'group'),
      defaultValue: 'private'
    },
    chatId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'Group ID yoki PrivateChat ID (no foreign key constraint to allow flexible chat deletion)'
    },
    replyToMessageId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id'
      }
    },
    timestamp: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    }
  });
  return Message;
};

