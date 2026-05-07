// scripts/seedAttendance.js

// Just to manually add the data
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');

async function run() {
   try {
          await mongoose.connect('mongodb+srv://pratikpantawane17_db_user:dbUserPratik17@cluster0.e6behcu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
          console.log("Connected to MongoDB");
      } catch(err) {
          console.log("Error while Connecting of DB !", err);
      }

  const attendanceDoc = new Attendance({
    courseId: new mongoose.Types.ObjectId('656565656565656565656565'), // ✅ use 'new'
    classId: new mongoose.Types.ObjectId('666666666666666666666666'),
    lectureId: new mongoose.Types.ObjectId('677777777777777777777777'),
    sessionDate: new Date('2025-11-03T09:00:00Z'),
    sessionType: 'lecture',
    entries: [
      {
        studentId: new mongoose.Types.ObjectId('5f1d7f3e1c9d440000a00001'),
        status: 'present',
        attendanceType: 'normal',
        markedAt: new Date('2025-11-03T08:59:30Z'),
        markedBy: null,
        markMethod: 'manual'
      },
      {
        studentId: new mongoose.Types.ObjectId('5f1d7f3e1c9d440000a00002'),
        status: 'absent',
        attendanceType: 'normal',
        markedAt: new Date('2025-11-03T09:05:00Z'),
        markMethod: 'manual'
      },
      {
        studentId: new mongoose.Types.ObjectId('5f1d7f3e1c9d440000a00003'),
        status: 'present',
        attendanceType: 'normal',
        markedAt: new Date('2025-11-03T09:02:00Z'),
        markMethod: 'manual'
      }
    ],
    meta: { totalMarked: 2, totalPresent: 2, totalAbsent: 1 }
  });

  const saved = await attendanceDoc.save();
  console.log('✅ Seeded attendance id:', saved._id.toString());
  await mongoose.disconnect();
}

run().catch(console.error);
