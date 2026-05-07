const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentName: String,
  studentEmail: { type: String, unique: true },
  studentPRN: String,
  department: String,
  classYear: String,
  studentMobile: String,
  password: String,
  parentEmail: String,
  parentMobile: String,
  deviceId: { type: String, unique: true },
}, { collection: 'students' }); // This line is PERFECT. Keep it.

module.exports = mongoose.model('Student', studentSchema);