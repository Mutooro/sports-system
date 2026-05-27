const nodemailer = require('nodemailer');
const { logger } = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Makerere Sports" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html
    });
    logger.info(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

const sendFixtureNotification = async (userEmail, fixture) => {
  const html = `
    <h2>Upcoming Match Fixture</h2>
    <p>Hello,</p>
    <p>A new match has been scheduled:</p>
    <ul>
      <li><strong>Match:</strong> ${fixture.homeTeam} vs ${fixture.awayTeam}</li>
      <li><strong>Date:</strong> ${new Date(fixture.matchDate).toLocaleString()}</li>
      <li><strong>Venue:</strong> ${fixture.venue}</li>
    </ul>
    <p>Please prepare accordingly.</p>
    <p>Makerere Sports & Recreation Department</p>
  `;

  return sendEmail({
    to: userEmail,
    subject: `New Fixture: ${fixture.homeTeam} vs ${fixture.awayTeam}`,
    html
  });
};

module.exports = { sendEmail, sendFixtureNotification };
