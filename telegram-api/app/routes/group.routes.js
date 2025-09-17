const { verifyToken } = require("../middleware/auth.middleware");
const controller = require("../controllers/group.controller");
const diagnosticController = require("../controllers/diagnostic.controller");
module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  app.post("/api/groups", [verifyToken], controller.createGroup);
  app.get("/api/groups/user", [verifyToken], controller.getUserGroups);
  app.get("/api/groups/:groupId", [verifyToken], controller.getGroupDetails);
  app.get("/api/groups/:groupId/status", [verifyToken], controller.checkGroupStatus);
  app.get("/api/groups/:groupId/members", [verifyToken], controller.getGroupMembers);
  app.post("/api/groups/members", [verifyToken], controller.addMember);
  app.post("/api/groups/join", [verifyToken], controller.requestToJoinGroup);
  app.delete("/api/groups/:groupId/leave", [verifyToken], controller.leaveGroup);
  app.delete("/api/groups/:groupId", [verifyToken], controller.deleteGroup);
  app.post("/api/groups/promote", [verifyToken], controller.promoteToAdmin);
  app.post("/api/groups/demote", [verifyToken], controller.demoteFromAdmin);
  app.post("/api/groups/remove", [verifyToken], controller.removeMember);
  app.put("/api/groups/:groupId/info", [verifyToken], controller.updateGroupInfo);
  app.get("/api/groups/:groupId/diagnostic", [verifyToken], diagnosticController.diagnosticGroupData);
};

