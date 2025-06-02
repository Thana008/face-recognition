import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import Swal from 'sweetalert2';

import './FaceAttendance.css';  // import ไฟล์ CSS

export default function FaceAttendance() {
  const webcamRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceList, setAttendanceList] = useState([]);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    };
    loadModels();
  }, []);

  useEffect(() => {
    fetchAttendance(selectedDate);
  }, [selectedDate]);

  const fetchAttendance = async (date) => {
    try {
      const response = await axios.get('http://localhost:3001/attendance/list', { params: { date } });
      setAttendanceList(response.data);
    } catch (error) {
      console.error(error);
      Swal.fire('ไม่สามารถโหลดข้อมูลได้', error.message, 'error');
    }
  };

  const getStatus = (checkIn, checkOut) => {
    if (checkIn) {
      const checkInTime = new Date(checkIn);
      const dateString = checkInTime.toDateString();
      if (checkInTime >= new Date(dateString + ' 08:30:00') && checkInTime <= new Date(dateString + ' 16:30:00')) {
        return 'สาย';
      } else if (checkInTime >= new Date(dateString + ' 07:00:00') && checkInTime < new Date(dateString + ' 08:30:00')) {
        return 'ตรงเวลา';
      }
    }
    if (checkOut) {
      const checkOutTime = new Date(checkOut);
      const dateString = checkOutTime.toDateString();
      if (checkOutTime > new Date(dateString + ' 18:30:00')) {
        return 'OT';
      } else if (checkOutTime >= new Date(dateString + ' 17:00:00')) {
        return 'ออกงาน';
      }
    }
    return '-';
  };

  useEffect(() => {
    if (!modelsLoaded || loading) return;
    const interval = setInterval(async () => {
      if (!webcamRef.current || !webcamRef.current.video) return;

      const detection = await faceapi
        .detectSingleFace(webcamRef.current.video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        clearInterval(interval);
        handleCheckAttendance();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [modelsLoaded, loading]);

  const handleCheckAttendance = async () => {
    if (!modelsLoaded) return Swal.fire('กำลังโหลดโมเดล...', '', 'info');

    setLoading(true);
    try {
      const video = webcamRef.current.video;
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setLoading(false);
        return Swal.fire('ไม่พบใบหน้า กรุณาลองใหม่อีกครั้ง', '', 'error');
      }

      const descriptor = detection.descriptor;
      const buffer = new Uint8Array(descriptor.buffer);
      const base64Embedding = btoa(String.fromCharCode(...buffer));

      const response = await axios.post('http://localhost:3001/attendance', {
        face_embedding: base64Embedding,
      });

      setLoading(false);

      if (response.data.isLate !== undefined) {
        Swal.fire({
          icon: 'success',
          title: response.data.message,
          html: `
            <p>ชื่อ: ${response.data.guest.name}</p>
            <p>เวลาเช็คอิน: ${new Date(response.data.attendance.check_in).toLocaleTimeString()}</p>
            <p>สถานะ: ${response.data.isLate ? '<span style="color:red">สาย</span>' : 'ตรงเวลา'}</p>
          `,
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: response.data.message,
          html: `
            <p>ชื่อ: ${response.data.guest.name}</p>
            <p>เวลาเช็คเอาท์: ${new Date(response.data.attendance.check_out).toLocaleTimeString()}</p>
          `,
        });
      }

      fetchAttendance(selectedDate);

    } catch (error) {
      setLoading(false);
      Swal.fire('เกิดข้อผิดพลาด', error.response?.data?.message || error.message, 'error');
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center custom-attendance">
      <h2>ลงเวลาทำงานด้วยใบหน้า</h2>
      <div className="mb-3">
        <label htmlFor="dateFilter">เลือกวันที่: </label>
        <input
          id="dateFilter"
          type="date"
          className="form-control mb-3"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: 'user' }}
        className="webcam mb-3 rounded border"
        style={{ width: '100%' }}
      />
      <button
        className="btn w-100 mb-4"
        onClick={handleCheckAttendance}
        disabled={loading}
      >
        {loading ? 'กำลังประมวลผล...' : 'สแกนใบหน้าและลงเวลา'}
      </button>
      <table className="table table-bordered table-striped">
        <thead>
          <tr>
            <th>ชื่อ</th>
            <th>เช็คอิน</th>
            <th>เช็คเอาท์</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {attendanceList.map((item) => (
            <tr key={item.id}>
              <td>{item.guest_name}</td>
              <td>{item.check_in ? new Date(item.check_in).toLocaleString() : '-'}</td>
              <td>{item.check_out ? new Date(item.check_out).toLocaleString() : '-'}</td>
              <td>{getStatus(item.check_in, item.check_out)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
