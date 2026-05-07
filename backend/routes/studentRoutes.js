import express from 'express';
import Student from '../models/Student.js';
import Timetable from '../models/Timetable.js';
import moment from 'moment';

const router = express.Router();

// Helper function to convert client's day number (0-6) to a database day string.
const getDayString = (dayNumber) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[parseInt(dayNumber)];
};

// Helper function to convert HH:MM string to minutes past midnight. Returns null on failure.
const timeToMinutes = (timeString) => {
    // Aggressively clean the string to handle potential extra characters/spaces
    const cleanedTimeString = timeString ? timeString.replace(/[^\d:]/g, '').trim() : null;
    if (!cleanedTimeString) return null;

    const parts = cleanedTimeString.split(':');
    if (parts.length !== 2) return null;

    const [hours, minutes] = parts.map(Number);
    // Basic validation check
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

    return (hours * 60) + minutes;
};


// --- UNIFIED API: Fetch Today's Filtered Timetable ---
router.get('/timetable/today', async (req, res) => {
    try {
        const { day } = req.query;

        if (day === undefined) {
            return res.status(400).json({ message: 'Day parameter is required for today\'s timetable.' });
        }

        const dayString = getDayString(day);


        // 1. Fetch data filtered ONLY BY DAY OF WEEK
        const rawLectures = await Timetable.find({
            daysOfWeek: dayString,
        })
            .sort({ time: 1 })
            .lean();

        // CRITICAL DEBUG: Print the raw array before returning



        // *** WARNING: THIS API NOW RETURNS RAW DB OBJECTS TO THE CLIENT ***
        // This will likely cause a crash in the app, but it is necessary to see the data.
        const formattedLectures = rawLectures.map(lec => ({
            subject: lec.subject || lec.courseName || "Unknown Subject",
            time: lec.time || lec.startTime || "00:00",
            professor: lec.professor || lec.teacher || "TBA",
            isActive: lec.isActive
        }));

        return res.status(200).json(formattedLectures);
    } catch (error) {
        console.error("API Error (Raw Data Test):", error);
        res.status(500).json({ message: 'Server error during raw data test.' });
    }
});



// --- Existing Authentication Routes ---
router.post('/signup', async (req, res) => {
    try {
        const {
            studentName, studentEmail, studentPRN, department, classYear,
            studentMobile, password, parentEmail, parentMobile, deviceId,
        } = req.body;

        if (!studentName || !studentEmail || !password || !deviceId) {
            return res.status(400).json({ message: 'Missing required signup fields.' });
        }

        // Check if account already bound to this device
        const existingDevice = await Student.findOne({ deviceId });
        if (existingDevice) {
            return res.status(400).json({ message: 'Account already created on this device' });
        }

        // Check if email already registered
        const existingUser = await Student.findOne({ studentEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const newStudent = new Student({
            studentName,
            studentEmail,
            studentPRN,
            department,
            classYear,
            studentMobile,
            password,
            parentEmail,
            parentMobile,
            deviceId,
        });

        await newStudent.save();
        res.status(201).json({ message: 'Signup successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { studentEmail, password, deviceId } = req.body;

        if (!studentEmail || !password || !deviceId) {
            return res.status(400).json({ message: 'Missing required login fields.' });
        }

        const student = await Student.findOne({ studentEmail });

        if (!student) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check password (in real project use bcrypt)
        if (student.password !== password) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        // Device binding logic
        if (student.deviceId && student.deviceId !== deviceId) {
            return res.status(403).json({
                message: 'This account is already bound to another device.',
            });
        }

        // If account has no deviceId (first login after signup)
        if (!student.deviceId) {
            student.deviceId = deviceId;
            await student.save();
        }

        // Return student details for client to save in Async Storage
        const studentDetails = {
            studentName: student.studentName,
            studentEmail: student.studentEmail,
            studentPRN: student.studentPRN,
            department: student.department,
            classYear: student.classYear,
            studentMobile: student.studentMobile,
            parentEmail: student.parentEmail,
            parentMobile: student.parentMobile,
        };

        return res.status(200).json({ message: 'Login successful', student: studentDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
