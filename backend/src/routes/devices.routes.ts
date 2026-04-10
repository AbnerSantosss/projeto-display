import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { deviceService } from '../services/device.service';

const router = Router();

// GET /api/devices
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const devices = await deviceService.getAll();
    res.json(
      devices.map((d) => ({
        id: d.id,
        pairing_code: d.pairingCode,
        display_id: d.displayId,
        status: d.status,
        last_seen: d.lastSeen.getTime(),
        name: d.name,
      }))
    );
  } catch (error: any) {
    console.error('Erro ao listar dispositivos:', error);
    res.status(500).json({ error: 'Erro ao listar dispositivos.' });
  }
});

// POST /api/devices/register (PÚBLICO — dispositivo se registra)
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId, code } = req.body;

    if (!deviceId || !code) {
      res.status(400).json({ error: 'deviceId e code são obrigatórios.' });
      return;
    }

    await deviceService.register(deviceId, code);
    res.json({ message: 'Dispositivo registrado.' });
  } catch (error: any) {
    console.error('Erro ao registrar dispositivo:', error);
    res.status(500).json({ error: 'Erro ao registrar dispositivo.' });
  }
});

// GET /api/devices/:id/status (PÚBLICO — dispositivo verifica seu status)
router.get('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const device = await deviceService.getStatus(req.params.id as string);

    if (!device) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    res.json({
      id: device.id,
      pairing_code: device.pairingCode,
      display_id: device.displayId,
      status: device.status,
      last_seen: device.lastSeen.getTime(),
      name: device.name,
    });
  } catch (error: any) {
    console.error('Erro ao buscar status do dispositivo:', error);
    res.status(500).json({ error: 'Erro ao buscar status.' });
  }
});

// POST /api/devices/link
router.post('/link', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, displayId, name } = req.body;

    if (!code || !displayId) {
      res.status(400).json({ error: 'Código e displayId são obrigatórios.' });
      return;
    }

    const device = await deviceService.link(code, displayId, name);

    if (!device) {
      res.status(404).json({ error: 'Dispositivo não encontrado ou já vinculado.' });
      return;
    }

    res.json({ message: 'Dispositivo vinculado com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao vincular dispositivo:', error);
    res.status(500).json({ error: 'Erro ao vincular dispositivo.' });
  }
});

// PATCH /api/devices/:id/heartbeat (PÚBLICO)
router.patch('/:id/heartbeat', async (req: Request, res: Response): Promise<void> => {
  try {
    await deviceService.heartbeat(req.params.id as string);
    res.json({ message: 'Heartbeat registrado.' });
  } catch (error: any) {
    console.error('Erro no heartbeat:', error);
    res.status(500).json({ error: 'Erro no heartbeat.' });
  }
});

// DELETE /api/devices/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await deviceService.unlink(req.params.id as string);
    res.json({ message: 'Dispositivo removido.' });
  } catch (error: any) {
    console.error('Erro ao remover dispositivo:', error);
    res.status(500).json({ error: 'Erro ao remover dispositivo.' });
  }
});

export default router;
