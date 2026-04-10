import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import { userService } from '../services/user.service';

const router = Router();

// GET /api/users (autenticado — qualquer usuário pode ver a lista)
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await userService.getAll();
    res.json(users);
  } catch (error: any) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

// POST /api/users/invite (autenticado — convida um novo usuário por e-mail)
router.post('/invite', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, role } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Informe um e-mail válido.' });
      return;
    }

    const user = await userService.inviteUser(email.trim(), role);
    res.status(201).json({ 
      message: `Convite enviado com sucesso para ${email}!`, 
      user 
    });
  } catch (error: any) {
    console.error('Erro ao convidar usuário:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Este e-mail já está cadastrado no sistema.' });
      return;
    }
    res.status(400).json({ error: error.message || 'Erro ao convidar usuário.' });
  }
});

// DELETE /api/users/:id (ADMIN ONLY — somente admin pode excluir)
router.delete('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await userService.delete(req.params.id as string);
    res.json({ message: 'Usuário removido com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro ao deletar usuário.' });
  }
});

export default router;
