import { prismaClient } from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { emailService } from "../../lib/email.js";
import { HttpError } from "../../utils/HttpError.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export class AuthService {
  async signup(name: string, email: string, password: string) {
    const userExists = await prismaClient.user.findUnique({
      where: { email },
    });

    if (userExists) {
      throw new HttpError("User already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const user = await prismaClient.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        verificationCode,
        verificationCodeExpiresAt,
        status: "UNVERIFIED_EMAIL",
      },
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Send email asynchronously
    emailService
      .sendVerificationEmail(email, verificationCode)
      .catch(console.error);

    return user;
  }

  async verifyEmail(email: string, code: string) {
    const user = await prismaClient.user.findUnique({ where: { email } });
    if (!user) throw new HttpError("User not found", 404);

    if (
      user.verificationCode !== code ||
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt < new Date()
    ) {
      throw new HttpError("Invalid or expired verification code", 400);
    }

    const updatedUser = await prismaClient.user.update({
      where: { email },
      data: {
        status: "ORG_UNATTACHED",
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async resendVerification(email: string) {
    const user = await prismaClient.user.findUnique({ where: { email } });
    if (!user) throw new HttpError("User not found");
    if (user.status !== "UNVERIFIED_EMAIL")
      throw new HttpError("Email already verified", 400);

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prismaClient.user.update({
      where: { email },
      data: { verificationCode, verificationCodeExpiresAt },
    });

    emailService
      .sendVerificationEmail(email, verificationCode)
      .catch(console.error);
    return { message: "Verification code sent" };
  }

  async generateJwt(userId: string) {
    const user = await prismaClient.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError("User not found", 404);

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
      },
      JWT_SECRET,
      {
        expiresIn: "1y",
      },
    );

    return token;
  }

  async createOrganization(userId: string, name: string) {
    const user = await prismaClient.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError("User not found");
    if (user.organizationId)
      throw new HttpError("User already belongs to an organization", 400);
    if (user.status === "UNVERIFIED_EMAIL") {
      throw new HttpError(
        "Please verify your email before creating an organization",
        400,
      );
    }

    return await prismaClient.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          createdById: userId,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          role: "OWNER",
          status: "ACTIVE",
          organizationId: org.id,
        },
      });

      return org;
    });
  }

  async signin(email: string, password: string) {
    const user = await prismaClient.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new HttpError("Invalid credentials", 400);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new HttpError("Invalid credentials", 400);
    }

    // if (user.status !== "ACTIVE") {
    //   throw new HttpError("please complete the signup process first.", 400);
    // }

    const token = jwt.sign(
      { userId: user.id, role: user.role, organizationId: user.organizationId },
      JWT_SECRET,
      {
        expiresIn: "1y",
      },
    );

    return { token, status: user.status };
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await prismaClient.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError("User not found", 404);

    const valid = await bcrypt.compare(oldPass, user.password);
    if (!valid) throw new HttpError("Invalid old password", 400);

    const hashedPassword = await bcrypt.hash(newPass, 10);
    await prismaClient.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: "Password updated successfully" };
  }

  async forgotPassword(email: string) {
    const user = await prismaClient.user.findUnique({ where: { email } });
    if (!user) throw new HttpError("User not found", 404); // Or fail silently for security

    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prismaClient.user.update({
      where: { email },
      data: { passwordResetToken: token, passwordResetExpiresAt: expires },
    });

    const frontendUrl = process.env.FRONTEND_URL;
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    emailService.sendPasswordResetEmail(email, resetLink).catch(console.error);
    return { message: "Password reset instructions sent" };
  }

  async verifyResetToken(token: string) {
    const user = await prismaClient.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) throw new HttpError("Invalid or expired token", 400);

    return { message: "Token is valid" };
  }

  async resetPassword(token: string, newPass: string) {
    const user = await prismaClient.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) throw new HttpError("Invalid or expired token", 400);

    const hashedPassword = await bcrypt.hash(newPass, 10);
    await prismaClient.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    return { message: "Password reset successfully" };
  }
}
