import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Clock, BookOpen, CheckCircle, XCircle, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

import { registerAndSendTokenToServer, onForegroundMessage } from '../firebase/firebaseClient';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ASKED_KEY = 'sa_manager_notif_lastAsked_v1';
const REASK_DAYS = 7;

function daysSince(timestamp) {
  if (!timestamp) return Infinity;
  return (Date.now() - Number(timestamp)) / (1000 * 60 * 60 * 24);
}

function TimetableManager() {
  const navigate = useNavigate();

  const initialFormState = {
    subject: '',
    daysOfWeek: [],
    time: '',
    startDate: '',
    endDate: '',
    isActive: true
  };

  const [pendingLectures, setPendingLectures] = useState([{ ...initialFormState, tempId: Date.now() }]);
  const [lectures, setLectures] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDaysDropdown, setShowDaysDropdown] = useState({});
  const [isLoadingLectures, setIsLoadingLectures] = useState(true);

  // notification UI state
  const [showBanner, setShowBanner] = useState(false);
  const [notifSupported, setNotifSupported] = useState(true);
  const [permissionBlocked, setPermissionBlocked] = useState(false);

  // Fetch lectures from database on mount
  useEffect(() => {
    const fetchLectures = async () => {
      try {
        setIsLoadingLectures(true);
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/teacher/timetable`, { 
          withCredentials: true 
        });
        
        if (response.data && response.data.lectures) {
          setLectures(response.data.lectures);
        }
      } catch (err) {
        console.error('Fetch lectures error:', err);
        if (err.response?.status === 401) {
          toast.error('Please log in.');
          navigate('/login');
        } else {
          toast.error('Failed to load lectures. Please refresh the page.');
        }
      } finally {
        setIsLoadingLectures(false);
      }
    };

    fetchLectures();
  }, [navigate]);

  // foreground messages
  useEffect(() => {
    const unsub = onForegroundMessage((payload) => {
      toast.info(`${payload.notification?.title || 'Notification'} — ${payload.notification?.body || ''}`);
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  const ensureServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      if (existing) return existing;
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      return reg;
    } catch (err) {
      console.warn('SW registration/check failed:', err);
      return null;
    }
  };

  // Enhanced notification permission check
  useEffect(() => {
    if (typeof Notification === 'undefined' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      setNotifSupported(false);
      return;
    }

    // Always check the actual browser permission, not localStorage
    const checkAndSyncPermission = () => {
      const actualPerm = Notification.permission;
      console.log('Actual Notification.permission =', actualPerm);

      // Clear localStorage if permission doesn't match reality
      const lastAsked = window.localStorage.getItem(ASKED_KEY);
      
      if (actualPerm === 'granted') {
        // Permission is granted - ensure token is registered
        ensureServiceWorker().catch(() => {});
        registerAndSendTokenToServer()
          .then(token => {
            if (token) {
              console.log('Notifications enabled, token registered');
            }
          })
          .catch(err => {
            console.error('registerAndSendTokenToServer error:', err);
          });
        setShowBanner(false);
        setPermissionBlocked(false);
        return;
      }

      if (actualPerm === 'denied') {
        // Permission explicitly denied - don't show banner, show blocked message
        setPermissionBlocked(true);
        setShowBanner(false);
        // Clear the lastAsked since it's now blocked
        if (lastAsked) {
          window.localStorage.removeItem(ASKED_KEY);
        }
        return;
      }

      // actualPerm === 'default' - decide whether to show banner
      if (actualPerm === 'default') {
        const days = daysSince(lastAsked);
        if (days === Infinity || days >= REASK_DAYS) {
          setShowBanner(true);
        } else {
          setShowBanner(false);
        }
        setPermissionBlocked(false);
      }
    };

    checkAndSyncPermission();

    // Re-check permission when page becomes visible (user might have changed it in settings)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndSyncPermission();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleEnableNotifications = async () => {
    try {
      await ensureServiceWorker();
    } catch (e) {
      console.warn('SW ensure failed, continuing to request permission.');
    }

    try {
      const permission = await Notification.requestPermission();
      window.localStorage.setItem(ASKED_KEY, String(Date.now()));

      if (permission === 'granted') {
        setShowBanner(false);
        setPermissionBlocked(false);
        try {
          const token = await registerAndSendTokenToServer();
          if (token) toast.success('Notifications enabled, you will receive lecture reminders.');
          else toast.info('Notifications enabled (no token returned).');
        } catch (err) {
          console.error('registerAndSendTokenToServer error:', err);
          toast.error('Failed to register device for notifications. Check console for details.');
        }
      } else if (permission === 'denied') {
        setPermissionBlocked(true);
        setShowBanner(false);
        toast.error('Notification permission denied. You can enable it later from browser settings.');
      } else {
        setShowBanner(false);
        window.localStorage.setItem(ASKED_KEY, String(Date.now()));
        toast.info('Notification prompt dismissed. We will ask again later.');
      }
    } catch (err) {
      console.error('requestPermission error:', err);
      toast.error('Unable to request notification permission. See console for details.');
    }
  };

  const handleLater = () => {
    window.localStorage.setItem(ASKED_KEY, String(Date.now()));
    setShowBanner(false);
    toast.info('Okay, we will remind you later.');
  };

  const handleInputChange = (tempId, e) => {
    const { name, value, type, checked } = e.target;
    setPendingLectures(prev => prev.map(lecture =>
      lecture.tempId === tempId
        ? { ...lecture, [name]: type === 'checkbox' ? checked : value }
        : lecture
    ));
  };

  const toggleDay = (tempId, day) => {
    setPendingLectures(prev => prev.map(lecture =>
      lecture.tempId === tempId
        ? {
            ...lecture,
            daysOfWeek: lecture.daysOfWeek.includes(day)
              ? lecture.daysOfWeek.filter(d => d !== day)
              : [...lecture.daysOfWeek, day]
          }
        : lecture
    ));
  };

  const toggleDaysDropdown = (tempId) => {
    setShowDaysDropdown(prev => ({ ...prev, [tempId]: !prev[tempId] }));
  };

  const addNewLectureForm = () => setPendingLectures(prev => [...prev, { ...initialFormState, tempId: Date.now() }]);

  const removeLectureForm = (tempId) => {
    if (pendingLectures.length === 1) {
      toast.error('At least one lecture form is required');
      return;
    }
    setPendingLectures(prev => prev.filter(lecture => lecture.tempId !== tempId));
    setShowDaysDropdown(prev => { const n = { ...prev }; delete n[tempId]; return n; });
  };

  const validateLecture = (lecture) => {
    if (!lecture.subject.trim()) return 'Please enter a subject name';
    if (lecture.daysOfWeek.length === 0) return 'Please select at least one day';
    if (!lecture.time) return 'Please select lecture time';
    if (!lecture.startDate || !lecture.endDate) return 'Please select both start and end dates';
    if (new Date(lecture.startDate) > new Date(lecture.endDate)) return 'Start date must be before end date';
    return null;
  };

  const handleSubmitAll = async (e) => {
    e.preventDefault();
    for (let i = 0; i < pendingLectures.length; i++) {
      const error = validateLecture(pendingLectures[i]);
      if (error) {
        toast.error(`Lecture ${i + 1}: ${error}`);
        return;
      }
    }
    setIsSubmitting(true);
    const payload = pendingLectures.map(lecture => ({
      subject: lecture.subject,
      daysOfWeek: lecture.daysOfWeek,
      time: lecture.time,
      dateRange: { startDate: lecture.startDate, endDate: lecture.endDate },
      isActive: lecture.isActive
    }));
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/teacher/timetable/bulk`, { lectures: payload }, { withCredentials: true });
      
      // Fetch updated lectures from database instead of manually adding
      const updatedLectures = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/teacher/timetable`, { 
        withCredentials: true 
      });
      
      if (updatedLectures.data && updatedLectures.data.lectures) {
        setLectures(updatedLectures.data.lectures);
      }
      
      toast.success(`${pendingLectures.length} lecture(s) added successfully!`);
      setPendingLectures([{ ...initialFormState, tempId: Date.now() }]);
      setShowDaysDropdown({});
      setEditingId(null);
    } catch (err) {
      console.error('save lectures error', err);
      if (err.response) {
        if (err.response.status === 401) { toast.error('Please log in.'); navigate('/login'); }
        else toast.error(err.response?.data?.message || 'Failed to add lectures!');
      } else toast.error('Something went wrong. Try again later.');
    } finally { setIsSubmitting(false); }
  };

  const handleEdit = (lecture) => {
    setPendingLectures([{
      subject: lecture.subject, daysOfWeek: lecture.daysOfWeek, time: lecture.time,
      startDate: lecture.dateRange.startDate, endDate: lecture.dateRange.endDate,
      isActive: lecture.isActive, tempId: Date.now()
    }]);
    setEditingId(lecture.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lecture?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/teacher/timetable/${id}`, { withCredentials: true });
      
      // Fetch updated lectures from database
      const updatedLectures = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/teacher/timetable`, { 
        withCredentials: true 
      });
      
      if (updatedLectures.data && updatedLectures.data.lectures) {
        setLectures(updatedLectures.data.lectures);
      }
      
      toast.success('Lecture deleted successfully!');
      if (editingId === id) { setPendingLectures([{ ...initialFormState, tempId: Date.now() }]); setEditingId(null); }
    } catch (err) {
      console.error('delete lecture error', err);
      toast.error('Failed to delete lecture!');
    }
  };

  const cancelEdit = () => { setPendingLectures([{ ...initialFormState, tempId: Date.now() }]); setEditingId(null); setShowDaysDropdown({}); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Lecture Timetable</h1>
          <p className="text-gray-600">Manage your teaching schedule and reminders</p>
        </div>

        {notifSupported && showBanner && (
          <div className="max-w-6xl mx-auto mb-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200 flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-800">Enable lecture reminders</div>
              <div className="text-sm text-gray-600">Allow browser notifications to receive reminders for your scheduled lectures. Click Enable to allow notifications (you will only be asked occasionally).</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleEnableNotifications} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Enable</button>
              <button onClick={handleLater} className="px-4 py-2 bg-white border rounded-lg">Later</button>
            </div>
          </div>
        )}

        {notifSupported && permissionBlocked && (
          <div className="max-w-6xl mx-auto mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            Notification permission is blocked. To receive lecture reminders, enable notifications for this site in your browser settings (click the lock icon in address bar → Notifications).
          </div>
        )}

        {!notifSupported && (
          <div className="max-w-6xl mx-auto mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700">
            Notifications or Service Workers are not supported in this browser. Lecture reminders require a modern browser and HTTPS (or localhost for dev).
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-indigo-600" />
            {editingId !== null ? 'Edit Lecture' : 'Add New Lectures'}
          </h2>

          <div className="space-y-8">
            {pendingLectures.map((lecture, index) => (
              <div key={lecture.tempId} className="relative border-2 border-gray-200 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">Lecture {index + 1}</div>
                  {pendingLectures.length > 1 && (
                    <button type="button" onClick={() => removeLectureForm(lecture.tempId)} className="text-red-600 hover:text-red-800 transition" title="Remove this lecture">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name *</label>
                  <input type="text" name="subject" value={lecture.subject} onChange={(e) => handleInputChange(lecture.tempId, e)}
                    placeholder="e.g., Operating Systems"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week *</label>
                  <button type="button" onClick={() => toggleDaysDropdown(lecture.tempId)} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left focus:ring-2 focus:ring-indigo-500 transition bg-white">
                    {lecture.daysOfWeek.length === 0 ? 'Select days...' : lecture.daysOfWeek.join(', ')}
                  </button>
                  {showDaysDropdown[lecture.tempId] && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {DAYS_OF_WEEK.map(day => (
                        <label key={day} className="flex items-center px-4 py-3 hover:bg-indigo-50 cursor-pointer transition">
                          <input type="checkbox" checked={lecture.daysOfWeek.includes(day)} onChange={() => toggleDay(lecture.tempId, day)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                          <span className="ml-3 text-gray-700">{day}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lecture Time (24-hour format) *</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="time" name="time" value={lecture.time} onChange={(e) => handleInputChange(lecture.tempId, e)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                    <input type="date" name="startDate" value={lecture.startDate} onChange={(e) => handleInputChange(lecture.tempId, e)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                    <input type="date" name="endDate" value={lecture.endDate} onChange={(e) => handleInputChange(lecture.tempId, e)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
                  </div>
                </div>
              </div>
            ))}

            <button type="button" onClick={addNewLectureForm} className="w-full flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition border-2 border-dashed border-gray-300">
              <Plus className="w-5 h-5 mr-2" /> Add Another Lecture
            </button>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-gray-200">
              <button type="button" onClick={handleSubmitAll} disabled={isSubmitting} className="flex-1 flex items-center justify-center px-6 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg">
                <Save className="w-6 h-6 mr-2" />
                {isSubmitting ? 'Submitting...' : editingId !== null ? 'Update Lecture' : `Submit All (${pendingLectures.length} Lecture${pendingLectures.length !== 1 ? 's' : ''})`}
              </button>

              {editingId !== null && (
                <button type="button" onClick={cancelEdit} className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold">Cancel</button>
              )}
            </div>
          </div>
        </div>

        {isLoadingLectures ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600">Loading your lectures...</p>
          </div>
        ) : lectures.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">Your Lectures</h2>
              <p className="text-gray-600 mt-1">{lectures.length} lecture{lectures.length !== 1 ? 's' : ''} scheduled</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Range</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lectures.map((lecture) => (
                    <tr key={lecture.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center"><BookOpen className="w-5 h-5 text-indigo-600 mr-2" /><span className="text-sm font-medium text-gray-900">{lecture.subject}</span></div>
                      </td>
                      <td className="px-6 py-4"><div className="flex flex-wrap gap-1">{lecture.daysOfWeek.map(day => <span key={day} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800">{day.substring(0,3)}</span>)}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center text-sm text-gray-900"><Clock className="w-4 h-4 text-gray-400 mr-2" />{lecture.time}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"><div className="flex items-center"><Calendar className="w-4 h-4 text-gray-400 mr-2" /><span>{lecture.dateRange.startDate} to {lecture.dateRange.endDate}</span></div></td>
                      <td className="px-6 py-4 whitespace-nowrap">{lecture.isActive ? <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-4 h-4 mr-1" />Active</span> : <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-4 h-4 mr-1" />Inactive</span>}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleEdit(lecture)} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit2 className="w-5 h-5" /></button>
                        <button onClick={() => handleDelete(lecture.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-5 h-5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No lectures added yet</h3>
            <p className="text-gray-500">Start by adding your first lecture using the form above</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TimetableManager;


