import { broadcastRepository } from '../repositories/broadcast.repository';

export class BroadcastService {
  async getAll() {
    const broadcasts = await broadcastRepository.findAll();
    return broadcasts.map((b) => ({
      ...b,
      page: typeof b.page === 'string' ? JSON.parse(b.page) : b.page,
      displayIds: typeof b.displayIds === 'string' ? JSON.parse(b.displayIds) : b.displayIds,
    }));
  }

  async save(data: {
    id?: string;
    name: string;
    page: any;
    startTime: string;
    endTime: string;
    isPermanent: boolean;
    displayIds: any;
    active: boolean;
    createdAt?: string;
    createdBy?: string | null;
  }) {
    return broadcastRepository.upsert({
      id: data.id,
      name: data.name,
      page: typeof data.page === 'string' ? data.page : JSON.stringify(data.page),
      startTime: data.startTime,
      endTime: data.endTime,
      isPermanent: data.isPermanent,
      displayIds: typeof data.displayIds === 'string' ? data.displayIds : JSON.stringify(data.displayIds),
      active: data.active,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      createdBy: data.createdBy || null,
    });
  }

  async delete(id: string) {
    return broadcastRepository.delete(id);
  }
}

export const broadcastService = new BroadcastService();
