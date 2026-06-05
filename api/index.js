const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// เปิดใช้งาน CORS ให้เว็บแอป Quasar ยิงมาใช้งานได้โดยไม่ติด CORS
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send({ message: 'Hello, Attendance Application API is working.' });
});

// API Route สำหรับแลก Token และดึงโปรไฟล์ผู้ใช้
app.post('/api/exchange-token', async (req, res) => {
  console.log("=== Incoming Dataจาก Quasar Frontend ===", req.body);
  const { code, redirectUri } = req.body;

  try {
    const tokenUrl = 'https://psusso.psu.ac.th/application/o/pkt-attendance-0504/token/';

    const clientId = process.env.PSU_CLIENT_ID;
    const clientSecret = process.env.PSU_CLIENT_SECRET;

    // 1. จัดเตรียมข้อมูลในรูปแบบ Object ทั่วไปตามที่ Axios และคู่มือมหาลัยเรียกใช้
    const requestData = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    };

    // 2. ยิงแลก Token โดยใช้การแปลงแบบพารามิเตอร์เพื่อให้ฝั่งมหาลัยอ่านค่าได้ราบรื่น
    const tokenResponse = await axios.post(
      tokenUrl, 
      new URLSearchParams(requestData).toString(), 
      {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://attendance-0504.web.app',
          'Referer': 'https://attendance-0504.web.app/'
        }
      }
    );

    const tokens = tokenResponse.data;

    // 3. ถ้าได้ access_token มาแล้ว ให้ลุยดึงโปรไฟล์ต่อทันทีเพื่อความเบ็ดเสร็จ
    if (tokens && tokens.access_token) {
      const userUrl = 'https://psusso.psu.ac.th/application/o/pkt-attendance-0504/userinfo/';
      
      const userResponse = await axios.get(userUrl, {
        headers: { 
          'Authorization': `Bearer ${tokens.access_token}`,
          'Origin': 'https://attendance-0504.web.app'
        }
      });
      
      // ส่งข้อมูล User Profile สำเร็จกลับไปให้ Quasar หน้าบ้านใช้งาน
      return res.json(userResponse.data);
    } else {
      return res.status(400).json({ error: "No access token returned from PSU", raw_data: tokens });
    }

  } catch (error) {
    const psuErrorReason = error.response?.data || error.message;
    console.error('OAuth Error From PSU:', psuErrorReason);

    const hasClientId = !!process.env.PSU_CLIENT_ID;
    const hasClientSecret = !!process.env.PSU_CLIENT_SECRET; 

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

// Basic error handling
app.use((req, res, next) => {
  res.status(404).send({ message: "Route not found" });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;