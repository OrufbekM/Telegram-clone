const { verifyToken } = require("../middleware/auth.middleware");
const controller = require("../controllers/channel.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post("/api/channels", [verifyToken], controller.createChannel);
  app.get("/api/channels/user", [verifyToken], controller.getUserChannels);
  app.post("/api/channels/:channelId/join", [verifyToken], controller.joinChannel);
  app.post("/api/channels/:channelId/leave", [verifyToken], controller.leaveChannel);
  app.get("/api/channels/:channelId/status", [verifyToken], controller.getChannelStatus);
  app.post("/api/channels/grant-admin", [verifyToken], controller.grantAdmin);
};


