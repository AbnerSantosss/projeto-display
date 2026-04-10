import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth.routes';
import displaysRoutes from './routes/displays.routes';
import devicesRoutes from './routes/devices.routes';
import broadcastsRoutes from './routes/broadcasts.routes';
import usersRoutes from './routes/users.routes';
import mediaRoutes from './routes/media.routes';
import settingsRoutes from './routes/settings.routes';
import { errorMiddleware } from './middlewares/error.middleware';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middlewares globais
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos de uploads
const uploadsPath = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/displays', displaysRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/broadcasts', broadcastsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorMiddleware);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend disponível em http://localhost:${PORT}`);
  console.log(`📁 Uploads servidos em http://localhost:${PORT}/uploads/`);
});

export default app;
