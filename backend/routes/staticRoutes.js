const express = require("express");
const router = express.Router(); 
const bcrypt = require('bcryptjs');

const Teacher = require("../models/Teacher")
const { getUser, setUser } = require("../service/auth")

// signup (POST) - Teacher registration
router.post('/signup', async (req, res) => {
    console.log(req.body)
  try {
    const { fullName, department, coursesTaught, email, mobileNumber, password } = req.body;

    

    // Basic request validation
    if (!fullName || !department || !coursesTaught || !email || !mobileNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        missingFields: {
          fullName: !fullName,
          department: !department,
          coursesTaught: !coursesTaught,
          email: !email,
          mobileNumber: !mobileNumber,
          password: !password
        }
      });
    }

    // Additional validation for courses array
    if (!Array.isArray(coursesTaught) || coursesTaught.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one course must be specified'
      });
    }

    // Check if teacher with same email already exists
    const existingTeacherByEmail = await Teacher.findOne({ email: email });
    if (existingTeacherByEmail) {
      return res.status(409).json({
        success: false,
        message: 'A teacher with this email address already exists',
        field: 'email'
      });
    }

    // Check if teacher with same mobile number already exists
    const existingTeacherByMobile = await Teacher.findOne({ mobileNumber: mobileNumber  });
    if (existingTeacherByMobile) {
      return res.status(409).json({
        success: false,
        message: 'A teacher with this mobile number already exists',
        field: 'mobileNumber'
      });
    }

    // Clean and process courses taught
    const cleanedCourses = coursesTaught
      .map(course => course.trim())
      .filter(course => course.length > 0);


    // hashing / encrypt password....
    const hashedPassword = await bcrypt.hash(password, 8);

    // Create new teacher
    const newTeacher = await Teacher.create({
      fullName: fullName.trim(),
      department,
      coursesTaught: cleanedCourses,
      email: email.toLowerCase().trim(),
      mobileNumber,
      password: hashedPassword,
      role: "TEACHER",
    });

    res.status(200).json({
      success: true,
      message: 'Teacher account created successfully',
      data: {
        teacher: newTeacher,
        teacherId: newTeacher._id
      }
    });

  } catch (error) {
    console.error('Signup error:', error);

    return res.status(500).json({ error: error.message || 'An error occurred' });
}
  
});

router.post('/login', async (req, res) => {
  const { email, password, rememberMe  } = req.body;

  if (!(email && password)) {
    return res.status(400).json({ message: "Please enter both fields." });
  }

  const teacher = await Teacher.findOne({ email });
  if (!teacher) {
    return res.status(404).json({ message: "User not found. Please sign up first." });
  }

  const isValidPassword = await bcrypt.compare(password, teacher.password);
  if (!isValidPassword) {
    return res.status(401).json({ message: "Incorrect password." });
  }

  let maxAge;
  if (rememberMe) {
    maxAge = 10 * 24 * 60 * 60 * 1000; // 10 days
  } else {
    maxAge = 5 * 24 * 60 * 60 * 1000; // 5 days
  }

  // Token generation logic
  const token = setUser(teacher);
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: maxAge,
  });

   // Switching to Bearer tokens
  return res.status(200).json({ message: "Login successful", token});
});




module.exports = router;