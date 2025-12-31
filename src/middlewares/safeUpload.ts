// middlewares/safeUpload.ts
import multer from "multer";
import { Request, Response, NextFunction, RequestHandler } from "express";

export const safeUpload =
  (handler: RequestHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err?: any) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          message:
            err.code === "LIMIT_UNEXPECTED_FILE"
              ? "Invalid file field name"
              : err.message,
        });
      }

      if (err) {
        return res.status(400).json({
          message: err.message || "File upload error",
        });
      }

      next();
    });
  };
