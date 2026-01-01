import { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/HttpError.js";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  console.error(err);

  return res.status(500).json({
    message: "Internal server error",
  });
};
