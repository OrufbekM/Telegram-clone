const { verifyToken } = require("../middleware/auth.middleware");
const controller = require("../controllers/user.controller");
module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  app.get("/api/users/search", [verifyToken], controller.searchUsers);
  app.get("/api/users/:userId/profile", [verifyToken], controller.getUserProfile);
  app.put("/api/users/profile", [verifyToken], controller.updateProfile);
  app.put("/api/users/avatar", [verifyToken], controller.updateAvatar);
  app.post("/api/users/private-chat", [verifyToken], controller.startPrivateChat);
  app.get("/api/users/private-chats", [verifyToken], controller.getPrivateChats);
  app.put("/api/users/online-status", [verifyToken], controller.updateOnlineStatus);
  app.post("/api/users/online-status/bulk", [verifyToken], controller.getUsersOnlineStatus);
  app.put("/api/users/selective-online-status", [verifyToken], controller.setSelectiveOnlineStatus);
  app.post("/api/users/enhanced-online-status/bulk", [verifyToken], controller.getEnhancedUsersOnlineStatus);
  app.put("/api/users/online-privacy-settings", [verifyToken], controller.updateOnlinePrivacySettings);
  app.delete("/api/users/account", [verifyToken], controller.deleteUser);
};

