
// src/app/api/upload-image/route.ts
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Helper function to convert a File to a Buffer
async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = await fileToBuffer(file);

    // Upload to Cloudinary using upload_stream
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'image' }, // You can set folder, tags, etc. here
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      const readableStream = new Readable();
      readableStream._read = () => {}; // _read is required but can be empty
      readableStream.push(buffer);
      readableStream.push(null); // Signal end of stream
      readableStream.pipe(uploadStream);
    });
    
    if (!uploadResult || !(uploadResult as any).secure_url) {
        console.error('Cloudinary upload failed or did not return a secure_url', uploadResult);
        return NextResponse.json({ error: 'Cloudinary upload failed.' }, { status: 500 });
    }

    return NextResponse.json({ secure_url: (uploadResult as any).secure_url }, { status: 200 });

  } catch (error: any) {
    console.error('Error uploading to Cloudinary:', error);
    // Check if the error object has more details
    let errorMessage = 'Failed to upload image.';
    if (error.message) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    return NextResponse.json({ error: errorMessage, details: error }, { status: 500 });
  }
}
