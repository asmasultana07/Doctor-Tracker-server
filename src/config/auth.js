const ACCESS_COOKIE_NAME = "doctor_tracker_access";
const REFRESH_COOKIE_NAME = "doctor_tracker_refresh";

function parseDuration(value, fallbackMs) {
  const match = String(value || "").trim().match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) {
    return fallbackMs;
  }

  const unitMilliseconds = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return Number(match[1]) * unitMilliseconds[match[2].toLowerCase()];
}

function baseCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = process.env.COOKIE_SAME_SITE || (isProduction ? "none" : "lax");

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    path: "/",
  };
}

function getAccessCookieOptions() {
  return {
    ...baseCookieOptions(),
    maxAge: parseDuration(process.env.JWT_ACCESS_EXPIRES_IN, 15 * 60 * 1000),
  };
}

function getRefreshCookieOptions() {
  return {
    ...baseCookieOptions(),
    maxAge: parseDuration(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000),
  };
}

module.exports = {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getAccessCookieOptions,
  getRefreshCookieOptions,
};
