const express = require("express");
const { body } = require("express-validator");
const patientController = require("../controllers/patientController");
const authMiddleware = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");

const router = express.Router();

const createValidators = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("age").isInt({ min: 0, max: 120 }).withMessage("Age must be between 0 and 120"),
  body("gender").trim().notEmpty().withMessage("Gender is required"),
  body("phone").trim().notEmpty().withMessage("Phone is required"),
  body("condition")
    .isIn(["Stable", "Critical", "Under Observation"])
    .withMessage("Invalid condition"),
  body("doctorId").notEmpty().withMessage("Doctor is required"),
  validate,
];

const updateValidators = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("age").optional().isInt({ min: 0, max: 120 }).withMessage("Age must be between 0 and 120"),
  body("gender").optional().trim().notEmpty().withMessage("Gender cannot be empty"),
  body("phone").optional().trim().notEmpty().withMessage("Phone cannot be empty"),
  body("condition")
    .optional()
    .isIn(["Stable", "Critical", "Under Observation"])
    .withMessage("Invalid condition"),
  validate,
];

router.use(authMiddleware);

router.get("/", patientController.listPatients);
router.post("/", createValidators, patientController.createPatient);
router.get("/:id", patientController.getPatient);
router.put("/:id", updateValidators, patientController.updatePatient);
router.delete("/:id", patientController.deletePatient);

module.exports = router;
