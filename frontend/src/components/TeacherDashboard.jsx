import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Loader2, Filter, Users, TrendingDown, BarChart3, FileSpreadsheet, FileText, Eye, Download, Calendar, BookOpen, GraduationCap } from 'lucide-react';

// Ensure axios sends cookies with every request
axios.defaults.withCredentials = true;

const TeacherDashboard = () => {
  const navigate = useNavigate();

  // Filter state
  const [filters, setFilters] = useState({
    year: '',
    branch: '',
    section: '',
    subjectId: '',
    fromDate: '',
    toDate: '',
    threshold: 75
  });

  // Data state
  const [subjects, setSubjects] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [avgAttendance, setAvgAttendance] = useState(0);
  const [defaulterCount, setDefaulterCount] = useState(0);
  const [teacherId, setTeacherId] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showDefaulterModal, setShowDefaulterModal] = useState(false);
  const [defaulterList, setDefaulterList] = useState([]);
  const [fetchingDefaulters, setFetchingDefaulters] = useState(false);

  // Constants
  const years = ['1', '2', '3', '4'];
  const branches = ['CSE', 'IT', 'MECH', 'CIVIL', 'EE', ' ECE'];
  const sections = ['A (Aided)', 'B (Unaided)'];

  // Handle 401/403 responses - redirect to login
  const handleAuthError = (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      toast.error('Not logged in or unauthorized. Please login.');
      navigate('/login');
      return true;
    }
    return false;
  };

  // Fetch teacher profile on mount to get teacherId
  useEffect(() => {
    const fetchTeacherProfile = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/auth/profile`);
        if (response.data && response.data.userId) {
          setTeacherId(response.data.userId);
        }
      } catch (error) {
        // Handle 401/403 by redirecting to login
        if (!handleAuthError(error)) {
          toast.error('Failed to load profile');
        }
      }
    };
    fetchTeacherProfile();
  }, []);

  // Fetch subjects when teacher, year, or branch changes
  useEffect(() => {
    if (teacherId && filters.year && filters.branch) {
      fetchSubjects();
    }
  }, [teacherId, filters.year, filters.branch]);

  // Fetch subjects from backend
  const fetchSubjects = async () => {
    setSubjectsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/subjects`, {
        params: {
          teacherId,
          year: filters.year,
          branch: filters.branch
        }
      });
      setSubjects(response.data || []);
      // Reset subject selection if it's not in the new list
      if (filters.subjectId && !response.data.find(s => s._id === filters.subjectId)) {
        setFilters(prev => ({ ...prev, subjectId: '' }));
      }
    } catch (error) {
      if (!handleAuthError(error)) {
        toast.error('Failed to load subjects');
        setSubjects([]);
      }
    } finally {
      setSubjectsLoading(false);
    }
  };

  // Validate date range
  const validateDates = () => {
    if (filters.fromDate && filters.toDate) {
      if (new Date(filters.fromDate) > new Date(filters.toDate)) {
        toast.error('From date must be before or equal to To date');
        return false;
      }
    }
    return true;
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!filters.year || !filters.branch || !filters.subjectId) {
      toast.error('Please select Year, Branch, and Subject');
      return;
    }

    if (!validateDates()) return;

    setLoading(true);
    try {
      // Fetch total students count
      console.log("Enter in Students Reponse ");
      
      const studentsResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/students/count`, {
        params: {
          year: filters.year,
          department: filters.branch,
          section: filters.section || undefined
        }
      });

      console.log("Student Response --> ", studentsResponse);

      setTotalStudents(studentsResponse.data.count || 0);

      // Fetch attendance summary
      const summaryResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/attendance/summary`, {
        params: {
          subjectId: filters.subjectId,
          from: filters.fromDate || undefined,
          to: filters.toDate || undefined
        }
      });

      setAvgAttendance(summaryResponse.data.avgAttendance || 0);
      setDefaulterCount(summaryResponse.data.defaulterCount || 0);
      
      toast.success('Dashboard data loaded successfully');
    } catch (error) {
      if (!handleAuthError(error)) {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Navigate to attendance page with filters
  const handleViewAttendance = () => {
    if (!filters.year || !filters.branch || !filters.subjectId) {
      toast.error('Please select Year, Branch, and Subject first');
      return;
    }

    const queryParams = new URLSearchParams({
      year: filters.year,
      branch: filters.branch,
      subjectId: filters.subjectId,
      ...(filters.section && { section: filters.section }),
      ...(filters.fromDate && { from: filters.fromDate }),
      ...(filters.toDate && { to: filters.toDate })
    });

    navigate(`/attendance?${queryParams.toString()}`);
  };

  // Generate defaulter list
  const generateDefaulterList = async () => {
    if (!filters.year || !filters.branch || !filters.subjectId) {
      toast.error('Please select Year, Branch, and Subject first');
      return;
    }

    if (!validateDates()) return;

    setFetchingDefaulters(true);
    setShowDefaulterModal(true);
    
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/attendance/defaulters`, {
        params: {
          subjectId: filters.subjectId,
          year: filters.year,
          department: filters.branch,
          section: filters.section || undefined,
          from: filters.fromDate || undefined,
          to: filters.toDate || undefined,
          threshold: filters.threshold
        }
      });

      setDefaulterList(response.data.defaulters || []);
      if (!response.data.defaulters || response.data.defaulters.length === 0) {
        toast.info('No defaulters found with current filters');
      }
    } catch (error) {
      if (!handleAuthError(error)) {
        toast.error('Failed to generate defaulter list');
      }
      setShowDefaulterModal(false);
    } finally {
      setFetchingDefaulters(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (!filters.year || !filters.branch || !filters.subjectId) {
      toast.error('Please select Year, Branch, and Subject first');
      return;
    }

    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/attendance/export/excel`, {
        params: {
          subjectId: filters.subjectId,
          year: filters.year,
          department: filters.branch,
          section: filters.section || undefined,
          from: filters.fromDate || undefined,
          to: filters.toDate || undefined,
          threshold: filters.threshold
        },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `defaulters_${filters.year}_${filters.branch}_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Excel exported successfully');
    } catch (error) {
      if (!handleAuthError(error)) {
        toast.error('Failed to export Excel');
      }
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!filters.year || !filters.branch || !filters.subjectId) {
      toast.error('Please select Year, Branch, and Subject first');
      return;
    }

    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/attendance/export/pdf`, {
        params: {
          subjectId: filters.subjectId,
          year: filters.year,
          department: filters.branch,
          section: filters.section || undefined,
          from: filters.fromDate || undefined,
          to: filters.toDate || undefined,
          threshold: filters.threshold
        },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `defaulters_${filters.year}_${filters.branch}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('PDF exported successfully');
    } catch (error) {
      if (!handleAuthError(error)) {
        toast.error('Failed to export PDF');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header matching StudentPage style */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <GraduationCap className="w-6 h-6 text-gray-800" />
              </div>
              <div>
                 <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Teacher Dashboard</h1>
              </div>
            </div>
            {/* You could add a logout button here to match StudentPage if needed */}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Filters Section */}
        <section className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-700" />
              Filters
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium uppercase tracking-wide"
            >
              {showFilters ? 'Hide' : 'Show'}
            </button>
          </div>

          {showFilters && (
            <div className="space-y-5">
              {/* Row 1: Year, Branch, Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={filters.year}
                    onChange={(e) => handleFilterChange('year', e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
                  >
                    <option value="">Select Year</option>
                    {years.map(year => (
                      <option key={year} value={year}>Year {year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={filters.branch}
                    onChange={(e) => handleFilterChange('branch', e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Section (Optional)
                  </label>
                  <select
                    value={filters.section}
                    onChange={(e) => handleFilterChange('section', e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
                  >
                    <option value="">All Sections</option>
                    {sections.map(section => (
                      <option key={section} value={section}>Section {section}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Subject, From Date, To Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={filters.subjectId}
                    onChange={(e) => handleFilterChange('subjectId', e.target.value)}
                    disabled={subjectsLoading || !filters.year || !filters.branch}
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {subjectsLoading ? 'Loading subjects...' : 'Select Subject'}
                    </option>
                    {subjects.map(subject => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                  {subjects.length === 0 && filters.year && filters.branch && !subjectsLoading && (
                    <p className="text-xs text-amber-600 mt-1 font-medium">No subjects assigned for this class</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
                  />
                </div>
              </div>

              {/* Row 3: Threshold and Apply Button */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Attendance Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.threshold}
                    onChange={(e) => handleFilterChange('threshold', e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    onClick={fetchDashboardData}
                    disabled={loading || !filters.year || !filters.branch || !filters.subjectId}
                    className="w-full px-5 py-2.5 bg-gray-800 text-white text-sm font-medium rounded-md shadow-sm transition-all hover:bg-gray-900 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4" />
                        Load Dashboard Data
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Students Card */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalStudents}</p>
              </div>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
               <div className="h-full bg-blue-600 w-full"></div>
            </div>
          </div>

          {/* Average Attendance Card */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Avg Attendance</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{avgAttendance.toFixed(1)}%</p>
              </div>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-600 transition-all duration-500"
                style={{ width: `${Math.min(avgAttendance, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Defaulters Card */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Defaulters</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{defaulterCount}</p>
              </div>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-600 transition-all duration-500"
                style={{ width: totalStudents > 0 ? `${(defaulterCount / totalStudents) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={handleViewAttendance}
            className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col items-center justify-center gap-3"
          >
            <div className="p-2 bg-gray-100 rounded-full group-hover:bg-gray-200 transition-colors">
                 <Eye className="w-6 h-6 text-gray-700" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">View Attendance</span>
          </button>

          <button
            onClick={generateDefaulterList}
            className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col items-center justify-center gap-3"
          >
            <div className="p-2 bg-gray-100 rounded-full group-hover:bg-gray-200 transition-colors">
                <BookOpen className="w-6 h-6 text-gray-700" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">Generate List</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col items-center justify-center gap-3"
          >
            <div className="p-2 bg-green-50 rounded-full group-hover:bg-green-100 transition-colors">
                <FileSpreadsheet className="w-6 h-6 text-green-700" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">Export Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col items-center justify-center gap-3"
          >
            <div className="p-2 bg-red-50 rounded-full group-hover:bg-red-100 transition-colors">
                 <FileText className="w-6 h-6 text-red-700" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">Export PDF</span>
          </button>
        </section>

        {/* Empty State */}
        {!loading && totalStudents === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <div className="inline-block p-4 bg-gray-50 rounded-full mb-4">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">No Data Available</h3>
            <p className="text-gray-500 mb-6 text-sm">
              Select filters and click "Load Dashboard Data" to view attendance statistics
            </p>
            <div className="inline-block p-3 bg-yellow-50 rounded-md border border-yellow-100">
              <p className="text-xs text-yellow-800 font-medium">
                <strong>Tip:</strong> Ensure you have subjects assigned and attendance records exist for the selected filters
              </p>
            </div>
          </div>
        )}

        {/* Defaulter Modal */}
        {showDefaulterModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden border border-gray-200">
              <div className="bg-white p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Defaulter List</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Students below <span className="font-semibold text-gray-800">{filters.threshold}%</span> attendance threshold
                </p>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-50">
                {fetchingDefaulters ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-10 h-10 animate-spin text-gray-600" />
                  </div>
                ) : defaulterList.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-block p-4 bg-green-50 rounded-full mb-4 border border-green-100">
                      <Users className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Defaulters Found</h3>
                    <p className="text-gray-500 text-sm">All students meet the attendance criteria!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {defaulterList.map((student, index) => (
                      <div
                        key={student._id || index}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">{student.name}</h4>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Roll: {student.rollNumber}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${
                            student.attendancePercentage < 50 ? 'text-red-600' :
                            student.attendancePercentage < 65 ? 'text-orange-600' :
                            'text-yellow-600'
                          }`}>
                            {student.attendancePercentage?.toFixed(1) || 0}%
                          </div>
                          <p className="text-xs text-gray-500 font-medium">
                            {student.present || 0}/{student.total || 0} classes
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowDefaulterModal(false)}
                  className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-all"
                >
                  Close
                </button>
                {defaulterList.length > 0 && (
                  <>
                    <button
                      onClick={handleExportExcel}
                      className="px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Excel
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;