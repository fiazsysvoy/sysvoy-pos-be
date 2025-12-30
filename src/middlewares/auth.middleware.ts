import { Request, Response, NextFunction } from "express";
import { verifyJwt, JwtPayload } from "../auth/jwt.util.js";
import { prismaClient } from "../lib/prisma.js";
import { User } from "../../generated/prisma/client.js";

interface AuthRequest extends Request {
  user?: User; // user will be attached after authentication
}

// Middleware: verify token
export const requireAuth = async (
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

    if (!payload || !payload.userId)
      return res.status(401).json({ message: "Invalid token" });

    // Fetch full user from DB
    const user = await prismaClient.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    req.user = user;
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
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }
    next();
  });
};
