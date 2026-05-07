import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const Signup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    department: '',
    coursesTaught: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: ''
  });

  // Error states for validation
  const [errors, setErrors] = useState({});
  
  // Loading state for form submission
  const [isLoading, setIsLoading] = useState(false);

  // Department options for dropdown
  const departments = [
    { value: 'CSE', label: 'Computer Science & Engineering (CSE)' },
    { value: 'IT', label: 'Information Technology (IT)' },
    { value: 'ECE', label: 'Electronics & Communication Engineering (ECE)' },
    { value: 'ME', label: 'Mechanical Engineering (ME)' },
    { value: 'CE', label: 'Civil Engineering (CE)' },
    { value: 'EE', label: 'Electrical Engineering (EE)' },
    { value: 'CHE', label: 'Chemical Engineering (CHE)' },
    { value: 'BT', label: 'Biotechnology (BT)' },
    { value: 'MATH', label: 'Mathematics' },
    { value: 'PHYSICS', label: 'Physics' },
    { value: 'CHEMISTRY', label: 'Chemistry' }
  ];

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasMinLength = password.length >= 8;
    
    return {
      isValid: hasUppercase && hasNumber && hasSpecialChar && hasMinLength,
      hasUppercase,
      hasNumber,
      hasSpecialChar,
      hasMinLength
    };
  };

  const validateMobile = (mobile) => {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile);
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // Full Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    } else if (!/^[A-Za-z\s]+$/.test(formData.fullName.trim())) {
      newErrors.fullName = 'Full name can only contain letters and spaces';
    }

    // Department validation
    if (!formData.department) {
      newErrors.department = 'Please select a department';
    }

    // Courses validation
    if (!formData.coursesTaught.trim()) {
      newErrors.coursesTaught = 'Please specify courses you teach';
    } else if (formData.coursesTaught.trim().length < 3) {
      newErrors.coursesTaught = 'Please provide at least one course name';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Mobile validation
    if (!formData.mobileNumber) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (!validateMobile(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Mobile number must be exactly 10 digits';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordCheck = validatePassword(formData.password);
      if (!passwordCheck.isValid) {
        if (!passwordCheck.hasMinLength) {
          newErrors.password = 'Password must be at least 8 characters';
        } else if (!passwordCheck.hasUppercase) {
          newErrors.password = 'Password must contain at least one uppercase letter';
        } else if (!passwordCheck.hasNumber) {
          newErrors.password = 'Password must contain at least one number';
        } else if (!passwordCheck.hasSpecialChar) {
          newErrors.password = 'Password must contain at least one special character';
        }
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    setIsLoading(true);

    try {
      // Prepare data for API call
      const signupData = {
        fullName: formData.fullName.trim(),
        department: formData.department,
        coursesTaught: formData.coursesTaught.split(',').map(course => course.trim()).filter(course => course),
        email: formData.email.toLowerCase().trim(),
        mobileNumber: formData.mobileNumber,
        password: formData.password
      };

      console.log("Reach to call ");
      console.log(signupData)

      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/signup`, 
        signupData,
        { withCredentials: true }
      );

      
      console.log("Reach2 ")
      if (response.status === 200 || response.status === 201) {
        toast.success('Account created successfully.');
        
        // Reset form
        setFormData({
          fullName: '',
          department: '',
          coursesTaught: '',
          email: '',
          mobileNumber: '',
          password: '',
          confirmPassword: ''
        });

        // Navigate to login page after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }

    } catch (error) {
      // Handle different types of errors
      toast.error(error.response?.data?.message || 'Signup failed. Please try again.', {
        position: 'top-right',
        autoClose: 3000,
      }); 
      console.log("Error : ", error)
    } 

    finally {
      setIsLoading(false);
    }
  };

  // Handle navigation to login page
  const handleLoginNavigation = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Signup</h1>
          <p className="text-gray-600 text-base">Create your account to manage/mark attendance securely</p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="space-y-6">
            
            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.fullName ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Enter your full name"
              />
              {errors.fullName && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Department Dropdown */}
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.department ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <option value="">Select your department</option>
                {departments.map((dept) => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
              {errors.department && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.department}
                </p>
              )}
            </div>

            {/* Courses Taught Field */}
            <div>
              <label htmlFor="coursesTaught" className="block text-sm font-medium text-gray-700 mb-2">
                Courses Taught <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="coursesTaught"
                name="coursesTaught"
                value={formData.coursesTaught}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.coursesTaught ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="e.g., Data Structures, Algorithms, Web Development"
              />
              <p className="text-gray-500 text-xs mt-1">Separate multiple courses with commas</p>
              {errors.coursesTaught && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.coursesTaught}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="teacher@university.edu"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Mobile Number Field */}
            <div>
              <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="mobileNumber"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.mobileNumber ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="1234567890"
                maxLength="10"
              />
              {errors.mobileNumber && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.mobileNumber}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Enter your password"
              />
              <p className="text-gray-500 text-xs mt-1">
                Must be 8+ characters with uppercase, number & special character
              </p>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl  cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          {/* Login Navigation Link */}
          <div className="text-center mt-6">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={handleLoginNavigation}
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 cursor-pointer"
              >
                Login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;