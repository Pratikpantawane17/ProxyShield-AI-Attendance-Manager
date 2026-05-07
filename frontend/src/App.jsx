import React from 'react';
import { useState } from 'react'
import { Routes, Route } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './App.css'
import Signup from './components/Signup'
import Login from './components/Login'
import ForgotPassword from './components/ForgotPassword';
import HomePage from './components/HomePage';
import TimetableManager from './components/TimetableManager';
import LecturesDashboard from './components/LecturesDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import AttendanceView from './components/AttendanceView';
import DefaulterPreviewModal from './components/DefaulterPreviewModal';

function App() {

  return (
    <>

      {/* <h1>This is Navbar.</h1> */}
      {/* Add Naviation bar here */}
      {/* <p> Navbar --> Navigate from here</p> */}

      <Routes>
          {/* Static Routes */}
          <Route path="/signup" element={<Signup/>} />
          <Route path="/login" element={<Login/>} />
          <Route path='/forgot-password' element={ <ForgotPassword/> } />

          <Route path='/teacher/homepage' element={ < HomePage /> } />
          <Route path='/teacher/timetable' element={ < TimetableManager /> } />
          <Route path='/teacher/lectures' element={ < LecturesDashboard /> } />

          {/* Side Features Routes */}
           <Route path='/teacher/dashboard' element={ < TeacherDashboard /> } />
           {/* <Route path='/teacher/attendance' element={ < AttendanceView /> } /> */}
           {/* <Route path='/teacher/defaulter' element={ < DefaulterPreviewModal /> } /> */}
           {/* <Route path='/teacher/dashboard' element={ < TeacherDashboard /> } /> */}

      </Routes>

       <ToastContainer />
    </>
  )
}

export default App


