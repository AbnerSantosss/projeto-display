import path from 'path';
import fs from 'fs';

// Modo local: servir de disco. Modo R2: servir do Cloudflare R2 (S3-compatible).
const USE_R2 = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY && process.env.R2_SECRET_KEY && process.env.R2_BUCKET);

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Garante que a pasta local existe (para dev e fallback)
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// --- R2 Client (lazy-loaded) ---
let s3Client: any = null;

async function getS3Client() {
  if (s3Client) return s3Client;
  const { S3Client } = await import('@aws-sdk/client-s3');
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
  });
  return s3Client;
}

export class MediaService {
  getUploadsDir() {
    return UPLOADS_DIR;
  }

  isR2Enabled() {
    return USE_R2;
  }

  // --- Upload ---
  async uploadToR2(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<string> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await getS3Client();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '');
    const key = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${safeName}`;

    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000', // 1 year cache
    }));

    return `${process.env.R2_PUBLIC_URL}/${key}`;
  }

  // --- List ---
  async listFilesR2() {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const client = await getS3Client();

    const response = await client.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET!,
    }));

    return (response.Contents || []).map((obj: any) => ({
      name: obj.Key,
      id: obj.Key,
      updated_at: obj.LastModified?.toISOString() || new Date().toISOString(),
      created_at: obj.LastModified?.toISOString() || new Date().toISOString(),
      last_accessed_at: obj.LastModified?.toISOString() || new Date().toISOString(),
      metadata: {
        size: obj.Size || 0,
        mimetype: this.getMimeType(obj.Key || ''),
        cacheControl: 'public, max-age=31536000',
      },
      url: `${process.env.R2_PUBLIC_URL}/${obj.Key}`,
    })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // --- Delete ---
  async deleteFromR2(key: string): Promise<boolean> {
    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const client = await getS3Client();
      await client.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
      }));
      return true;
    } catch {
      return false;
    }
  }

  async deleteBatchR2(keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (await this.deleteFromR2(key)) count++;
    }
    return count;
  }

  // --- Local filesystem operations (fallback/dev) ---
  listFiles(baseUrl: string) {
    const files = fs.readdirSync(UPLOADS_DIR);

    return files
      .filter((f) => f !== '.gitkeep')
      .map((filename) => {
        const filePath = path.join(UPLOADS_DIR, filename);
        const stats = fs.statSync(filePath);

        return {
          name: filename,
          id: filename,
          updated_at: stats.mtime.toISOString(),
          created_at: stats.birthtime.toISOString(),
          last_accessed_at: stats.atime.toISOString(),
          metadata: {
            size: stats.size,
            mimetype: this.getMimeType(filename),
            cacheControl: 'max-age=3600',
          },
          url: `${baseUrl}/uploads/${filename}`,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  deleteFile(filename: string): boolean {
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  }

  deleteBatch(filenames: string[]): number {
    let deletedCount = 0;
    for (const filename of filenames) {
      if (this.deleteFile(filename)) deletedCount++;
    }
    return deletedCount;
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif',
      '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4', '.webm': 'video/webm',
      '.pdf': 'application/pdf',
    };
    return mimeMap[ext] || 'application/octet-stream';
  }
}

export const mediaService = new MediaService();
