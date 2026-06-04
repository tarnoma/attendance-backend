const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// เปิดใช้งาน CORS ให้เว็บแอป Quasar ของคุณยิงมาใช้งานได้ทุกโดเมน
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send({ message: 'Hello, Attendace Application API is working.' });
});

// API Route สำหรับแลก Token และดึงโปรไฟล์ผู้ใช้
app.post('/api/exchange-token', async (req, res) => {
  console.log("=== Incoming Data from Frontend ===", req.body);
  const { code, redirectUri, clientId, clientSecret } = req.body;

  try {
    const tokenUrl = 'https://psusso.psu.ac.th/application/o/pkt-attendance-0504/token/';

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    // 1. ยิงแลก Token ขอบอกเลยว่ารันบนเซิร์ฟเวอร์แบบนี้ไม่ติด CORS แน่นอน
    const tokenResponse = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    // const tokens = tokenResponse.data;

    // if (!tokens.access_token) {
    //   return res.status(400).json({ error: 'No access token returned from PSU' });
    // }

    // // 2. นำ access_token ไปดึงข้อมูล User Info ต่อทันที
    // const userUrl = 'https://psusso.psu.ac.th/application/o/pkt-attendance-0504/userinfo/';
    // const userResponse = await axios.get(userUrl, {
    //   headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    // });

    // // ส่งข้อมูลโปรไฟล์ผู้ใช้กลับไปให้ฝั่ง Quasar Frontend
    // return res.json(userResponse.data);

    // ส่งข้อมูล Token กลับไปให้ Quasar Frontend ใช้งานต่อ
    if (tokenResponse.data && tokenResponse.data.access_token) {
      return res.json(tokenResponse.data);
    } else {
      return res.status(400).json({ error: "No access token returned from PSU" });
    }

  } catch (error) {
    console.error('OAuth Error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to exchange token',
      details: error.response?.data || error.message
    });
  }
});

// Basic error handling for routes not found
app.use((req, res, next) => {
  res.status(404).send({ message: "Route not found" });
});

// เปิด Port เผื่อกรณีทดสอบในเครื่อง local (ถ้า deploy ขึ้น vercel บรรทัดนี้จะถูกละเว้นอัตโนมัติ)
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;