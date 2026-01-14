import nodemailer from "nodemailer";

const SMTP_HOST = process.env.MAIL_HOST || "smtp.ethereal.email";
const SMTP_PORT = parseInt(process.env.MAIL_PORT || "587");
const SMTP_USER = process.env.MAIL_USER || "user";
const SMTP_PASS = process.env.MAIL_PASS || "pass";
const SMTP_FROM = process.env.MAIL_FROM || '"Support" <support@example.com>';
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        html,
      });
      console.log("Message sent: %s", info.messageId);
      return info;
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send email");
    }
  }

  async sendVerificationEmail(to: string, code: string) {
    const subject = "Verify your email";
    const html = `
      <h1>Verify your email</h1>
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>This code will expire in 15 minutes.</p>
    `;
    return this.sendEmail(to, subject, html);
  }

  async sendPasswordResetEmail(to: string, link: string) {
    const subject = "Reset your password";
    const html = `
      <h1>Reset your password</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${link}">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 15 minutes.</p>
    `;
    return this.sendEmail(to, subject, html);
  }
}

export const emailService = new EmailService();
