const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const multer = require("multer");
const path = require("path");
const userController = require("./app/controllers/user.controller");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.locals.wss = wss;
const onlineUsers = new Map();
const sessionUsers = new Map();
const messageViewers = new Map();

const avatarStorage = multer.diskStorage({
  destination: "./uploads/avatars/",
  filename: function (req, file, cb) {
    cb(null, "avatar-" + Date.now() + path.extname(file.originalname));
  },
});
const imageStorage = multer.diskStorage({
  destination: "./uploads/images/",
  filename: function (req, file, cb) {
    cb(
      null,
      "image-" +
        Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    );
  },
});
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Faqat rasm fayllari ruxsat etilgan!"), false);
  }
};
const avatarUpload = multer({ storage: avatarStorage });
const imageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  // No file size limits
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/voices', express.static(path.join(__dirname, 'uploads/voices')));

const db = require("./app/models");
db.sequelize.sync({ alter: true }).then(() => {
  console.log("Database synced");
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Chat API." });
});

app.post("/api/upload/avatar", avatarUpload.single("avatar"), (req, res) => {

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded!" });
  }

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  res.json({
    message: "Avatar uploaded!",
    url: avatarUrl,
    filename: req.file.filename,
  });

});

app.post("/api/upload/image", imageUpload.single("image"), (req, res) => {
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Rasm fayli topilmadi!",
      });
    }
    const imageUrl = `/uploads/images/${req.file.filename}`;
    const fileInfo = {
      url: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    };
    res.json({
      success: true,
      message: "Rasm muvaffaqiyatli yuklandi!",
      image: fileInfo,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({
      success: false,
      message: "Rasmni yuklashda xatolik yuz berdi",
    });
  }
});
require("./app/routes/auth.routes")(app);
require("./app/routes/chat.routes")(app);
require("./app/routes/group.routes")(app);
require("./app/routes/user.routes")(app);
require("./app/routes/search.routes")(app);
require("./app/routes/upload.routes")(app);
const generateSessionId = () => {
  return (
    "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  );
};
const broadcastStatusChange = async (
  userId,
  isOnline,
  lastSeen,
  location = null,
  sessionId = null
) => {
  const statusData = {
    type: "userStatusUpdate",
    data: {
      userId: userId,
      isOnline: isOnline,
      lastSeen: lastSeen,
      location: location,
      sessionId: sessionId,
    },
  };
  wss.clients.forEach(async (client) => {
    if (client.readyState === WebSocket.OPEN && client.userId) {
      const visibility = await userController.checkOnlineVisibility(
        client.userId,
        userId
      );
      if (visibility.canSee) {
        const customStatusData = {
          ...statusData,
          data: {
            userId: userId,
            isOnline: visibility.isOnline,
            lastSeen: visibility.lastSeen,
            location: visibility.location,
          },
        };
        client.send(JSON.stringify(customStatusData));
      }
    }
  });
  await broadcastGroupOnlineCountUpdates(userId, isOnline);
};
const broadcastGroupOnlineCountUpdates = async (userId, isOnline) => {
  try {
    const db = require("./app/models");
    const GroupMember = db.groupMembers;
    const User = db.users;
    const userGroups = await GroupMember.findAll({
      where: { userId: userId, isActive: true },
      attributes: ["groupId"],
    });
    for (const membership of userGroups) {
      const groupId = membership.groupId;
      const members = await GroupMember.findAll({
        where: { groupId: groupId, isActive: true },
        include: [
          {
            model: User,
            attributes: ["id", "isOnline"],
          },
        ],
      });
      const onlineCount = members.filter(
        (member) => member.User && member.User.isOnline
      ).length;
      const memberIds = members.map((member) => member.userId);
      const groupOnlineUpdate = {
        type: "groupOnlineCountUpdate",
        data: {
          groupId: groupId,
          onlineCount: onlineCount,
          updatedUserId: userId,
          isOnline: isOnline,
          timestamp: new Date(),
        },
      };
      wss.clients.forEach((client) => {
        if (
          client.readyState === WebSocket.OPEN &&
          client.userId &&
          memberIds.includes(client.userId)
        ) {
          client.send(JSON.stringify(groupOnlineUpdate));
        }
      });
    }
  } catch (error) {
    console.error("Error broadcasting group online count updates:", error);
  }
};
const broadcastSelectiveStatusChange = (
  targetUserIds,
  userId,
  isOnline,
  lastSeen,
  location = null
) => {
  const statusData = {
    type: "userStatusUpdate",
    data: {
      userId: userId,
      isOnline: isOnline,
      lastSeen: lastSeen,
      location: location,
    },
  };
  wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.userId &&
      targetUserIds.includes(parseInt(client.userId))
    ) {
      client.send(JSON.stringify(statusData));
    }
  });
};
const debugWebSocketClients = (eventType = "generic") => {
  let authenticatedCount = 0;
  let onlineUsersCount = onlineUsers.size;
  wss.clients.forEach((client, index) => {
    const isAuthenticated = !!client.userId;
    const readyState =
      client.readyState === WebSocket.OPEN
        ? "OPEN"
        : client.readyState === WebSocket.CONNECTING
        ? "CONNECTING"
        : client.readyState === WebSocket.CLOSING
        ? "CLOSING"
        : "CLOSED";
    if (isAuthenticated) authenticatedCount++;
  });
  return {
    total: wss.clients.size,
    authenticated: authenticatedCount,
    online: onlineUsersCount,
  };
};
wss.on("connection", (ws, req) => {
  let userId = null;
  let sessionId = null;
  let location = null;
  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === "auth" && data.userId) {
        userId = parseInt(data.userId);
        location = data.location || "web"; // 'telegram', 'web', 'mobile', etc.
        sessionId = data.sessionId || generateSessionId();
        ws.userId = userId;
        ws.sessionId = sessionId;
        ws.location = location;
        const existingConnection = onlineUsers.get(userId);
        if (existingConnection && existingConnection.location !== location) {
          if (existingConnection.ws.readyState === WebSocket.OPEN) {
            existingConnection.ws.close();
          }
        }
        onlineUsers.set(userId, {
          ws: ws,
          timestamp: Date.now(),
          location: location,
          sessionId: sessionId,
        });
        sessionUsers.set(sessionId, userId);
        await userController.setEnhancedUserOnline(userId, location, sessionId);
        await broadcastStatusChange(
          userId,
          true,
          new Date(),
          location,
          sessionId
        );
        ws.send(
          JSON.stringify({
            type: "authSuccess",
            data: {
              sessionId: sessionId,
              location: location,
              timestamp: new Date(),
            },
          })
        );
        return;
      }
      if (data.type === "updateSelectiveStatus" && userId) {
        const { targetLocation, visibilitySettings } = data;
        if (targetLocation && targetLocation !== location) {
          location = targetLocation;
          ws.location = location;
          if (onlineUsers.has(userId)) {
            onlineUsers.get(userId).location = location;
          }
        }
        await userController.setEnhancedUserOnline(userId, location, sessionId);
        await broadcastStatusChange(
          userId,
          true,
          new Date(),
          location,
          sessionId
        );
        ws.send(
          JSON.stringify({
            type: "statusUpdateSuccess",
            data: {
              location: location,
              sessionId: sessionId,
              timestamp: new Date(),
            },
          })
        );
        return;
      }
      if (data.type === "message") {
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "message",
                data: data.data,
              })
            );
          }
        });
      }
      if (data.type === "chatViewed" && userId) {
        const { chatType, chatId, skipAutoRead } = data;
        if (chatType && chatId) {
          if (!skipAutoRead) {
            try {
              const userController = require("./app/controllers/user.controller");
              const chatController = require("./app/controllers/chat.controller");
              const fakeReq = {
                userId: userId,
                body: { chatType, chatId },
                app: { locals: { wss: wss } },
              };
              const fakeRes = {
                status: () => ({ json: () => {} }),
              };
              await chatController.markChatAsRead(fakeReq, fakeRes);
            } catch (error) {
              console.error("Error auto-marking chat as read:", error);
            }
          } else {
            console.log(
              `рџ‘ЃпёЏ User ${userId} viewed ${chatType} chat ${chatId} - auto-read skipped`
            );
          }
        }
      }
      if (data.type === "typingStart" && userId) {
        const { chatType, chatId } = data;
        if (chatType && chatId) {
          try {
            const userController = require("./app/controllers/user.controller");
            const typingUser = await userController.getUserById(userId);
            const typingData = {
              type: "typingStart",
              data: {
                chatType: chatType,
                chatId: chatId,
                user: {
                  id: typingUser.id,
                  username: typingUser.username,
                },
                timestamp: new Date(),
              },
            };
            wss.clients.forEach((client) => {
              if (
                client.readyState === WebSocket.OPEN &&
                client.userId &&
                client.userId != userId
              ) {
                client.send(JSON.stringify(typingData));
              }
            });
          } catch (error) {
            console.error("Error broadcasting typing start:", error);
          }
        }
      }
      if (data.type === "typingStop" && userId) {
        const { chatType, chatId } = data;
        if (chatType && chatId) {
          try {
            const userController = require("./app/controllers/user.controller");
            const typingUser = await userController.getUserById(userId);
            const typingStopData = {
              type: "typingStop",
              data: {
                chatType: chatType,
                chatId: chatId,
                user: {
                  id: typingUser.id,
                  username: typingUser.username,
                },
                timestamp: new Date(),
              },
            };
            wss.clients.forEach((client) => {
              if (
                client.readyState === WebSocket.OPEN &&
                client.userId &&
                client.userId != userId
              ) {
                client.send(JSON.stringify(typingStopData));
              }
            });
          } catch (error) {
            console.error("Error broadcasting typing stop:", error);
          }
        }
      }
      if (data.type === "messageViewed" && userId) {
        const { messageId, chatType, chatId } = data;
        if (messageId) {
          if (!messageViewers.has(messageId)) {
            messageViewers.set(messageId, new Set());
          }
          messageViewers.get(messageId).add(userId);
          try {
            const userController = require("./app/controllers/user.controller");
            const viewer = await userController.getUserById(userId);
            
            // Broadcast to message sender for read receipt
            const messageReadData = {
              type: "messageReadReceipt",
              data: {
                messageId: messageId,
                chatType: chatType,
                chatId: chatId,
                reader: {
                  id: viewer.id,
                  username: viewer.username,
                },
                timestamp: new Date(),
              },
            };
            
            wss.clients.forEach((client) => {
              if (
                client.readyState === WebSocket.OPEN &&
                client.userId &&
                client.userId != userId
              ) {
                client.send(JSON.stringify(messageReadData));
              }
            });
          } catch (error) {
            console.error("Error broadcasting message view:", error);
          }
        }
      }
      if (data.type === "messageViewEnded" && userId) {
        const { messageId } = data;
        if (messageId && messageViewers.has(messageId)) {
          messageViewers.get(messageId).delete(userId);
          if (messageViewers.get(messageId).size === 0) {
            messageViewers.delete(messageId);
          }
          const viewEndData = {
            type: "messageViewEnded",
            data: {
              messageId: messageId,
              viewerId: userId,
              timestamp: new Date(),
            },
          };
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              client.userId &&
              client.userId != userId
            ) {
              client.send(JSON.stringify(viewEndData));
            }
          });
        }
      }
      if (data.type === "ping" && userId) {
        if (onlineUsers.has(userId)) {
          const connection = onlineUsers.get(userId);
          connection.timestamp = Date.now();
          if (data.location && data.location !== connection.location) {
            connection.location = data.location;
            location = data.location;
            ws.location = location;
            await userController.setEnhancedUserOnline(
              userId,
              location,
              sessionId
            );
            await broadcastStatusChange(
              userId,
              true,
              new Date(),
              location,
              sessionId
            );
          }
        }
        ws.send(
          JSON.stringify({
            type: "pong",
            data: {
              timestamp: new Date(),
              location: location,
              sessionId: sessionId,
            },
          })
        );
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  });
  ws.on("close", async () => {
    console.log("Client disconnected");
    if (userId) {
      onlineUsers.delete(userId);
      if (sessionId) {
        sessionUsers.delete(sessionId);
      }
      await userController.setEnhancedUserOffline(userId);
      await broadcastStatusChange(userId, false, new Date(), null, null);
    }
  });
  ws.on("error", async (error) => {
    console.error("WebSocket error:", error);
    if (userId) {
      onlineUsers.delete(userId);
      if (sessionId) {
        sessionUsers.delete(sessionId);
      }
      await userController.setEnhancedUserOffline(userId);
      await broadcastStatusChange(userId, false, new Date(), null, null);
    }
  });
});
setInterval(() => {
  const now = Date.now();
  const TIMEOUT = 60000; 
  
  onlineUsers.forEach(async (connection, userId) => {
    if (now - connection.timestamp > TIMEOUT) {
      onlineUsers.delete(userId);
      if (connection.sessionId) {
        sessionUsers.delete(connection.sessionId);
      }
      await userController.setEnhancedUserOffline(userId);
      await broadcastStatusChange(userId, false, new Date(), null, null);
    }
  });
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
  console.log(`WebSocket server is also running on the same port.`);
});
