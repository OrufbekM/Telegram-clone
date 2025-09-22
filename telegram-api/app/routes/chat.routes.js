const { verifyToken } = require("../middleware/auth.middleware");
const controller = require("../controllers/chat.controller");
module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  app.post("/api/chat/send", [verifyToken], controller.sendMessage);
  app.post("/api/chat/message", [verifyToken], controller.sendMessage);
  app.get("/api/chat/messages", [verifyToken], controller.getMessages);
  app.put("/api/chat/messages/:id", [verifyToken], controller.updateMessage);
  app.delete("/api/chat/messages/:id", [verifyToken], controller.deleteMessage);
  app.post("/api/chat/messages/read", [verifyToken], controller.markMessagesAsRead);
  app.post("/api/chat/read", [verifyToken], controller.markChatAsRead);
  app.get("/api/chat/unread", [verifyToken], controller.getUnreadCount);
  app.get("/api/chat/unread/all", [verifyToken], controller.getAllUnreadCounts);
  app.post("/api/chat/messages/clear", [verifyToken], controller.clearChatHistory);
  app.post("/api/chat/delete", [verifyToken], controller.deleteChat);
};

