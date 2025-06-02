import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

import FaceRegisterForm from './FaceRegister';
import FaceAttendance from './FaceAttendance';
import Dashboard from './Dashboard';

function Navbar() {
  return (
    <nav className="navbar navbar-expand navbar-dark px-3 custom-navbar">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Lato:wght@300&display=swap');

          .custom-navbar {
            background-color: #000000;
          }
          .custom-navbar .navbar-nav {
            margin-left: auto;
            margin-right: auto;
          }
          .custom-navbar .nav-link {
            font-family: 'Lato', sans-serif;
            font-weight: 300;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 15px 20px;
            margin: 0;
            border-radius: 0;
            transition: background-color 0.3s ease;
            height: 100%;
            display: flex;
            align-items: center;
          }
          .custom-navbar .nav-link:hover {
            background-color: #555;
          }
          .navbar {
            padding-top: 0;
            padding-bottom: 0;
          }
        `}
      </style>
      <div className="navbar-nav mx-auto">
        <Link className="nav-link" to="/">หน้าแรก</Link>
        <Link className="nav-link" to="/register">ลงทะเบียนใบหน้า</Link>
        <Link className="nav-link" to="/attendance">ลงเวลาเข้างาน</Link>
        <Link className="nav-link" to="/dashboard">Dashboard</Link>
      </div>
    </nav>
  );
}

function Home() {
  const navigate = useNavigate();

  return (
    <div className="d-flex justify-content-center align-items-center custom-home">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@200&display=swap');
          .custom-home {
            height: 100vh;
            flex-direction: column;
            background: linear-gradient(135deg,rgb(83, 83, 83) 0%,rgb(7, 7, 7) 100%);
          }
          .custom-home h2 {
            font-family: 'Poppins', sans-serif;
            font-size: 4rem;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 3rem;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
          }
          .custom-home .btn {
            background-color: #000000;
            color: #ffffff;
            border: none;
            border-radius: 0;
            padding: 15px 30px;
            margin: 0 15px;
            font-size: 1.2rem;
            font-family: 'Poppins', sans-serif;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          }
          .custom-home .btn:hover {
            background-color: #444;
            transform: translateY(-2px);
            box-shadow: 0 6px 10px rgba(0, 0, 0, 0.5);
          }
        `}
      </style>
      <h2>ยินดีต้อนรับสู่ระบบจดจำใบหน้า</h2>
      <div>
        <button className="btn" onClick={() => navigate('/register')}>
          ลงทะเบียนใบหน้า
        </button>
        <button className="btn" onClick={() => navigate('/attendance')}>
          ลงเวลาเข้างาน
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<FaceRegisterForm />} />
        <Route path="/attendance" element={<FaceAttendance />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;