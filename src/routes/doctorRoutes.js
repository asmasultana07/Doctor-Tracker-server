const express = require("express");
const { body } = require("express-validator");
const doctorController = require("../controllers/doctorController");
const authMiddleware = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");

const router = express.Router();

const doctorValidators = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("specialization").trim().notEmpty().withMessage("Specialization is required"),
  body("hospital").trim().notEmpty().withMessage("Hospital is required"),
  body("phone").trim().notEmpty().withMessage("Phone is required"),
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  validate,
];

const patientValidators = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("age").isInt({ min: 0, max: 120 }).withMessage("Age must be between 0 and 120"),
  body("gender").trim().notEmpty().withMessage("Gender is required"),
  body("phone").trim().notEmpty().withMessage("Phone is required"),
  body("condition")
    .isIn(["Stable", "Critical", "Under Observation"])
    .withMessage("Invalid condition"),
  validate,
];

router.use(authMiddleware);

router.get("/", doctorController.listDoctors);
router.post("/", doctorValidators, doctorController.createDoctor);
router.get("/:id", doctorController.getDoctor);
router.get("/:id/patients", doctorController.listDoctorPatients);
router.post("/:id/patients", patientValidators, doctorController.addDoctorPatient);
router.delete("/:id/patients/:patientId", doctorController.deleteDoctorPatient);

module.exports = router;
