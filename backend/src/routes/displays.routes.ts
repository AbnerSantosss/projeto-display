import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { displayService } from '../services/display.service';

const router = Router();

// GET /api/displays
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const displays = await displayService.getAll();
    res.json(displays);
  } catch (error: any) {
    console.error('Erro ao listar displays:', error);
    res.status(500).json({ error: 'Erro ao listar displays.' });
  }
});

// GET /api/displays/slug/:slug/version — Endpoint LEVE para check de versão (Player)
router.get('/slug/:slug/version', async (req: Request, res: Response): Promise<void> => {
  try {
    const version = await displayService.getVersionBySlug(req.params.slug as string);

    if (!version) {
      res.status(404).json({ error: 'Display não encontrado.' });
      return;
    }

    // Cache condicional via ETag
    const etag = `"${version.updatedAt.getTime()}"`;
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res.set('ETag', etag);
    res.set('Cache-Control', 'no-cache');
    res.json({ updatedAt: version.updatedAt.getTime() });
  } catch (error: any) {
    console.error('Erro ao buscar versão do display:', error);
    res.status(500).json({ error: 'Erro ao buscar versão.' });
  }
});

// GET /api/displays/slug/:slug (PÚBLICO — Player)
router.get('/slug/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const display = await displayService.getBySlug(req.params.slug as string);

    if (!display) {
      res.status(404).json({ error: 'Display não encontrado.' });
      return;
    }

    // Cache condicional via ETag
    const etag = `"${display.updatedAt}"`;
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res.set('ETag', etag);
    res.set('Cache-Control', 'no-cache');
    res.json(display);
  } catch (error: any) {
    console.error('Erro ao buscar display por slug:', error);
    res.status(500).json({ error: 'Erro ao buscar display.' });
  }
});

// GET /api/displays/player/:id (PÚBLICO — Player busca display após vinculação)
router.get('/player/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const display = await displayService.getById(req.params.id as string);

    if (!display) {
      res.status(404).json({ error: 'Display não encontrado.' });
      return;
    }

    res.json(display);
  } catch (error: any) {
    console.error('Erro ao buscar display para player:', error);
    res.status(500).json({ error: 'Erro ao buscar display.' });
  }
});

// GET /api/displays/:id (AUTENTICADO — Dashboard)
router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const display = await displayService.getById(req.params.id as string);

    if (!display) {
      res.status(404).json({ error: 'Display não encontrado.' });
      return;
    }

    // Cache condicional via ETag
    const etag = `"${display.updatedAt}"`;
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res.set('ETag', etag);
    res.set('Cache-Control', 'no-cache');
    res.json(display);
  } catch (error: any) {
    console.error('Erro ao buscar display:', error);
    res.status(500).json({ error: 'Erro ao buscar display.' });
  }
});

// POST /api/displays (Cria ou atualiza)
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name, slug, pages } = req.body;

    if (!name || !slug) {
      res.status(400).json({ error: 'Nome e slug são obrigatórios.' });
      return;
    }

    const display = await displayService.save({ id, name, slug, pages: pages || [] });
    res.json(display);
  } catch (error: any) {
    console.error('Erro ao salvar display:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Já existe um display com esse slug.' });
      return;
    }
    res.status(500).json({ error: 'Erro ao salvar display.' });
  }
});

// DELETE /api/displays/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await displayService.delete(req.params.id as string);
    res.json({ message: 'Display removido com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao deletar display:', error);
    res.status(500).json({ error: 'Erro ao deletar display.' });
  }
});

export default router;
