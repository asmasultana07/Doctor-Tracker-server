const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const RefreshToken = require("../models/RefreshToken");
const {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getAccessCookieOptions,
  getRefreshCookieOptions,
} = require("../config/auth");

function getSafeAdmin(admin) {
  return {
    id: admin._id.toString(),
    email: admin.email,
    role: admin.role,
  };
}

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`;
}

async function issueTokens(admin, res) {
  const accessToken = jwt.sign(
    { sub: admin._id.toString(), role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" },
  );

  const jti = crypto.randomUUID();
  const refreshToken = jwt.sign(
    { sub: admin._id.toString(), role: admin.role, jti },
    getRefreshSecret(),
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" },
  );

  const expiresAt = new Date(Date.now() + getRefreshCookieOptions().maxAge);
  await RefreshToken.create({ jti, admin: admin._id, expiresAt });

  res.cookie(ACCESS_COOKIE_NAME, accessToken, getAccessCookieOptions());
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE_NAME, getAccessCookieOptions());
  res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
}

async function login(req, res, next) {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ status: "error", message: "Authentication is not configured" });
    }

    const email = req.body.email.trim().toLowerCase();
    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin || !(await bcrypt.compare(req.body.password, admin.password))) {
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }

    await issueTokens(admin, res);

    return res.json({ status: "ok", message: "Login successful", admin: getSafeAdmin(admin) });
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies && req.cookies[REFRESH_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ status: "error", message: "Authentication required" });
    }

    const decoded = jwt.verify(token, getRefreshSecret());
    const stored = await RefreshToken.findOneAndDelete({ jti: decoded.jti, admin: decoded.sub });
    const admin = stored && (await Admin.findById(decoded.sub));

    if (!admin) {
      clearAuthCookies(res);
      return res.status(401).json({ status: "error", message: "Authentication required" });
    }

    await issueTokens(admin, res);
    return res.json({ status: "ok", message: "Token refreshed", admin: getSafeAdmin(admin) });
  } catch (error) {
    clearAuthCookies(res);
    return res.status(401).json({ status: "error", message: "Authentication required" });
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies && req.cookies[REFRESH_COOKIE_NAME];
    if (token) {
      const decoded = jwt.decode(token);
      if (decoded && decoded.jti) {
        await RefreshToken.deleteOne({ jti: decoded.jti });
      }
    }

    clearAuthCookies(res);
    return res.json({ status: "ok", message: "Logout successful" });
  } catch (error) {
    next(error);
  }
}

function getCurrentAdmin(req, res) {
  return res.json({ status: "ok", admin: req.user });
}

module.exports = {
  login,
  refresh,
  logout,
  getCurrentAdmin,
};
