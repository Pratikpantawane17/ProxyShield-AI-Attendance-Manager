const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'teacher', 
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    daysOfWeek: {
      type: [String],
      enum: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      required: true,
    },
    time: {
      type: String, // storing in "HH:mm" 24-hour format
      required: true,
    },
    dateRange: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },
    classroom: {
      type: String,
      trim: true,
      default: '', // Optional field, empty string if not provided
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for faster cron-based queries (finding today's lectures) - (optional)
// timetableSchema.index({ teacherId: 1, 'dateRange.startDate': 1, 'dateRange.endDate': 1 });

module.exports = mongoose.model('timetable', timetableSchema);