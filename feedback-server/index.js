const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ======= 配置 =======
const CONFIG = {
  port: 3200,
  email: {
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    user: '379159075@qq.com',
    pass: process.env.QQ_SMTP_PASS || 'ghfvgykonjypcbeg', // QQ邮箱SMTP授权码
    to: '379159075@qq.com',
  },
};

// Create email transporter
const transporter = nodemailer.createTransport({
  host: CONFIG.email.host,
  port: CONFIG.email.port,
  secure: CONFIG.email.secure,
  auth: {
    user: CONFIG.email.user,
    pass: CONFIG.email.pass,
  },
});

// Feedback log file
const LOG_FILE = path.join(__dirname, 'feedbacks.json');

// Rate limiting (simple in-memory)
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 3; // max 3 per minute per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimit.get(ip);
  if (!record) {
    rateLimit.set(ip, { count: 1, start: now });
    return true;
  }
  if (now - record.start > RATE_LIMIT_WINDOW) {
    rateLimit.set(ip, { count: 1, start: now });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

// POST /api/feedback
app.post('/api/feedback', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { name, email, message } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message too long' });
  }

  const feedback = {
    name: (name || '').slice(0, 100),
    email: (email || '').slice(0, 200),
    message: message.slice(0, 2000),
    ip,
    time: new Date().toISOString(),
  };

  // Save to file
  try {
    let feedbacks = [];
    if (fs.existsSync(LOG_FILE)) {
      feedbacks = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    }
    feedbacks.push(feedback);
    fs.writeFileSync(LOG_FILE, JSON.stringify(feedbacks, null, 2));
  } catch (e) {
    console.error('Failed to save feedback:', e.message);
  }

  // Send email notification
  try {
    await transporter.sendMail({
      from: `"AMZ Tools Feedback" <${CONFIG.email.user}>`,
      to: CONFIG.email.to,
      subject: `[Feedback] ${name || 'Anonymous'} - AMZ Smart Tools`,
      html: `
        <h3>New Feedback from AMZ Smart Tools</h3>
        <p><strong>Name:</strong> ${feedback.name || 'Anonymous'}</p>
        <p><strong>Email:</strong> ${feedback.email || 'Not provided'}</p>
        <p><strong>Time:</strong> ${feedback.time}</p>
        <p><strong>IP:</strong> ${feedback.ip}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-radius: 8px;">${feedback.message}</p>
      `,
    });
    console.log(`[${feedback.time}] Feedback sent to email - from: ${feedback.name || 'anon'}`);
  } catch (e) {
    console.error('Failed to send email:', e.message);
    // Still return success - feedback is saved to file
  }

  res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(CONFIG.port, () => {
  console.log(`Feedback server running on port ${CONFIG.port}`);
});
