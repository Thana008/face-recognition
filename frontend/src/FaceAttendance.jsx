import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function FaceAttendance() {
  const webcamRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
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
    } catch (error) {
      setLoading(false);
      Swal.fire('เกิดข้อผิดพลาด', error.response?.data?.message || error.message, 'error');
    }
  };

  return (
    <div className="container mt-4" style={{ maxWidth: 450 }}>
      <h2>ลงเวลาทำงานด้วยใบหน้า</h2>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: 'user' }}
        className="mb-3 rounded border"
        style={{ width: '100%' }}
      />
      <button
        className="btn btn-primary w-100"
        onClick={handleCheckAttendance}
        disabled={loading}
      >
        {loading ? 'กำลังประมวลผล...' : 'สแกนใบหน้าและลงเวลา'}
      </button>
    </div>
  );
}
