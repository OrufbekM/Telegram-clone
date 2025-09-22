module.exports = {
  HOST: "localhost",
  USER: "postgres",
  PASSWORD: "0919",
  DB: "chatdb",
  dialect: "postgres",
  jwtSecret: "6f127606e61430f12e386b86317ab19d",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

