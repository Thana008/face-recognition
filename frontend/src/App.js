import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

import FaceRegisterForm from './FaceRegister';
import FaceAttendance from './FaceAttendance';
import Dashboard from './Dashboard';

function Navbar() {
  return (
    <nav className="navbar navbar-expand navbar-dark bg-dark px-3">
      <Link className="navbar-brand" to="/">ระบบจดจำใบหน้า</Link>
      <div className="navbar-nav">
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
    <div className="container mt-5 text-center">
      <h2>ยินดีต้อนรับสู่ระบบจดจำใบหน้า</h2>
      <div className="mt-4">
        <button className="btn btn-primary me-3" onClick={() => navigate('/register')}>
          ลงทะเบียนใบหน้า
        </button>
        <button className="btn btn-success" onClick={() => navigate('/attendance')}>
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
