import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [attendanceList, setAttendanceList] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const res = await axios.get('http://localhost:3001/attendance/all');
      setAttendanceList(res.data);
    }
    fetchData();
  }, []);

  return (
    <div className="container mt-4">
      <h2>Dashboard การลงเวลาทำงาน</h2>
      <table className="table table-bordered mt-3">
        <thead>
          <tr>
            <th>ชื่อ</th>
            <th>เช็คอิน</th>
            <th>เช็คเอาท์</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {attendanceList.map((a) => (
            <tr key={a.id}>
              <td>{a.guest_name}</td>
              <td>{new Date(a.check_in).toLocaleString()}</td>
              <td>{a.check_out ? new Date(a.check_out).toLocaleString() : '-'}</td>
              <td>{a.isLate ? <span className="text-danger">สาย</span> : 'ตรงเวลา'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
