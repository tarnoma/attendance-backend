const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send({ message: 'Hello, Attendance Application API is working.' });
});

// API Route สำหรับแลก Token และดึงโปรไฟล์ผู้ใช้
app.post('/api/exchange-token', async (req, res) => {
  console.log("=== Incoming Data from Frontend ===", req.body);
  const { code, redirectUri } = req.body;

  try {
    const tokenUrl = 'https://psusso.psu.ac.th/application/o/pkt-attendance-0504/token/';
    const userUrl = 'https://psusso.psu.ac.th/application/o/pkt-attendance-0504/userinfo/';

    // ดึงรหัสผ่านลับจากระบบ Vercel Settings ป้องกันรหัสหลุด
    const clientId = process.env.PSU_CLIENT_ID;
    const clientSecret = process.env.PSU_CLIENT_SECRET;

    // 1. จัดเตรียมข้อมูลในรูปแบบ x-www-form-urlencoded ตามมาตรฐาน OpenID ของ PSU
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    // 2. ยิงแลก Access Token กับทางเซิร์ฟเวอร์ PSU
    const tokenResponse = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tokens = tokenResponse.data;

    if (!tokens.access_token) {
      return res.status(400).json({ error: 'No access token returned from PSU' });
    }

    // 3. นำ access_token ที่ได้ ยิงไปดึงข้อมูล User Info เพื่อเอาชื่อ-นามสกุล/รหัสนักศึกษา ต่อทันที
    const userResponse = await axios.get(userUrl, {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });

    // 4. ส่งข้อมูลโปรไฟล์ผู้ใช้จริงกลับไปให้ฝั่ง Quasar Frontend ใช้งานเปิดระบบเช็คชื่อ
    return res.json(userResponse.data);

  } catch (error) {
    const psuErrorReason = error.response?.data || error.message;
    console.error('OAuth Error From PSU:', psuErrorReason);

    const hasClientId = !!process.env.PSU_CLIENT_ID;
    const hasClientSecret = !!process.env.PSU_CLIENT_SECRET; 

    // พ่น Log ละเอียดกรณีที่ PSU ตรวจข้อมูลไม่ผ่าน เพื่อให้หน้าบ้านแก้ไขได้ง่าย
    return res.status(400).json({ 
      error: "No access token returned from PSU", 
      debug_backend_env: {
        is_PSU_CLIENT_ID_loaded: hasClientId,
        is_PSU_CLIENT_SECRET_loaded: hasClientSecret,
        vercel_current_env: process.env.NODE_ENV || "unknown"
      },
      psu_api_response: psuErrorReason
    });
  }
});

// Basic error handling for routes not found
app.use((req, res, next) => {
  res.status(404).send({ message: "Route not found" });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;