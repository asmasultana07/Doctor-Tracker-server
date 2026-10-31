const mongoose = require("mongoose");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const { parsePagination, buildDateFilter } = require("../utils/query");

async function listDoctors(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req);
    const filter = { ...buildDateFilter(req) };

    if (req.query.search) {
      const term = new RegExp(req.query.search.trim(), "i");
      filter.$or = [{ name: term }, { specialization: term }, { hospital: term }, { email: term }];
    }
    if (req.query.specialization) {
      filter.specialization = req.query.specialization;
    }
    if (req.query.hospital) {
      filter.hospital = req.query.hospital;
    }

    const SORTS = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, name: { name: 1 } };
    const sort = SORTS[req.query.sort] || SORTS.newest;

    const [doctors, total] = await Promise.all([
      Doctor.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Doctor.countDocuments(filter),
    ]);

    const ids = doctors.map((doctor) => doctor._id);
    const counts = await Patient.aggregate([
      { $match: { doctorId: { $in: ids } } },
      { $group: { _id: "$doctorId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));

    const data = doctors.map((doctor) => ({
      ...doctor,
      patientCount: countMap.get(doctor._id.toString()) || 0,
    }));

    return res.json({
      status: "ok",
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

async function getDoctor(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ status: "error", message: "Doctor not found" });
    }

    const doctor = await Doctor.findById(req.params.id).lean();
    if (!doctor) {
      return res.status(404).json({ status: "error", message: "Doctor not found" });
    }

    const patientCount = await Patient.countDocuments({ doctorId: doctor._id });
    return res.json({ status: "ok", data: { ...doctor, patientCount } });
  } catch (error) {
    next(error);
  }
}

async function createDoctor(req, res, next) {
  try {
    const doctor = await Doctor.create({
      name: req.body.name,
      specialization: req.body.specialization,
      hospital: req.body.hospital,
      phone: req.body.phone,
      email: req.body.email,
    });

    return res.status(201).json({ status: "ok", message: "Doctor created", data: doctor });
  } catch (error) {
    next(error);
  }
}

async function listDoctorPatients(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ status: "error", message: "Doctor not found" });
    }

    const doctor = await Doctor.findById(req.params.id).lean();
    if (!doctor) {
      return res.status(404).json({ status: "error", message: "Doctor not found" });
    }

    const { page, limit, skip } = parsePagination(req);
    const filter = { doctorId: doctor._id, ...buildDateFilter(req) };

    if (req.query.condition) {
      filter.condition = req.query.condition;
    }
    if (req.query.search) {
      filter.name = new RegExp(req.query.search.trim(), "i");
    }

    const [patients, total] = await Promise.all([
      Patient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Patient.countDocuments(filter),
    ]);

    return res.json({
      status: "ok",
      doctor: { id: doctor._id, name: doctor.name },
      data: patients,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

async function addDoctorPatient(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ status: "error", message: "Doctor not found" });
    }

    const doctor = await Doctor.findById(req.params.id);
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

    return res.status(201).json({ status: "ok", message: "Patient added", data: patient });
  } catch (error) {
    next(error);
  }
}

async function deleteDoctorPatient(req, res, next) {
  try {
    const { id, patientId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(patientId)) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }

    const patient = await Patient.findOneAndDelete({ _id: patientId, doctorId: id });
    if (!patient) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }

    return res.json({ status: "ok", message: "Patient deleted" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listDoctors,
  getDoctor,
  createDoctor,
  listDoctorPatients,
  addDoctorPatient,
  deleteDoctorPatient,
};
