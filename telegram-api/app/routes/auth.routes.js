const { verifyToken } = require("../middleware/auth.middleware");
const authController = require("../controllers/auth.controller");
const userController = require("../controllers/user.controller");
module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  app.post("/api/auth/signup", authController.signup);
  app.post("/api/auth/signin", authController.signin);
  app.delete("/api/users/delete", verifyToken, userController.deleteUser);
};

