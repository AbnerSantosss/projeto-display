import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import { mediaService } from '../services/media.service';

const router = Router();

// Configura multer: R2 usa memoryStorage, local usa diskStorage
const storage = mediaService.isR2Enabled()
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, mediaService.getUploadsDir());
      },
      filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '');
        const uniqueName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${safeName}`;
        cb(null, uniqueName);
      },
    });

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// POST /api/media/upload
router.post('/upload', authMiddleware, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      return;
    }

    let url: string;

    if (mediaService.isR2Enabled()) {
      // Upload para Cloudflare R2
      url = await mediaService.uploadToR2({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
    } else {
      // Modo local: arquivo já foi salvo pelo multer diskStorage
      const baseUrl = `${req.protocol}://${req.get('host') || 'localhost'}`;
      url = `${baseUrl}/uploads/${req.file.filename}`;
    }

    res.json({ url, filename: req.file.filename || url.split('/').pop() });
  } catch (error: any) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro ao fazer upload.' });
  }
});

// GET /api/media
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (mediaService.isR2Enabled()) {
      const files = await mediaService.listFilesR2();
      res.json(files);
    } else {
      const baseUrl = `${req.protocol}://${req.get('host') || 'localhost'}`;
      res.json(mediaService.listFiles(baseUrl));
    }
  } catch (error: any) {
    console.error('Erro ao listar mídia:', error);
    res.status(500).json({ error: 'Erro ao listar mídia.' });
  }
});

// DELETE /api/media/:filename
router.delete('/:filename', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const filename = req.params.filename as string;
    let deleted: boolean;

    if (mediaService.isR2Enabled()) {
      deleted = await mediaService.deleteFromR2(filename);
    } else {
      deleted = mediaService.deleteFile(filename);
    }

    if (!deleted) {
      res.status(404).json({ error: 'Arquivo não encontrado.' });
      return;
    }

    res.json({ message: 'Arquivo removido com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao deletar mídia:', error);
    res.status(500).json({ error: 'Erro ao deletar mídia.' });
  }
});

// DELETE /api/media (batch — recebe array de filenames no body)
router.post('/delete-batch', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { filenames } = req.body;

    if (!Array.isArray(filenames) || filenames.length === 0) {
      res.status(400).json({ error: 'Lista de arquivos é obrigatória.' });
      return;
    }

    let deletedCount: number;
    if (mediaService.isR2Enabled()) {
      deletedCount = await mediaService.deleteBatchR2(filenames);
    } else {
      deletedCount = mediaService.deleteBatch(filenames);
    }
    
    res.json({ message: `${deletedCount} arquivo(s) removido(s).` });
  } catch (error: any) {
    console.error('Erro ao deletar mídias em batch:', error);
    res.status(500).json({ error: 'Erro ao deletar mídias.' });
  }
});

export default router;
