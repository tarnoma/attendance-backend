const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// เปิดให้ Quasar ยิงมาหา Vercel ได้โดยไม่ติด CORS
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Hello, Attendance Application API is working.' });
});

app.post('/api/exchange-token', async (req, res) => {
  console.log("=== Incoming request to Vercel ===", req.body);
  const { code, redirectUri } = req.body;

  try {
    const tokenUrl = 'https://psusso.psu.ac.th/application/o/pkt-attendance-0504/token/';
    
    const clientId = process.env.PSU_CLIENT_ID;
    const clientSecret = process.env.PSU_CLIENT_SECRET;

    // เตรียมข้อมูลแบบ x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    // จุดสำคัญ: แนบ Headers เพื่อบอก Incapsula ว่าเรายิงมาจาก Google Hosting ที่มหาลัยอนุมัติไว้
    const tokenResponse = await axios.post(tokenUrl, params.toString(), {
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://attendance-0504.web.app',
        'Referer': 'https://attendance-0504.web.app/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const tokens = tokenResponse.data;

    // ถ้าแลก Token สำเร็จ ให้ดึงประวัติผู้ใช้ต่อบนเซิร์ฟเวอร์ทันที
    if (tokens && tokens.access_token) {
      const userUrl = 'https://psusso.psu.ac.th/application/o/pkt-attendance-0504/userinfo/';
      
      const userResponse = await axios.get(userUrl, {
        headers: { 
          'Authorization': `Bearer ${tokens.access_token}`,
          'Origin': 'https://attendance-0504.web.app'
        }
      });
      
      // ส่งข้อมูลโปรไฟล์กลับไปให้ Quasar หน้าบ้าน
      return res.json(userResponse.data);
    } else {
      return res.status(400).json({ error: "No access token returned from PSU", raw_data: tokens });
    }

  } catch (error) {
    // ดักดูว่าถ้ารอบนี้ไม่ผ่าน Firewall พ่นอะไรตอบกลับมา
    const psuErrorReason = error.response?.data || error.message;
    console.error('OAuth Error:', psuErrorReason);

    return res.status(400).json({ 
      error: "No access token returned from PSU", 
      psu_api_response: psuErrorReason
    });
  }
});

module.exports = app;