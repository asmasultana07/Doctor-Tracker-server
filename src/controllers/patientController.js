const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const { parsePagination, buildDateFilter } = require("../utils/query");

async function listPatients(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req);
    const filter = { ...buildDateFilter(req) };

    if (req.query.condition) {
      filter.condition = req.query.condition;
    }
    if (req.query.gender) {
      filter.gender = req.query.gender;
    }
    if (req.query.doctorId && mongoose.isValidObjectId(req.query.doctorId)) {
      filter.doctorId = req.query.doctorId;
    }
    if (req.query.search) {
      const term = new RegExp(req.query.search.trim(), "i");
      filter.$or = [{ name: term }, { email: term }, { phone: term }];
    }

    const SORTS = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, name: { name: 1 } };
    const sort = SORTS[req.query.sort] || SORTS.newest;

    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("doctorId", "name specialization")
        .lean(),
      Patient.countDocuments(filter),
    ]);

    return res.json({
      status: "ok",
      data: patients,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

async function createPatient(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.body.doctorId)) {
      return res.status(400).json({ status: "error", message: "A valid doctor is required" });
    }

    const doctor = await Doctor.findById(req.body.doctorId);
    if (!doctor) {
      return res.status(404).json({ status: "error", message: "Doctor not found" });
    }

    const patient = await Patient.create({
      name: req.body.name,
      age: req.body.age,
      gender: req.body.gender,
      phone: req.body.phone,
      email: req.body.email,
      condition: req.body.condition,
      doctorId: doctor._id,
    });

    return res.status(201).json({ status: "ok", message: "Patient created", data: patient });
  } catch (error) {
    next(error);
  }
}

async function getPatient(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }

    const patient = await Patient.findById(req.params.id)
      .populate("doctorId", "name specialization")
      .lean();
    if (!patient) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }

    return res.json({ status: "ok", data: patient });
  } catch (error) {
    next(error);
  }
}

async function updatePatient(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }

    const updates = {};
    ["name", "age", "gender", "phone", "email", "condition", "doctorId"].forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const patient = await Patient.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("doctorId", "name specialization");

    if (!patient) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }

    return res.json({ status: "ok", message: "Patient updated", data: patient });
  } catch (error) {
    next(error);
  }
}

async function deletePatient(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }

    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }

    return res.json({ status: "ok", message: "Patient deleted" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPatients,
  createPatient,
  getPatient,
  updatePatient,
  deletePatient,
};
