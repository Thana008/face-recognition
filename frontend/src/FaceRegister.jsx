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
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [loading, setLoading] = useState(false);

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (!modelsLoaded || loading) return;

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
  }, [modelsLoaded, loading, form]);

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

      await axios.post('http://localhost:3001/register', {
        name: fullName,
        email: form.email.trim(),
        face_embedding: base64Embedding,
      });

      setLoading(false);
      Swal.fire({
        icon: 'success',
        title: 'ลงทะเบียนสำเร็จ',
        width: 600,
      });

      setForm({ firstName: '', lastName: '', email: '' });
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
        disabled={loading}
        className="form-control mb-2"
      />
      <input
        type="text"
        name="lastName"
        placeholder="นามสกุล"
        value={form.lastName}
        onChange={handleChange}
        disabled={loading}
        className="form-control mb-2"
      />
      <input
        type="email"
        name="email"
        placeholder="อีเมล"
        value={form.email}
        onChange={handleChange}
        disabled={loading}
        className="form-control mb-3"
      />
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
        disabled={loading}
        className="btn btn-primary w-100"
      >
        {loading ? 'กำลังลงทะเบียน...' : 'จับใบหน้าและลงทะเบียน'}
      </button>
    </div>
  );
}
