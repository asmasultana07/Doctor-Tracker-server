const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { ACCESS_COOKIE_NAME } = require("../config/auth");

async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies && req.cookies[ACCESS_COOKIE_NAME];

    if (!token || !process.env.JWT_SECRET) {
      return res.status(401).json({ status: "error", message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.sub).select("-password");

    if (!admin) {
      return res.status(401).json({ status: "error", message: "Authentication required" });
    }

    req.user = {
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ status: "error", message: "Authentication required" });
  }
}

module.exports = authMiddleware;
