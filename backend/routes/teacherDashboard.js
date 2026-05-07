// routes/teacherDashboard.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// === TEMPORARY COURSE MODEL FOR DROPDOWN ===
// Since you don't have a course file, we define a quick schema here
// so we can fetch the "Data Structures" subject we added to DB.
const CourseSchema = new mongoose.Schema({
    name: String,
    code: String,
    department: String,
    year: String
}, { collection: 'courses' });
// Check if model exists to prevent overwrite error
const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);


// ==========================================
// 0. AUTH PROFILE (MOCK FOR DEMO)
// Route: /auth/profile
// ==========================================
router.get('/auth/profile', (req, res) => {
    // 🔒 MOCK RESPONSE
    // This tricks the frontend into thinking a teacher is logged in.
    // We return a static dummy ID.
    res.json({
        userId: "656200000000000000000000", // Dummy Teacher ObjectId
        name: "Professor Sharma",
        email: "teacher@walchandsangli.ac.in",
        role: "teacher",
        department: "CSE"
    });
});

// ==========================================
// 1. GET SUBJECTS (Modified for Demo)
// ==========================================
router.get('/subjects', async (req, res) => {
    try {
        const { year, branch } = req.query;

        // 🔴 Debug Logs: View these in your VS Code Terminal
        console.log("--------------------------------");
        console.log("Incoming Request Query:", req.query); 
        console.log(`Searching for -> Year: "${year}", Dept: "${branch}"`);


        // Fetch from the 'courses' collection we created in Atlas
        const subjects = await Course.find({ 
            year: year, 
            department: branch 
        });

        console.log("subjects --> ", subjects);
        
        res.json(subjects);
    } catch (error) {
        console.error("Subject Fetch Error:", error);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ==========================================
// 2. GET STUDENTS COUNT
// ==========================================
router.get('/students/count', async (req, res) => {
    try {
        const { year, department } = req.query;
        // Mapping frontend 'year'/'branch' to schema 'classYear'/'department'
        console.log("Reach to Students count");
        
        const count = await Student.countDocuments({ 
            classYear: year, 
            department: department 
        });

        console.log("Count --> ", count);
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// ==========================================
// 3. GET ATTENDANCE SUMMARY
// ==========================================
router.get('/attendance/summary', async (req, res) => {
    try {
        const { subjectId, from, to } = req.query;
        const threshold = 75;

        const stats = await calculateAttendanceStats(subjectId, from, to);
        
        const totalPercentage = stats.reduce((acc, curr) => acc + curr.attendancePercentage, 0);
        const avgAttendance = stats.length ? (totalPercentage / stats.length) : 0;
        const defaulterCount = stats.filter(s => s.attendancePercentage < threshold).length;

        res.json({ avgAttendance, defaulterCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ==========================================
// 4. GET DEFAULTER LIST
// ==========================================
router.get('/attendance/defaulters', async (req, res) => {
    try {
        const { subjectId, from, to, threshold } = req.query;
        const limit = parseFloat(threshold) || 75;
        const stats = await calculateAttendanceStats(subjectId, from, to);
        const defaulters = stats.filter(s => s.attendancePercentage < limit);
        res.json({ defaulters });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// ==========================================
// 5. EXPORT EXCEL
// ==========================================
router.get('/attendance/export/excel', async (req, res) => {
    try {
        const { subjectId, from, to, threshold, department, year } = req.query;
        const limit = parseFloat(threshold) || 75;
        const stats = await calculateAttendanceStats(subjectId, from, to);
        const defaulters = stats.filter(s => s.attendancePercentage < limit);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Defaulters');

        worksheet.columns = [
            { header: 'PRN/Roll', key: 'rollNumber', width: 15 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Total', key: 'total', width: 10 },
            { header: 'Present', key: 'present', width: 10 },
            { header: '%', key: 'attendancePercentage', width: 10 },
        ];

        defaulters.forEach(s => {
            worksheet.addRow({
                rollNumber: s.rollNumber, // This comes from studentPRN
                name: s.name,             // This comes from studentName
                total: s.total,
                present: s.present,
                attendancePercentage: s.attendancePercentage.toFixed(1) + '%'
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Defaulters.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// ==========================================
// 6. EXPORT PDF
// ==========================================
router.get('/attendance/export/pdf', async (req, res) => {
    try {
        const { subjectId, from, to, threshold, department, year } = req.query;
        const limit = parseFloat(threshold) || 75;
        const stats = await calculateAttendanceStats(subjectId, from, to);
        const defaulters = stats.filter(s => s.attendancePercentage < limit);

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Defaulters.pdf`);
        doc.pipe(res);

        doc.fontSize(20).text(`Defaulter List (Below ${limit}%)`, { align: 'center' });
        doc.moveDown();
        
        // Simple Table
        let y = 150;
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('PRN', 50, y);
        doc.text('Name', 150, y);
        doc.text('Stats', 350, y);
        doc.text('%', 450, y);
        
        y += 25;
        doc.font('Helvetica');

        defaulters.forEach(s => {
            doc.text(s.rollNumber, 50, y);
            doc.text(s.name, 150, y);
            doc.text(`${s.present}/${s.total}`, 350, y);
            doc.fillColor('red').text(`${s.attendancePercentage.toFixed(1)}%`, 450, y).fillColor('black');
            y += 25;
        });

        doc.end();
    } catch (error) {
        res.status(500).json({ error: 'PDF failed' });
    }
});

// ==========================================
// UPDATED AGGREGATION PIPELINE
// ==========================================
async function calculateAttendanceStats(subjectId, from, to) {
    const matchStage = {
        courseId: new mongoose.Types.ObjectId(subjectId)
    };

    if (from || to) {
        matchStage.sessionDate = {};
        if (from) matchStage.sessionDate.$gte = new Date(from);
        if (to) matchStage.sessionDate.$lte = new Date(to);
    }

    const stats = await Attendance.aggregate([
        { $match: matchStage },
        { $unwind: '$entries' },
        {
            $group: {
                _id: '$entries.studentId',
                totalClasses: { $sum: 1 },
                presentClasses: {
                    $sum: {
                        $cond: [{ $eq: ['$entries.status', 'present'] }, 1, 0]
                    }
                }
            }
        },
        // LOOKUP: Join with 'Student' collection
        {
            $lookup: {
                from: 'students', // Matches your mongoose.model('Student')
                localField: '_id',
                foreignField: '_id',
                as: 'studentInfo'
            }
        },
        { $unwind: '$studentInfo' },
        // PROJECT: Map schema fields to Frontend expectations
        {
            $project: {
                _id: 1,
                name: '$studentInfo.studentName', // Map studentName -> name
                rollNumber: '$studentInfo.studentPRN', // Map studentPRN -> rollNumber
                total: '$totalClasses',
                present: '$presentClasses',
                attendancePercentage: {
                    $multiply: [
                        { $divide: ['$presentClasses', '$totalClasses'] },
                        100
                    ]
                }
            }
        },
        { $sort: { rollNumber: 1 } }
    ]);

    return stats;
}

module.exports = router;