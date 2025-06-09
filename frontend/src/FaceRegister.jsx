import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import './FaceRegister.css'; // import ไฟล์ CSS

export default function FaceRegisterForm() {
  const webcamRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', verificationCode: '' });
  const [loading, setLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);

  // โหลดโมเดลจาก face-api.js
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

  // การจัดการข้อมูลในฟอร์ม
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ฟังก์ชันการยืนยันอีเมล
  const sendVerificationEmail = async () => {
    if (!form.email.trim()) {
      return Swal.fire('กรุณากรอกอีเมลให้ถูกต้อง', '', 'warning');
    }

    setLoading(true);

    try {
      // ส่งคำขอไปยัง Backend เพื่อส่งรหัสยืนยัน
      await axios.post('http://localhost:3001/send-verification-email', {
        email: form.email.trim(),
      });

      setLoading(false);
      setVerificationCodeSent(true);
      Swal.fire({
        icon: 'success',
        title: 'อีเมลยืนยันถูกส่ง',
        text: 'กรุณาตรวจสอบอีเมลของคุณและกรอกรหัสยืนยัน',
      });
    } catch (error) {
      setLoading(false);
      Swal.fire('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถส่งอีเมลได้', 'error');
    }
  };

  // ฟังก์ชันการตรวจสอบรหัสยืนยัน
  const verifyCode = () => {
    if (form.verificationCode !== '123456') {
      return Swal.fire('รหัสยืนยันไม่ถูกต้อง', '', 'error');
    }
    setEmailVerified(true);
    Swal.fire({
      icon: 'success',
      title: 'ยืนยันอีเมลสำเร็จ',
      text: 'สามารถเริ่มต้นการลงทะเบียนใบหน้าได้',
    });
  };

  // การตรวจจับใบหน้าในกล้อง
  useEffect(() => {
    if (!modelsLoaded || loading || !emailVerified) return;

    const interval = setInterval(async () => {
      if (!webcamRef.current || !webcamRef.current.video) return;
      if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) return;

      const detection = await faceapi
        .detectSingleFace(webcamRef.current.video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        clearInterval(interval);
        await registerUser();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [modelsLoaded, loading, form, emailVerified]);

  // ลงทะเบียนผู้ใช้งาน
  const registerUser = async () => {
    if (!modelsLoaded) {
      return Swal.fire('รอโหลดโมเดลให้เสร็จก่อน', '', 'warning');
    }

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      return Swal.fire('กรุณากรอกข้อมูลให้ครบทุกช่อง', '', 'warning');
    }

    setLoading(true);

    try {
      const video = webcamRef.current.video;
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setLoading(false);
        return Swal.fire('ไม่พบใบหน้าในกล้อง กรุณาลองใหม่อีกครั้ง', '', 'error');
      }

      const descriptor = detection.descriptor;
      const buffer = new Uint8Array(descriptor.buffer);
      const base64Embedding = btoa(String.fromCharCode(...buffer));

      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;

      // เรียก API ลงทะเบียน
      await axios.post('http://localhost:3001/register', {
        name: fullName,
        email: form.email.trim(),
        face_embedding: base64Embedding,
      });

      setLoading(false);

      // หลังจากลงทะเบียนสำเร็จ ส่งอีเมลยืนยัน
      Swal.fire({
        icon: 'success',
        title: 'ลงทะเบียนสำเร็จ',
        width: 600,
        text: 'ตรวจสอบอีเมลของคุณเพื่อยืนยันการลงทะเบียน',
      });

      setForm({ firstName: '', lastName: '', email: '', verificationCode: '' });
    } catch (error) {
      setLoading(false);
      Swal.fire('ลงทะเบียนล้มเหลว', error.message || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center custom-register">
      <h2 className="mb-4">ลงทะเบียนใบหน้า</h2>
      <input
        type="text"
        name="firstName"
        placeholder="ชื่อ"
        value={form.firstName}
        onChange={handleChange}
        disabled={loading || emailVerified}
        className="form-control mb-2"
      />
      <input
        type="text"
        name="lastName"
        placeholder="นามสกุล"
        value={form.lastName}
        onChange={handleChange}
        disabled={loading || emailVerified}
        className="form-control mb-2"
      />
      <div className="d-flex mb-3">
        <input
          type="email"
          name="email"
          placeholder="อีเมล"
          value={form.email}
          onChange={handleChange}
          disabled={loading || emailVerified}
          className="form-control"
        />
        <button
          onClick={sendVerificationEmail}
          disabled={loading || emailVerified}
          className="btn btn-secondary ms-2"
        >
          ยืนยันอีเมล
        </button>
      </div>
      {verificationCodeSent && !emailVerified && (
        <div className="mb-3">
          <input
            type="text"
            name="verificationCode"
            placeholder="กรอกรหัสยืนยัน"
            value={form.verificationCode}
            onChange={handleChange}
            disabled={loading || emailVerified}
            className="form-control"
          />
          <button
            onClick={verifyCode}
            disabled={loading || emailVerified}
            className="btn btn-primary mt-2"
          >
            ตรวจสอบรหัส
          </button>
        </div>
      )}
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: 'user' }}
        className="webcam mb-3 rounded border"
        style={{ width: '100%' }}
      />
      <button
        onClick={registerUser}
        disabled={loading || !emailVerified}
        className="btn btn-primary w-100"
      >
        {loading ? 'กำลังลงทะเบียน...' : 'จับใบหน้าและลงทะเบียน'}
      </button>
    </div>
  );
}
