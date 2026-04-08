const nodemailer = require('nodemailer');

/**
 * Send email using nodemailer
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Email message (plain text)
 * @param {string} options.html - Email message (HTML)
 * @returns {Promise<void>}
 */
const sendEmail = async (options) => {
  console.log('=== sendEmail called ===');
  console.log('To:', options.email);
  console.log('Subject:', options.subject);

  // Check if SMTP is configured
  const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD;
  console.log('SMTP configured:', smtpConfigured);
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_USER:', process.env.SMTP_USER ? '***set***' : 'NOT SET');

  if (smtpConfigured) {
    // Create transporter with configured SMTP settings
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // Prepare email options
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@growthvalley.com',
      to: options.email,
      subject: options.subject,
      text: options.message || '',
      html: options.html || options.message
    };

    try {
      // Send email
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Email sending failed:', error.message);
      // Log to console as fallback
      console.log('\n========== EMAIL FALLBACK (SMTP FAILED) ==========');
      console.log('To:', options.email);
      console.log('Subject:', options.subject);
      console.log('Error:', error.message);
      console.log('==================================================\n');
      throw error;
    }
  } else {
    // No SMTP configured - log to console
    console.log('\n========== EMAIL SENT (CONSOLE LOG) ==========');
    console.log('To:', options.email);
    console.log('Subject:', options.subject);
    console.log('Reset URL:', options.resetUrl || 'N/A');
    console.log('Message:', options.message || options.html);
    console.log('==============================================\n');

    // Return success in development mode without SMTP
    return {
      success: true,
      messageId: 'console-log-' + Date.now(),
      message: 'Email logged to console (no SMTP configured)'
    };
  }
};

module.exports = sendEmail;