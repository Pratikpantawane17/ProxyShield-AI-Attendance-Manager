const express = require("express");
const router = express.Router(); 

const Teacher= require("../models/Teacher")
const Timetable = require("../models/Timetable")

// ✅ Import agenda instance directly
const agenda = require("../jobs/agenda");
require('../jobs/lectureNotification.job');   // ensure somthing -->


router.get('/homepage', (req, res) => {
    try {
        return res.status(200).json({
            message: "Correct"
        })
    } catch (error) {
        console.log("Error : ", error)
        return res.status(500).json({
            message: "Wrong"
        })
    }
})


// POST /teacher/save-fcm-token
router.post('/save-fcm-token', async (req, res) => {
  try {
    console.log('save-fcm-token body:', req.body); // debug

    const { token } = req.body;
    const userId = req.user._id;
    console.log("userId", userId);
    
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    if (!token) return res.status(400).json({ message: 'No token provided' });

    // addToSet prevents duplicates
    await Teacher.findByIdAndUpdate(userId, { $addToSet: { fcmTokens: token } });

    return res.json({ message: 'Token saved' });
  } catch (err) {
    console.error('save-fcm-token error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});



// Timetable Routes

// Helper Funct : return array of Date objects between start & end inclusive that match weekdaysArray
function getAllDatesForWeekdaysBetween(startDateStr, endDateStr, weekdaysArray) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  start.setHours(0,0,0,0);
  end.setHours(23,59,59,999);

  const targetWeekdays = new Set(weekdaysArray.map(d => d.toLowerCase()));
  const res = [];
  const cur = new Date(start);
  while (cur <= end) {
    const dayName = cur.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    if (targetWeekdays.has(dayName)) {
      res.push(new Date(cur)); // snapshot
    }
    cur.setDate(cur.getDate() + 1);
  }
  return res;
}

function subtractMinutes(date, mins) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - mins);
  return d;
}


// POST /timetable/bulk
router.post('/timetable/bulk', async (req, res) => {
  try {
    const { lectures } = req.body;
    const teacherId = req.user && req.user._id;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    if (!Array.isArray(lectures) || lectures.length === 0) {
      return res.status(400).json({ success: false, message: 'No lectures provided' });
    }

    // Attach teacherId to each lecture doc
    const lecturesToSave = lectures.map(lecture => ({
      ...lecture,
      teacherId
    }));

    // Bulk insert
    const savedLectures = await Timetable.insertMany(lecturesToSave, { ordered: true });
    const ids = savedLectures.map(l => l._id);

    // For each saved lecture schedule a job for each occurrence
    for (const saved of savedLectures) {
      // Skip if lecture notifications disabled
      if (saved.isActive === false) continue;

      // compute all dates between start and end which match the daysOfWeek
      const occurrenceDates = getAllDatesForWeekdaysBetween(saved.dateRange.startDate, saved.dateRange.endDate, saved.daysOfWeek);

      // parse lecture time "HH:mm"
      const [hhStr, mmStr] = (saved.time || '00:00').split(':');
      const hh = parseInt(hhStr || '0', 10);
      const mm = parseInt(mmStr || '0', 10);

      for (const dateOnly of occurrenceDates) {
        // set lecture datetime
        const lectureDateTime = new Date(dateOnly);
        lectureDateTime.setHours(hh, mm, 0, 0);

        // notification at lecture time - 30 minutes
        const notifyAt = subtractMinutes(lectureDateTime, 30);

        // only schedule future notifications
        if (notifyAt > new Date()) {
          // store lectureId as string (Agenda serializes JSON)
          await agenda.schedule(notifyAt, 'send lecture reminder', { lectureId: saved._id.toString() });
          console.log(`Scheduled reminder for lecture ${saved._id} at ${notifyAt.toISOString()} (lecture at ${lectureDateTime.toISOString()})`);
        } else {
          // optionally log skipped past times
          console.log(`Skipped scheduling past notify time for lecture ${saved._id} at ${notifyAt.toISOString()}`);
        }
      }
    }

    return res.status(201).json({ success: true, message: 'Lectures saved and reminders scheduled', ids });
  } catch (err) {
    console.error('Error in /timetable/bulk:', err);
    return res.status(500).json({ success: false, message: 'Failed to save lectures' });
  }
});


// reschedule & cancel



// ye wala badme aayga...
//  deleting a lecture
// DELETE /timetable/:id
router.delete('/timetable/:id', async (req, res) => {
  try {
    const lectureId = req.params.id;  
    const teacherId = req.user && req.user._id;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    // Cancel all agenda jobs created for this lectureId
    // We attempt cancellation by string and by ObjectId (some stores may have stored id differently).
    try {
      await agenda.cancel({ 'data.lectureId': lectureId });
      // also try objectId form (safe guard)
      try {
        await agenda.cancel({ 'data.lectureId': mongoose.Types.ObjectId(lectureId) });
      } catch (_) { /* ignore if invalid ObjectId */ }
      console.log(`Cancelled agenda jobs for lectureId ${lectureId}`);
    } 
    catch (cancelErr) {
      console.warn('agenda.cancel error (continuing):', cancelErr);
    }

    // Delete the lecture document for this teacher
    const deletedLecture = await Timetable.findOneAndDelete({ _id: lectureId, teacherId });
    if (!deletedLecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    return res.status(200).json({ success: true, message: 'Lecture deleted (and related jobs canceled)' });
  } 
  catch (err) {
    console.error('Error deleting lecture:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete lecture' });
  }
});









module.exports = router;


