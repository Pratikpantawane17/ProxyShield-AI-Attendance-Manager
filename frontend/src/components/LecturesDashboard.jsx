// LecturesDashboard.jsx
// Production-ready React component for managing teacher lectures

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Calendar, Trash2, Edit, Clock, Users } from 'lucide-react';


const LecturesDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todayLectures, setTodayLectures] = useState([]);
  const [upcomingLectures, setUpcomingLectures] = useState([]);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '', endTime: '' });
  const [cancelReason, setCancelReason] = useState('');

  // Fetch lectures on component mount
  useEffect(() => {
    fetchLectures();
  }, []);

  // Fetch today's and upcoming lectures
  const fetchLectures = async () => {
    try {
      setLoading(true);
      
      // API Call: GET /lectures?range=today
      // Expected response: { lectures: Array<Lecture> }
      const todayResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/lec  ay`, {
        withCredentials: true
      });
      
      // API Call: GET /lectures?range=upcoming
      // Expected response: { lectures: Array<Lecture> }
      const upcomingResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/lectures?range=upcoming`, {
        withCredentials: true
      });

      setTodayLectures(todayResponse.data.lectures || []);
      setUpcomingLectures(upcomingResponse.data.lectures || []);
      setLoading(false);
    } 
    catch (error) {
      setLoading(false);
      handleApiError(error);
    }
  };

  // Handle API errors, especially 401 (unauthorized)
  const handleApiError = (error) => {
    if (error.response?.status === 401) {
      toast.error('Session expired. Please login again.');
      navigate('/login');
    } else if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else {
      toast.error('An error occurred. Please try again.');
    }
  };

  // Open reschedule modal
  const handleRescheduleClick = (lecture) => {
    setSelectedLecture(lecture);
    setRescheduleData({ date: '', time: '', endTime: '' });
    setShowRescheduleModal(true);
  };

  // Submit reschedule request
  const handleRescheduleSubmit = async () => {
    if (!rescheduleData.date || !rescheduleData.time) {
      toast.error('Please provide both date and time');
      return;
    }

    try {
      // Combine date and time into ISO string
      const newDateTime = new Date(`${rescheduleData.date}T${rescheduleData.time}`).toISOString();
      const newEndTime = rescheduleData.endTime 
        ? new Date(`${rescheduleData.date}T${rescheduleData.endTime}`).toISOString()
        : null;

      // API Call: POST /lectures/:lectureId/reschedule
      // Payload: { lectureId: string, newDateTime: string, newEndTime?: string }
      // Example: { lectureId: "lec_123", newDateTime: "2025-10-28T14:00:00.000Z", newEndTime: "2025-10-28T15:30:00.000Z" }
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/lectures/${selectedLecture.id}/reschedule`,
        {
          lectureId: selectedLecture.id,
          newDateTime: newDateTime,
          ...(newEndTime && { newEndTime: newEndTime })
        },
        { withCredentials: true }
      );

      toast.success('Lecture rescheduled successfully! Students will be notified.');
      setShowRescheduleModal(false);
      setSelectedLecture(null);
      fetchLectures(); // Refresh the list
    } catch (error) {
      handleApiError(error);
    }
  };

  // Open cancel modal
  const handleCancelClick = (lecture) => {
    setSelectedLecture(lecture);
    setCancelReason('');
    setShowCancelModal(true);
  };

  // Submit cancel request
  const handleCancelSubmit = async () => {
    try {
      // API Call: POST /lectures/:lectureId/cancel
      // Payload: { lectureId: string, reason?: string }
      // Example: { lectureId: "lec_123", reason: "Teacher unavailable due to emergency" }
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/lectures/${selectedLecture.id}/cancel`,
        {
          lectureId: selectedLecture.id,
          ...(cancelReason && { reason: cancelReason })
        },
        { withCredentials: true }
      );

      toast.success('Lecture cancelled successfully! Students will be notified.');
      setShowCancelModal(false);
      setSelectedLecture(null);
      fetchLectures(); // Refresh the list
    } catch (error) {
      handleApiError(error);
    }
  };

  // Get badge styling based on lecture status
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'active':
      case 'attending':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Format time for display
  const formatTime = (dateTime) => {
    return new Date(dateTime).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Format date for display
  const formatDate = (dateTime) => {
    return new Date(dateTime).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Render individual lecture card
  const LectureCard = ({ lecture, isHighlighted = false }) => (
    <div 
      className={`p-4 rounded-lg border-2 ${
        isHighlighted ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
      } shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{lecture.subjectName}</h3>
          <p className="text-sm text-gray-600">You are taking this lecture</p>
        </div>
        <span 
          className={`px-3 py-1 rounded-full text-xs font-medium border ${getBadgeStyle(lecture.status)}`}
        >
          {lecture.status.charAt(0).toUpperCase() + lecture.status.slice(1)}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-700">
          <Clock className="w-4 h-4 mr-2" />
          <span>{formatTime(lecture.startTime)} - {formatTime(lecture.endTime)}</span>
        </div>
        <div className="flex items-center text-sm text-gray-700">
          <Calendar className="w-4 h-4 mr-2" />
          <span>{formatDate(lecture.startTime)}</span>
        </div>
        {lecture.enrolledStudents !== undefined && (
          <div className="flex items-center text-sm text-gray-700">
            <Users className="w-4 h-4 mr-2" />
            <span>{lecture.enrolledStudents} students enrolled</span>
          </div>
        )}
      </div>

      {lecture.status !== 'cancelled' && (
        <div className="flex gap-2">
          <button
            onClick={() => handleRescheduleClick(lecture)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            aria-label={`Reschedule ${lecture.subjectName} lecture`}
          >
            <Edit className="w-4 h-4" />
            Reschedule
          </button>
          <button
            onClick={() => handleCancelClick(lecture)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            aria-label={`Cancel ${lecture.subjectName} lecture`}
          >
            <Trash2 className="w-4 h-4" />
            Cancel
          </button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lectures...</p>
        </div>
      </div>
    );
  }

  const nextLecture = todayLectures.find(l => l.status === 'active' || l.status === 'attending');
  const remainingLectures = todayLectures.filter(l => l.id !== nextLecture?.id);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Lectures Dashboard</h1>

        {/* Today's Next Lecture */}
        {nextLecture && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Today's Next Lecture</h2>
            <LectureCard lecture={nextLecture} isHighlighted={true} />
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Remaining Lectures Today */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Remaining Lectures Today</h2>
            {remainingLectures.length > 0 ? (
              <div className="space-y-4">
                {remainingLectures.map((lecture) => (
                  <LectureCard key={lecture.id} lecture={lecture} />
                ))}
              </div>
            ) : (
              <p className="text-gray-600 bg-white p-6 rounded-lg border border-gray-200">
                No more lectures scheduled for today.
              </p>
            )}
          </section>

          {/* Upcoming Lectures */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Upcoming Lectures</h2>
            {upcomingLectures.length > 0 ? (
              <div className="space-y-4">
                {upcomingLectures.map((lecture) => (
                  <LectureCard key={lecture.id} lecture={lecture} />
                ))}
              </div>
            ) : (
              <p className="text-gray-600 bg-white p-6 rounded-lg border border-gray-200">
                No upcoming lectures scheduled.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Reschedule Lecture</h3>
            <p className="text-gray-600 mb-4">
              Rescheduling: <strong>{selectedLecture?.subjectName}</strong>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Date
                </label>
                <input
                  type="date"
                  value={rescheduleData.date}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={rescheduleData.time}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time (Optional)
                </label>
                <input
                  type="time"
                  value={rescheduleData.endTime}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4 text-red-600">Cancel Lecture</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel: <strong>{selectedLecture?.subjectName}</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              All enrolled students will be notified via email and app notification.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (Optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Provide a reason for cancellation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Keep Lecture
              </button>
              <button
                onClick={handleCancelSubmit}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturesDashboard;