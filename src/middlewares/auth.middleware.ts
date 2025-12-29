import { Request, Response, NextFunction } from "express";
import { verifyJwt, JwtPayload } from "../auth/jwt.util.js";
import { prisma } from "../lib/prisma.js";

interface AuthRequest extends Request {
  user?: JwtPayload;
}

// Middleware: verify token
export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyJwt(token);
    req.user = payload; // will not contain updated user info, after jwt is issued
    next();
  } catch (err: any) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Middleware: admin only
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  requireAuth(req, res, async () => {
    // Fetch user from DB to get latest role
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
    });

    console.log(user);
    if (user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }
    next();
  });
};
