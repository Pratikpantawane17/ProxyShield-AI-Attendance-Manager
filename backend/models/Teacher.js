const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: {
      values: ['CSE', 'IT', 'ECE', 'ME', 'CE', 'EE', 'CHE', 'BT', 'MATH', 'PHYSICS', 'CHEMISTRY'],
      message: 'Please select a valid department'
    }
  },
  
  coursesTaught: {
    type: [String],
    required: [true, 'At least one course must be specified'],
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
  },
  role: {
    type: String,
  },

  // for FCM
  fcmTokens: { type: [String], default: [] },

}, 
{
    timestamps: true,
});


module.exports = mongoose.model('teacher', teacherSchema);