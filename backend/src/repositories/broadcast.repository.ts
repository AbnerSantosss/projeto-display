import prisma from '../lib/prisma';

export class BroadcastRepository {
  async findAll() {
    return prisma.broadcast.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async upsert(data: {
    id?: string;
    name: string;
    page: string;
    startTime: string;
    endTime: string;
    isPermanent: boolean;
    displayIds: string;
    active: boolean;
    createdAt?: Date;
    createdBy?: string | null;
  }) {
    return prisma.broadcast.upsert({
      where: { id: data.id || '' },
      update: {
        name: data.name,
        page: data.page,
        startTime: data.startTime,
        endTime: data.endTime,
        isPermanent: data.isPermanent,
        displayIds: data.displayIds,
        active: data.active,
        createdBy: data.createdBy || null,
      },
      create: {
        id: data.id,
        name: data.name,
        page: data.page,
        startTime: data.startTime,
        endTime: data.endTime,
        isPermanent: data.isPermanent,
        displayIds: data.displayIds,
        active: data.active,
        createdAt: data.createdAt || new Date(),
        createdBy: data.createdBy || null,
      },
    });
  }

  async delete(id: string) {
    return prisma.broadcast.delete({ where: { id } });
  }
}

export const broadcastRepository = new BroadcastRepository();
