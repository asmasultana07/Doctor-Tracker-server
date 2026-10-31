const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");

const router = express.Router();

router.post(
  "/login",
  [
    body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
    body("password").isString().notEmpty().withMessage("Password is required"),
    validate,
  ],
  authController.login,
);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authMiddleware, authController.getCurrentAdmin);

module.exports = router;
