const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../models");
const config = require("../config/db.config.js");
const User = db.users;
exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required!",
      });
    }
    const existingUser = await User.findOne({
      where: {
        [db.Sequelize.Op.or]: [{ username }, { email }],
      },
    });
    if (existingUser) {
      return res.status(400).json({
        message: "Username or email already exists!",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      avatar: req.file ? `/uploads/avatars/${req.file.filename}` : null,
    });
    res.status(201).json({
      message: "User registered successfully!",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({
      message: err.message || "Some error occurred during registration.",
    });
  }
};
exports.signin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required!",
      });
    }
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }
    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({
        message: "Invalid password!",
      });
    }
    const token = jwt.sign(
      { id: user.id },
      config.jwtSecret,
      { expiresIn: 86400 }
    );
    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      accessToken: token,
    });
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({
      message: err.message || "Some error occurred during sign in.",
    });
  }
};

