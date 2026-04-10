import prisma from '../lib/prisma';

export class DeviceRepository {
  async findAll() {
    return prisma.device.findMany({ orderBy: { lastSeen: 'desc' } });
  }

  async findById(id: string) {
    return prisma.device.findUnique({ where: { id } });
  }

  async findByPairingCode(code: string) {
    return prisma.device.findFirst({
      where: { pairingCode: code, status: 'pending' },
    });
  }

  async upsert(id: string, data: { pairingCode: string; status: string }) {
    return prisma.device.upsert({
      where: { id },
      update: {
        pairingCode: data.pairingCode,
        status: data.status,
        lastSeen: new Date(),
      },
      create: {
        id,
        pairingCode: data.pairingCode,
        status: data.status,
        lastSeen: new Date(),
      },
    });
  }

  async update(id: string, data: Record<string, any>) {
    return prisma.device.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.device.delete({ where: { id } });
  }
}

export const deviceRepository = new DeviceRepository();
