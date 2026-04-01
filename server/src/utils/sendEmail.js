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
  // Create transporter
  // For development, use ethereal or console log
  // For production, configure with your email service

  let transporter;

  if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
    // Production email configuration
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: 'bniket2107@gma+il.com',
        pass: 'xgve aqpy vvta rocs'
      }
    });
  } else {
    // Development - use console log or ethereal
    // For testing, you can use ethereal.email
    console.log('\n========== EMAIL SENT ==========');
    console.log('To:', options.email);
    console.log('Subject:', options.subject);
    console.log('Reset URL:', options.resetUrl || 'N/A');
    console.log('Message:', options.message || options.html);
    console.log('==================================\n');

    // Return success in development mode
    return {
      success: true,
      messageId: 'dev-mode-' + Date.now(),
      message: 'Email logged to console (development mode)'
    };
  }

  // Prepare email options
  const mailOptions = {
    from: process.env.FROM_EMAIL || 'noreply@growthvalley.com',
    to: options.email,
    subject: options.subject,
    text: options.message || '',
    html: options.html || options.message
  };

  // Send email
  const info = await transporter.sendMail(mailOptions);

  console.log('Email sent: %s', info.messageId);

  return info;
};

module.exports = sendEmail;