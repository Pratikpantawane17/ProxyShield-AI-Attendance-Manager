// backend/jobs/lectureNotification.job.js
const agenda = require('./agenda');
const admin = require('../firebase/firebaseAdmin');
const Timetable = require('../models/Timetable');
const Teacher = require('../models/Teacher');

// concurrency: 10 --> parallely kitne jobs challayga Agenda 
agenda.define('send lecture reminder', { priority: 'high', concurrency: 10 }, async (job, done) => {
  const { lectureId } = job.attrs.data;
  try {
    const lecture = await Timetable.findById(lectureId).populate('teacherId');
    if (!lecture) {
      console.log('Lecture not found for job', lectureId);
      return done();
    }

    const teacher = lecture.teacherId;
    if (!teacher) {
      console.log('Teacher not found for lecture', lectureId);
      return done();
    }

    // Get tokens array and deduplicate/clean
    let tokens = Array.isArray(teacher.fcmTokens) ? [...new Set(teacher.fcmTokens)] : [];
    tokens = tokens.filter(Boolean);

    if (!tokens.length) {
      console.log(`No FCM tokens for teacher ${teacher._id}`);
      return done();
    }

    // Prepare message
    const message = {
      tokens: tokens, // for sendMulticast use "tokens" field
      notification: { 
        title: `Upcoming Lecture - ${lecture.subject}`,
        body: `Your ${lecture.subject} lecture is at ${lecture.time}.`,
      },
      data: {
        lectureId: lecture._id.toString(),
        subject: lecture.subject,
      }
    };
    
    // sendMulticast supports up to 500 tokens
    console.log('admin.messaging typeof:', typeof admin.messaging);
    try {
      const messaging = admin.messaging();
      console.log('messaging object methods:', Object.keys(messaging).filter(k => typeof messaging[k] === 'function'));
      console.log('sendMulticast available:', typeof messaging.sendMulticast);
    } catch (dbgErr) {
      console.error('admin.messaging() threw:', dbgErr);
    }


    console.log("Message --> ", message);
    // const response = await admin.messaging().sendMulticast(message);
    // console.log(`sendMulticast: success=${response.successCount} failure=${response.failureCount}`);


    // here changed -->
    const messaging = admin.messaging();
    let response;

    // prefer sendMulticast if available
    if (typeof messaging.sendMulticast === 'function') {
      response = await messaging.sendMulticast(message);
      console.log(`sendMulticast: success=${response.successCount} failure=${response.failureCount}`);
    } else if (typeof messaging.send === 'function') {
      // fallback: send one-by-one (slower)
      const results = await Promise.all(tokens.map(t =>
        messaging.send({ token: t, notification: message.notification, data: message.data })
          .then(r => ({ success: true, result: r }))
          .catch(e => ({ success: false, error: e }))
      ));
      response = {
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        responses: results.map(r => r.success ? { success: true } : { success: false, error: r.error })
      };
      console.log(`send (per-token) summary: success=${response.successCount} failure=${response.failureCount}`);
    } else if (typeof messaging.sendToDevice === 'function') {
      // legacy API
      response = await messaging.sendToDevice(tokens, { notification: message.notification, data: message.data });
      console.log('sendToDevice response:', response);
      // normalize response for later handling
      response = {
        successCount: response.successCount || 0,
        failureCount: response.failureCount || 0,
        responses: response.results || []
      };
    } else {
      throw new Error('No usable messaging send function found on admin.messaging()');
    }

    //  console.log('notification response:', { successCount: response.successCount, failureCount: response.failureCount });

    // If some tokens failed, remove invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((r, idx) => {
        if (!r.success) {
          const err = r.error;
          // common invalid token codes: messaging/registration-token-not-registered, messaging/invalid-registration-token
          if (err && (err.code === 'messaging/registration-token-not-registered' ||
                      err.code === 'messaging/invalid-registration-token' ||
                      err.code === 'messaging/invalid-argument')) {
            tokensToRemove.push(tokens[idx]);
          } else {
            console.warn('FCM send error for token:', tokens[idx], err && err.code);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        // Pull all bad tokens
        await Teacher.findByIdAndUpdate(teacher._id, { $pull: { fcmTokens: { $in: tokensToRemove } } });
        console.log('Removed invalid tokens for teacher', teacher._id, tokensToRemove);
      }
    }

    done();
  } catch (err) {
    console.error('Error in send lecture reminder job', err);
    done(err);  
  }
});
