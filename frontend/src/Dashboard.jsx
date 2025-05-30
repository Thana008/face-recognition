import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [attendanceList, setAttendanceList] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // yyyy-mm-dd
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [checkedInEmployees, setCheckedInEmployees] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, [date]);

  const fetchDashboardData = async () => {
    try {
      // ดึงข้อมูลลงเวลาของวันนั้น
      const attendanceRes = await axios.get(`http://localhost:3001/attendance/list?date=${date}`);
      setAttendanceList(attendanceRes.data);

      // ดึงจำนวนพนักงานทั้งหมด
      const totalRes = await axios.get('http://localhost:3001/guest/count');
      setTotalEmployees(totalRes.data.count);

      // ดึงจำนวนพนักงานที่ลงเวลาทำงาน (เช็คอินในวันนั้น)
      const checkedInRes = await axios.get(`http://localhost:3001/attendance/count?date=${date}`);
      setCheckedInEmployees(checkedInRes.data.count);

    } catch (error) {
      console.error(error);
    }
  };

  // แปลงข้อมูลสำหรับกราฟ โดยเอาเวลา check_in, check_out เป็นนาทีในวันนั้น
  const graphData = attendanceList.map(a => {
    const checkInTime = new Date(a.check_in);
    const checkOutTime = a.check_out ? new Date(a.check_out) : null;

    const formatTime = (dateObj) => {
      return `${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
    }

    return {
      name: a.guest_name,
      check_in: formatTime(checkInTime),
      check_out: checkOutTime ? formatTime(checkOutTime) : null,
      isLate: a.isLate,
    };
  });

  // ฟังก์ชันจัดการเปลี่ยนวันที่
  const handleDateChange = (e) => {
    setDate(e.target.value);
  };

  return (
    <div className="container mt-4">
      <h2>Dashboard การลงเวลาทำงาน</h2>

      <div className="mb-3">
        <label htmlFor="dateFilter" className="form-label">เลือกวันที่:</label>
        <input
          type="date"
          id="dateFilter"
          className="form-control"
          value={date}
          onChange={handleDateChange}
        />
      </div>

      <div className="mb-3">
        <strong>จำนวนพนักงานทั้งหมด:</strong> {totalEmployees} <br/>
        <strong>จำนวนพนักงานที่ลงเวลาทำงาน:</strong> {checkedInEmployees}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={graphData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="check_in" stroke="#8884d8" />
          <Line type="monotone" dataKey="check_out" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>

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
