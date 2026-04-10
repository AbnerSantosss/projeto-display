import path from 'path';
import fs from 'fs';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Garante que a pasta existe
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class MediaService {
  getUploadsDir() {
    return UPLOADS_DIR;
  }

  listFiles(baseUrl: string) {
    const files = fs.readdirSync(UPLOADS_DIR);

    return files
      .filter((f) => f !== '.gitkeep')
      .map((filename) => {
        const filePath = path.join(UPLOADS_DIR, filename);
        const stats = fs.statSync(filePath);
        const ext = path.extname(filename).toLowerCase();

        let mimetype = 'application/octet-stream';
        if (['.jpg', '.jpeg'].includes(ext)) mimetype = 'image/jpeg';
        else if (ext === '.png') mimetype = 'image/png';
        else if (ext === '.gif') mimetype = 'image/gif';
        else if (ext === '.webp') mimetype = 'image/webp';
        else if (ext === '.svg') mimetype = 'image/svg+xml';
        else if (ext === '.mp4') mimetype = 'video/mp4';
        else if (ext === '.webm') mimetype = 'video/webm';
        else if (ext === '.pdf') mimetype = 'application/pdf';

        return {
          name: filename,
          id: filename,
          updated_at: stats.mtime.toISOString(),
          created_at: stats.birthtime.toISOString(),
          last_accessed_at: stats.atime.toISOString(),
          metadata: {
            size: stats.size,
            mimetype,
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
}

export const mediaService = new MediaService();
