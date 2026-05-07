// models/attendance.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * AttachmentSchema
 * - used to store files uploaded when teacher updates attendance (medical certificate, leave letter, ...)
 * - keep storageType and fileUrl (S3/Cloud/GridFS/URL). Optionally store checksum.
 */
const AttachmentSchema = new Schema({
  filename:         { type: String, required: true },
  storageType:      { type: String, enum: ['s3','gridfs','local','url'], default: 's3' },
  fileUrl:          { type: String, required: true }, // link or gridfs id as string
  mimeType:         { type: String },
  size:             { type: Number, min: 0 }, // bytes
  uploadedBy:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt:       { type: Date, default: Date.now },
  checksum:         { type: String } // optional (sha256) to detect tampering
}, { _id: false });

/**
 * AttendanceEntry update history (embedded)
 * - small history of manual updates done by teacher/admin for that entry
 * - attachments is an array of AttachmentSchema
 */
const EntryUpdateSchema = new Schema({
  previousStatus:   { type: String, enum: ['present','absent','late','on_leave','excused','other'], required: true },
  newStatus:        { type: String, enum: ['present','absent','late','on_leave','excused','other'], required: true },
  previousType:     { type: String, enum: ['normal','sick','leave','excused','other', null], default: null },
  newType:          { type: String, enum: ['normal','sick','leave','excused','other', null], default: null },
  changedBy:        { type: Schema.Types.ObjectId, ref: 'User', required: true }, // teacher/admin
  changedAt:        { type: Date, default: Date.now },
  reason:           { type: String }, // short explanation provided by teacher
  attachments:      { type: [AttachmentSchema], default: [] },
  notes:            { type: String }
}, { _id: false });

/**
 * AttendanceEntry
 * - each entry corresponds to a particular student for this session
 * - 'attendanceType' is the simplified field you asked for (normal, sick, leave, ...) so AI can query quickly
 * - updates[] holds manual changes by teacher (embedded, not separate collection)
 */
const AttendanceEntrySchema = new Schema({
  studentId:        { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  status:           { type: String, enum: ['present','absent','late','on_leave','excused','other'], required: true, default: 'absent' },
  attendanceType:   { type: String, enum: ['normal','sick','leave','excused','other'], default: 'normal' },
  markedAt:         { type: Date, default: Date.now }, // time when it was marked (initial or last change)
  markedBy:         { type: Schema.Types.ObjectId, ref: 'User', default: null }, // system, student (null) or teacher/admin ObjectId
  // markMethod:       { type: String, enum: ['qr','geofence','manual','bulk','api','other'], default: 'qr' },
  updates:          { type: [EntryUpdateSchema], default: [] }, // teacher changes with attachments
  notes:            { type: String } // optional quick notes
}, { _id: false });

/**
 * Attendance (main document)
 * - one document per session/class lecture
 * - entries: array of AttendanceEntrySchema
 */
const AttendanceSchema = new Schema({
  courseId:         { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  classId:          { type: Schema.Types.ObjectId, ref: 'Class', required: false },
  lectureId:        { type: Schema.Types.ObjectId, ref: 'Lecture', required: false },
  sessionDate:      { type: Date, required: true }, // lecture date/time
  sessionType:      { type: String, enum: ['lecture','tutorial','lab','exam','other'], default: 'lecture' },

  entries:          { type: [AttendanceEntrySchema], required: true, default: [] },

  meta: {
    totalMarked:    { type: Number, default: 0 },
    totalPresent:   { type: Number, default: 0 },
    totalAbsent:    { type: Number, default: 0 }
  },

  createdAt:        { type: Date, default: Date.now },
  updatedAt:        { type: Date, default: Date.now }
}, { collection: 'attendances' }); // <--- 🔴 CRITICAL ADDITION



// update updatedAt automatically
AttendanceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
