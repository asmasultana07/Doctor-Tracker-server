const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");

async function getStats(req, res, next) {
  try {
    const [
      totalDoctors,
      totalPatients,
      patientsPerDoctor,
      conditionBreakdown,
      patientsByDay,
      specializationLoad,
    ] = await Promise.all([
      Doctor.countDocuments(),
      Patient.countDocuments(),
      Patient.aggregate([
        { $group: { _id: "$doctorId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
        {
          $lookup: { from: "doctors", localField: "_id", foreignField: "_id", as: "doctor" },
        },
        { $unwind: "$doctor" },
        { $project: { _id: 0, doctorId: "$_id", name: "$doctor.name", count: 1 } },
      ]),
      Patient.aggregate([{ $group: { _id: "$condition", count: { $sum: 1 } } }]),
      getPatientsByDay(),
      getSpecializationLoad(),
    ]);

    return res.json({
      status: "ok",
      data: {
        totalDoctors,
        totalPatients,
        patientsPerDoctor,
        conditionBreakdown: conditionBreakdown.map((item) => ({
          condition: item._id,
          count: item.count,
        })),
        patientsByDay,
        specializationLoad,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getSpecializationLoad() {
  const [doctorRows, patientRows] = await Promise.all([
    Doctor.aggregate([{ $group: { _id: "$specialization", doctors: { $sum: 1 } } }]),
    Patient.aggregate([
      { $lookup: { from: "doctors", localField: "doctorId", foreignField: "_id", as: "doctor" } },
      { $unwind: "$doctor" },
      { $group: { _id: "$doctor.specialization", patients: { $sum: 1 } } },
    ]),
  ]);

  const map = new Map();
  doctorRows.forEach((row) => map.set(row._id, { specialization: row._id, doctors: row.doctors, patients: 0 }));
  patientRows.forEach((row) => {
    const entry = map.get(row._id) || { specialization: row._id, doctors: 0, patients: 0 };
    entry.patients = row.patients;
    map.set(row._id, entry);
  });

  return Array.from(map.values()).sort((a, b) => b.patients - a.patients);
}

async function getPatientsByDay() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 29);

  const rows = await Patient.aggregate([
    { $match: { createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const countMap = new Map(rows.map((row) => [row._id, row.count]));
  const days = [];
  for (let i = 0; i < 30; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    days.push({ date: key, count: countMap.get(key) || 0 });
  }

  return days;
}

module.exports = { getStats };
