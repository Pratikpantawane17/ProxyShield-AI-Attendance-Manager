import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';


const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  // Error states for validation
  const [errors, setErrors] = useState({});
  
  // Loading state for form submission
  const [isLoading, setIsLoading] = useState(false);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
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
      const loginData = {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
         rememberMe: formData.rememberMe,
      };

      console.log("Reach to call ");
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/login`, 
        loginData,
        { withCredentials: true }
      );

      console.log("Reach2 ")
      if (response.status === 200 || response.status === 201) {
        // Store token in localStorage
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        
        toast.success('Login successful.');
        
        // // Request FCM device token here
        // const fcmToken = await requestFCMToken();
        // if (fcmToken) {
        //   try {
        //     await axios.post(`${import.meta.env.VITE_BACKEND_URL}/teacher/save-device-token`,
        //       { deviceToken: fcmToken },

        //       // Delete this part
        //       {
        //         headers: {
        //           Authorization: `Bearer ${localStorage.getItem("token")}`
        //         }
        //       }
        //     );
        //     console.log("Device token saved successfully.");
        //   } catch (err) {
        //     console.error("Error saving device token:", err);
        //   }
        // }

        // Reset form
        setFormData({
          email: '',
          password: '',
          rememberMe: false
        });

        // Navigate to home page after 2 seconds
        setTimeout(() => {
          navigate('/teacher/timetable');
        }, 2000);
      }

    } catch (error) {
      console.log("Error : ", error)
      toast.error(error.response?.data?.message || 'Login failed. Please try again.', {
        position: 'top-right',
        autoClose: 2000,
      }); 
      
    } 

    finally {
      setIsLoading(false);
    }
  };

  // Handle navigation to signup page
  const handleSignupNavigation = () => {
    navigate('/signup');
  };

  // Handle navigation to forgot password page
  const handleForgotPasswordNavigation = () => {
    navigate('/forgot-password');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Login</h1>
          <p className="text-gray-600 text-base">Sign in to your account to manage/mark attendance securely</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="space-y-6">
            
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
              {errors.password && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              
              <button
                type="button"
                onClick={handleForgotPasswordNavigation}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md hover:shadow-lg cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          {/* Signup Navigation Link */}
          <div className="text-center mt-6">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={handleSignupNavigation}
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 cursor-pointer"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;