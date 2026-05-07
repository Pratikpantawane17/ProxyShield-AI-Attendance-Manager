import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Loader2, FileDown, X, Calendar, User, CheckCircle, XCircle } from 'lucide-react';

axios.defaults.withCredentials = true;

const AttendanceView = () => {
  const navigate = useNavigate();
  
  // State management
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [threshold, setThreshold] = useState(75);
  
  // Pagination & search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('studentName');
  const [dir, setDir] = useState('asc');
  
  // Data
  const [attendanceData, setAttendanceData] = useState({
    totalStudents: 0,
    totalClasses: 0,
    students: []
  });
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Modal state
  const [historyModal, setHistoryModal] = useState({
    open: false,
    studentId: null,
    studentName: '',
    history: [],
    loading: false
  });

  // Handle auth errors
  const handleAuthError = (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      toast.error('Not logged in or unauthorized');
      navigate('/login');
      return true;
    }
    return false;
  };

  // Fetch subjects on mount
  useEffect(() => {
    fetchSubjects();
  }, []);

  // Fetch attendance when filters change
  useEffect(() => {
    if (selectedSubject && dateFrom && dateTo) {
      fetchAttendance();
    }
  }, [selectedSubject, dateFrom, dateTo, page, limit, search, sort, dir]);

  const fetchSubjects = async () => {
    try {
      setSubjectsLoading(true);
      const { data } = await axios.get('/api/subjects');
      setSubjects(data.subjects || data || []);
    } catch (error) {
      if (!handleAuthError(error)) {
        toast.error('Failed to load subjects');
      }
    } finally {
      setSubjectsLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = {
        subjectId: selectedSubject,
        from: dateFrom,
        to: dateTo,
        page,
        limit,
        search,
        sort,
        dir
      };
      
      const { data } = await axios.get('/api/attendance/summary', { params });
      setAttendanceData({
        totalStudents: data.totalStudents || 0,
        totalClasses: data.totalClasses || 0,
        students: data.students || []
      });
      setSelectedStudents(new Set());
    } catch (error) {
      if (!handleAuthError(error)) {
        toast.error('Failed to load attendance data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (studentId, studentName) => {
    setHistoryModal({ open: true, studentId, studentName, history: [], loading: true });
    
    try {
      const params = {
        studentId,
        subjectId: selectedSubject,
        from: dateFrom,
        to: dateTo
      };
      
      const { data } = await axios.get('/api/attendance/history', { params });
      setHistoryModal(prev => ({
        ...prev,
        history: data.history || data || [],
        loading: false
      }));
    } catch (error) {
      if (!handleAuthError(error)) {
        toast.error('Failed to load attendance history');
      }
      setHistoryModal(prev => ({ ...prev, loading: false }));
    }
  };

  const markExcused = async (studentId) => {
    try {
      await axios.post('/api/attendance/mark-excused', {
        studentId,
        subjectId: selectedSubject,
        from: dateFrom,
        to: dateTo
      });
      toast.success('Marked as excused');
      fetchAttendance();
    } catch (error) {
      if (!handleAuthError(error)) {
        toast.error('Failed to mark as excused');
      }
    }
  };

  const exportCurrent = async () => {
    try {
      setExportLoading(true);
      const params = {
        subjectId: selectedSubject,
        from: dateFrom,
        to: dateTo,
        search,
        sort,
        dir
      };
      
      const response = await axios.get('/api/attendance/export', {
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${selectedSubject}_${dateFrom}_${dateTo}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Export successful');
    } catch (error) {
      if (!handleAuthError(error)) {
        toast.error('Export failed');
      }
    } finally {
      setExportLoading(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedStudents(new Set(attendanceData.students.map(s => s._id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleSelectStudent = (studentId, checked) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSort = (column) => {
    if (sort === column) {
      setDir(dir === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(column);
      setDir('asc');
    }
  };

  const getRowColor = (percent) => {
    if (percent < 50) return 'bg-red-50';
    if (percent < threshold) return 'bg-yellow-50';
    return '';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Attendance View</h1>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={subjectsLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject._id || subject.id} value={subject._id || subject.id}>
                    {subject.name || subject.subjectName}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Threshold (%)</label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Search and Actions */}
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, PRN, email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={exportCurrent}
              disabled={!selectedSubject || exportLoading || attendanceData.students.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Export Current
            </button>
          </div>
          
          {/* Summary Stats */}
          {attendanceData.totalStudents > 0 && (
            <div className="mt-4 flex gap-6 text-sm">
              <div className="text-gray-600">
                <span className="font-semibold">Total Students:</span> {attendanceData.totalStudents}
              </div>
              <div className="text-gray-600">
                <span className="font-semibold">Total Classes:</span> {attendanceData.totalClasses}
              </div>
              <div className="text-gray-600">
                <span className="font-semibold">Selected:</span> {selectedStudents.size}
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : attendanceData.students.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
            {selectedSubject && dateFrom && dateTo ? 'No attendance records found' : 'Please select subject and date range'}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedStudents.size === attendanceData.students.length && attendanceData.students.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">S.No</th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('studentPRN')}
                    >
                      PRN {sort === 'studentPRN' && (dir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('studentName')}
                    >
                      Name {sort === 'studentName' && (dir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mobile</th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('presentCount')}
                    >
                      Present {sort === 'presentCount' && (dir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('attendancePercent')}
                    >
                      Percentage {sort === 'attendancePercent' && (dir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendanceData.students.map((student, index) => (
                    <tr key={student._id} className={getRowColor(student.attendancePercent)}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student._id)}
                          onChange={(e) => handleSelectStudent(student._id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{(page - 1) * limit + index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.studentPRN}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.studentName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.studentEmail}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.studentMobile}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.presentCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.totalClasses}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-semibold ${
                          student.attendancePercent < 50 ? 'text-red-600' :
                          student.attendancePercent < threshold ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {student.attendancePercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => fetchHistory(student._id, student.studentName)}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            View History
                          </button>
                          <button
                            onClick={() => markExcused(student._id)}
                            className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                          >
                            Mark Excused
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="bg-gray-50 px-4 py-3 border-t flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">Page {page}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={attendanceData.students.length < limit}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {historyModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  Attendance History - {historyModal.studentName}
                </h2>
                <button
                  onClick={() => setHistoryModal({ open: false, studentId: null, studentName: '', history: [], loading: false })}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {historyModal.loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : historyModal.history.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No attendance history found</div>
                ) : (
                  <div className="space-y-3">
                    {historyModal.history.map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-gray-600" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {new Date(record.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                            <div className="text-sm text-gray-600">{record.topic || 'No topic'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {record.status === 'present' ? (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <CheckCircle className="w-5 h-5" /> Present
                            </span>
                          ) : record.status === 'excused' ? (
                            <span className="flex items-center gap-1 text-orange-600 font-medium">
                              <CheckCircle className="w-5 h-5" /> Excused
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600 font-medium">
                              <XCircle className="w-5 h-5" /> Absent
                            </span> 
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceView;