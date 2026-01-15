import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import path from "path";

const SMTP_HOST = process.env.MAIL_HOST || "smtp.ethereal.email";
const SMTP_PORT = parseInt(process.env.MAIL_PORT || "587");
const SMTP_USER = process.env.MAIL_USER || "user";
const SMTP_PASS = process.env.MAIL_PASS || "pass";
const SMTP_FROM =
  process.env.MAIL_FROM || '"Support" <support@example.com>';

export class EmailService {
  private transporter: nodemailer.Transporter;

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

    // Handlebars (HBS) configuration
    const templatesPath = path.resolve(
      process.cwd(),
      "src",
      "email-templates"
    );

    this.transporter.use(
      "compile",
      hbs({
        viewEngine: {
          extname: ".hbs",
          partialsDir: templatesPath,
          defaultLayout: false,
        },
        viewPath: templatesPath,
        extName: ".hbs",
      })
    );
  }

  private async sendEmail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, any>
  ) {
    try {
      const info = await this.transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        template,
        context,
      });

      return info;
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send email");
    }
  }

  async sendVerificationEmail(to: string, code: string) {
    return this.sendEmail(to, "Verify your email", "verification", {
      code,
    });
  }

  async sendInviteEmail(
    email: string,
    orgName: string,
    password: string
  ) {
    const frontendUrl =
      process.env.FRONTEND_URL || "http://localhost:3000";

    return this.sendEmail(
      email,
      "Invite to join organization - POS System",
      "invite",
      {
        orgName,
        password,
        loginLink: `${frontendUrl}/login`,
      }
    );
  }

  async sendPasswordResetEmail(to: string, link: string) {
    return this.sendEmail(to, "Reset your password", "reset-password", {
      resetLink: link,
    });
  }
}

export const emailService = new EmailService();
