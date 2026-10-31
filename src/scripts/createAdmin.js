const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDatabase = require("../config/db");
const Admin = require("../models/Admin");

dotenv.config();

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured in backend/.env.");
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long.");
  }

  await connectDatabase();

  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) {
    throw new Error("An admin with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await Admin.create({ email, password: hashedPassword });

  console.log(`Admin created successfully for ${email}.`);
}

createAdmin()
  .catch((error) => {
    console.error(`Admin creation failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
