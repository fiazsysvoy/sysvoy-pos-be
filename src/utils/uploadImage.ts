import cloudinary from "../config/cloudinary.js";

export async function uploadImage(buffer: Buffer, folder = "products") {
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) {
            return reject(error);
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      )
      .end(buffer);
  });
}
