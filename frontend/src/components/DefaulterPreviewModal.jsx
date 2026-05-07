import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FileDown, Loader2, RefreshCw, Eye } from 'lucide-react';

// Set axios to send cookies with requests
axios.defaults.withCredentials = true;

const DefaulterReports = () => {
  const navigate = useNavigate();
  
  // State management
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchSubject, setSearchSubject] = useState('');
  const [previewReport, setPreviewReport] = useState(null);

  // Fetch reports on component mount and when page/search changes
  useEffect(() => {
    fetchReports();
  }, [page, searchSubject]);

  /**
   * Fetch defaulter reports from API
   */
  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // Get teacher ID from localStorage or state management
      const teacherId = localStorage.getItem('teacherId') || '';
      
      const response = await axios.get('/api/defaulters/reports', {
        params: {
          teacherId,
          page,
          limit,
          subject: searchSubject || undefined
        }
      });

      if (response.data && Array.isArray(response.data)) {
        setReports(response.data);
        // Calculate total pages if pagination info is provided
        if (response.data.length === limit) {
          setTotalPages(page + 1); // Assume there might be more pages
        } else {
          setTotalPages(page);
        }
      } else {
        setReports([]);
      }
    } catch (error) {
      // Handle 401/403 - redirect to login
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        toast.error('Not logged in or unauthorized. Please login.');
        navigate('/login');
      } else {
        toast.error('Failed to load reports. Please try again.');
        console.error('Error fetching reports:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle file download (PDF or Excel)
   */
  const handleDownload = async (reportId, format) => {
    try {
      setDownloadingId(`${reportId}-${format}`);
      
      const response = await axios.get(`/api/defaulters/${reportId}/download`, {
        params: { format },
        responseType: 'blob' // Important for file downloads
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `defaulter-report-${reportId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} downloaded successfully`);
    } catch (error) {
      // Handle 401/403 - redirect to login
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        toast.error('Not logged in or unauthorized. Please login.');
        navigate('/login');
      } else {
        toast.error(`Failed to download ${format.toUpperCase()}. Please try again.`);
        console.error('Error downloading file:', error);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  /**
   * Handle report regeneration
   */
  const handleRegenerate = async (report) => {
    try {
      setRegeneratingId(report._id);
      
      const response = await axios.post('/api/defaulters/generate', {
        subjectId: report.subjectId,
        fromDate: report.fromDate,
        toDate: report.toDate,
        threshold: report.threshold
      });

      if (response.data) {
        toast.success('Report regenerated successfully');
        // Open preview modal with new report data
        setPreviewReport(response.data);
        // Refresh the reports list
        fetchReports();
      }
    } catch (error) {
      // Handle 401/403 - redirect to login
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        toast.error('Not logged in or unauthorized. Please login.');
        navigate('/login');
      } else {
        toast.error('Failed to regenerate report. Please try again.');
        console.error('Error regenerating report:', error);
      }
    } finally {
      setRegeneratingId(null);
    }
  };

  /**
   * Handle view report details
   */
  const handleView = (report) => {
    setPreviewReport(report);
  };

  /**
   * Close preview modal
   */
  const closePreview = () => {
    setPreviewReport(null);
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Format datetime for display
   */
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Defaulter Reports</h1>
        <p className="text-gray-600">View and manage archived finalized defaulter reports</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by subject..."
          value={searchSubject}
          onChange={(e) => {
            setSearchSubject(e.target.value);
            setPage(1); // Reset to first page on search
          }}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => fetchReports()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : reports.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No reports found</p>
          <p className="text-gray-400 mt-2">Try adjusting your search criteria</p>
        </div>
      ) : (
        /* Reports Table */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Threshold</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated At</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"># Students</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report, index) => (
                  <tr key={report._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      Defaulter Report #{report._id.slice(-6)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {report.subjectId?.name || report.subjectId || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(report.fromDate)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(report.toDate)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.threshold}%
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(report.generatedAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.studentsCount || 0}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {/* Download PDF */}
                        <button
                          onClick={() => handleDownload(report._id, 'pdf')}
                          disabled={downloadingId === `${report._id}-pdf`}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Download PDF"
                        >
                          {downloadingId === `${report._id}-pdf` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileDown className="w-4 h-4" />
                          )}
                        </button>

                        {/* Download Excel */}
                        <button
                          onClick={() => handleDownload(report._id, 'excel')}
                          disabled={downloadingId === `${report._id}-excel`}
                          className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                          title="Download Excel"
                        >
                          {downloadingId === `${report._id}-excel` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileDown className="w-4 h-4" />
                          )}
                        </button>

                        {/* Regenerate */}
                        <button
                          onClick={() => handleRegenerate(report)}
                          disabled={regeneratingId === report._id}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                          title="Regenerate Report"
                        >
                          {regeneratingId === report._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>

                        {/* View */}
                        <button
                          onClick={() => handleView(report)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages || reports.length < limit}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Report Details</h2>
                <button
                  onClick={closePreview}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Report ID</label>
                  <p className="text-gray-900">{previewReport._id}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Subject</label>
                  <p className="text-gray-900">{previewReport.subjectId?.name || previewReport.subjectId || 'N/A'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">From Date</label>
                    <p className="text-gray-900">{formatDate(previewReport.fromDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">To Date</label>
                    <p className="text-gray-900">{formatDate(previewReport.toDate)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Threshold</label>
                    <p className="text-gray-900">{previewReport.threshold}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Students Count</label>
                    <p className="text-gray-900">{previewReport.studentsCount || 0}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Generated At</label>
                  <p className="text-gray-900">{formatDateTime(previewReport.generatedAt)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Generated By</label>
                  <p className="text-gray-900">{previewReport.generatedBy || 'N/A'}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleDownload(previewReport._id, 'pdf')}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => handleDownload(previewReport._id, 'excel')}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Download Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefaulterReports;