const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDatabase = require("../config/db");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");

dotenv.config();

const DOCTORS = [
  { name: "Dr. Sarah Ahmed", specialization: "Cardiology", hospital: "City General" },
  { name: "Dr. Imran Hossain", specialization: "Neurology", hospital: "Metro Medical" },
  { name: "Dr. Nadia Rahman", specialization: "Pediatrics", hospital: "Sunrise Clinic" },
  { name: "Dr. Tanvir Alam", specialization: "Orthopedics", hospital: "City General" },
  { name: "Dr. Farhana Khan", specialization: "Dermatology", hospital: "Metro Medical" },
];

const CONDITIONS = ["Stable", "Critical", "Under Observation"];
const GENDERS = ["Male", "Female"];

function pick(list, index) {
  return list[index % list.length];
}

async function seed() {
  await connectDatabase();
  await Promise.all([Doctor.deleteMany({}), Patient.deleteMany({})]);

  const doctors = await Doctor.insertMany(
    DOCTORS.map((doctor, index) => ({
      ...doctor,
      phone: `0170000000${index}`,
      email: `${doctor.name.split(" ")[1].toLowerCase()}@doctortracker.test`,
    })),
  );

  const patients = [];
  let counter = 0;
  doctors.forEach((doctor, doctorIndex) => {
    const total = 4 + doctorIndex;
    for (let i = 0; i < total; i += 1) {
      const daysAgo = (counter * 2) % 30;
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      patients.push({
        name: `Patient ${counter + 1}`,
        age: 18 + ((counter * 7) % 60),
        gender: pick(GENDERS, counter),
        phone: `0190000${String(counter).padStart(4, "0")}`,
        email: `patient${counter + 1}@doctortracker.test`,
        condition: pick(CONDITIONS, counter),
        doctorId: doctor._id,
        createdAt,
      });
      counter += 1;
    }
  });

  await Patient.insertMany(patients);
  console.log(`Seeded ${doctors.length} doctors and ${patients.length} patients.`);
}

seed()
  .catch((error) => {
    console.error(`Seeding failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
