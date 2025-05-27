import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import axios from 'axios';

export default function FaceRegister() {
  const webcamRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

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

  const captureAndRegister = async () => {
    if (!modelsLoaded) {
      alert('Loading models...');
      return;
    }

    const video = webcamRef.current.video;
    const result = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!result) {
      alert('No face detected!');
      return;
    }

    const descriptor = result.descriptor; // 128-dimension Float32Array
    const buffer = new Uint8Array(descriptor.buffer);
    const base64Embedding = btoa(String.fromCharCode(...buffer));

    try {
      const res = await axios.post('http://localhost:3001/register', {
        name: 'John Doe',
        email: 'john@example.com',
        face_embedding: base64Embedding,
      });
      alert(' ลงทะเบียนสำเร็จแล้วค่ะ!\n' + JSON.stringify(res.data.guest));
    } catch (err) {
      console.error(err);
      alert(' ลงทะเบียนล้มเหลว');
    }
  };

  return (
    <div>
      <h2>🎥 Face Registration</h2>
      <Webcam
        ref={webcamRef}
        width={400}
        height={300}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: 'user' }}
      />
      <br />
      <button onClick={captureAndRegister}> จับใบหน้าและลงทะเบียน</button>
    </div>
  );
}
