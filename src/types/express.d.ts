import { User } from "../../generated/prisma/client.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      file?: Multer.File;
      files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
    }
  }
}

export {};
