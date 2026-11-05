import multer from "multer";

export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 8, fields: 4 },
}).array("images", 8);
