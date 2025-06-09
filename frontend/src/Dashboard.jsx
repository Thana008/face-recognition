import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from 'recharts';

export default function Dashboard() {
  const [attendanceList, setAttendanceList] = useState([]);
  const [filterType, setFilterType] = useState('day'); // day, week, month, year
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [checkedInEmployees, setCheckedInEmployees] = useState(0);
  const [otData, setOtData] = useState([]); // สำหรับข้อมูล OT

  useEffect(() => {
    fetchDashboardData();
    fetchOtData(); // ดึงข้อมูล OT
  }, [date, filterType]);

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get(`http://localhost:3001/attendance/filter`, {
        params: { type: filterType, date: date },
      });
      setAttendanceList(res.data);

      const totalRes = await axios.get('http://localhost:3001/guest/count');
      setTotalEmployees(totalRes.data.count);

      const checkedInRes = await axios.get('http://localhost:3001/attendance/count/filter', {
        params: { type: filterType, date: date },
      });
      setCheckedInEmployees(checkedInRes.data.count);

    } catch (error) {
      console.error(error);
    }
  };

  const fetchOtData = async () => {
    try {
      const otRes = await axios.get('http://localhost:3001/attendance/ot');  // API สำหรับ OT
      setOtData(otRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDateChange = (e) => {
    setDate(e.target.value);
  };

  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
  };

  const barData = attendanceList.map(a => {
    const name = a.guest_name;
    const checkIn = a.check_in ? new Date(a.check_in) : null;
    const checkOut = a.check_out ? new Date(a.check_out) : null;

    const formatTimeAsDecimal = (dateObj) => {
      return dateObj ? (dateObj.getHours() + dateObj.getMinutes() / 60).toFixed(2) : null;
    };

    return {
      name,
      check_in_time: formatTimeAsDecimal(checkIn),
      check_out_time: formatTimeAsDecimal(checkOut)
    };
  });

  const otChartData = otData.map(ot => ({
    date: ot.date, 
    otCount: ot.otCount,  // จำนวน OT
  }));

  return (
    <div className="container mt-4">
      <h2>Dashboard การลงเวลาทำงาน</h2>

      <div className="row mb-3">
        <div className="col-md-6">
          <label htmlFor="dateFilter" className="form-label">เลือกวันที่อ้างอิง:</label>
          <input
            type="date"
            id="dateFilter"
            className="form-control"
            value={date}
            onChange={handleDateChange}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">ประเภทช่วงเวลา:</label>
          <select className="form-select" value={filterType} onChange={handleFilterTypeChange}>
            <option value="day">วันเดียว</option>
            <option value="week">สัปดาห์นี้</option>
            <option value="month">เดือนนี้</option>
            <option value="year">ปีนี้</option>
          </select>
        </div>
      </div>

      <div className="mb-3">
        <strong>จำนวนพนักงานทั้งหมด:</strong> {totalEmployees} <br />
        <strong>จำนวนพนักงานที่ลงเวลาทำงาน:</strong> {checkedInEmployees}
      </div>

      <h5 className="mt-4">กราฟเปรียบเทียบเวลาเข้า-ออกงาน (ชั่วโมง.นาที)</h5>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={barData} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
          <XAxis dataKey="name" />
          <YAxis domain={[0, 24]} ticks={[6, 8, 10, 12, 14, 16, 18, 20, 22]} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="check_in_time" stroke="#8884d8" name="เวลาเข้า" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="check_out_time" stroke="#82ca9d" name="เวลาออก" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <h5 className="mt-4">กราฟ OT (Overtime) ของพนักงาน</h5>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={otChartData}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="otCount" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>

      <table className="table table-bordered mt-4">
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
              <td>{a.check_in ? new Date(a.check_in).toLocaleString() : '-'}</td>
              <td>{a.check_out ? new Date(a.check_out).toLocaleString() : '-'}</td>
              <td>{a.isLate ? <span className="text-danger">สาย</span> : 'ตรงเวลา'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
