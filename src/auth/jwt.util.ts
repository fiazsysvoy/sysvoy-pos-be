import jwt, { type Secret } from "jsonwebtoken";

const JWT_SECRET: Secret = process.env.JWT_SECRET || "supersecretkey"; // Change in prod

export interface JwtPayload {
  userId: string;
  role: "ADMIN" | "STAFF";
}

export const signJwt = (
  payload: JwtPayload,
  expiresIn: jwt.SignOptions["expiresIn"] = "1h",
) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyJwt = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
