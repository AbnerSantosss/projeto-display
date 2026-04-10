import { deviceRepository } from '../repositories/device.repository';

export class DeviceService {
  async getAll() {
    return deviceRepository.findAll();
  }

  async register(deviceId: string, code: string) {
    return deviceRepository.upsert(deviceId, {
      pairingCode: code,
      status: 'pending',
    });
  }

  async getStatus(deviceId: string) {
    return deviceRepository.findById(deviceId);
  }

  async link(code: string, displayId: string, name: string) {
    const device = await deviceRepository.findByPairingCode(code);
    if (!device) return null;

    return deviceRepository.update(device.id, {
      displayId,
      name,
      status: 'linked',
      pairingCode: null,
    });
  }

  async unlink(deviceId: string) {
    return deviceRepository.delete(deviceId);
  }

  async heartbeat(deviceId: string) {
    return deviceRepository.update(deviceId, { lastSeen: new Date() });
  }
}

export const deviceService = new DeviceService();
