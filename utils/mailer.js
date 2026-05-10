const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,   // Gmail App Password (not your login password)
  },
});

const sendOtp = async (to, otp) => {
  await transporter.sendMail({
    from: `"MRU Alumni Network" <${process.env.MAIL_USER}>`,
    to,
    subject: 'Your Password Reset OTP — MRU Alumni Network',
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;background:#faf8f3;border-top:4px solid #c9a84c;padding:2.5rem 2rem;border-radius:4px;">
        <h2 style="font-size:1.6rem;font-weight:300;color:#0d0d14;margin-bottom:.5rem;">Password Reset</h2>
        <p style="color:#6b6780;font-size:.9rem;margin-bottom:1.8rem;">Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#0d0d14;color:#c9a84c;font-family:'Courier New',monospace;font-size:2.2rem;font-weight:700;letter-spacing:.4em;text-align:center;padding:1.2rem;border-radius:8px;margin-bottom:1.8rem;">
          ${otp}
        </div>
        <p style="color:#6b6780;font-size:.8rem;">If you didn't request this, ignore this email. Your password won't change.</p>
        <hr style="border:none;border-top:1px solid #e8e6f0;margin:1.5rem 0;">
        <p style="color:#aaa;font-size:.75rem;text-align:center;">MRU Alumni Network · Manav Rachna University</p>
      </div>
    `,
  });
};

module.exports = { sendOtp };
