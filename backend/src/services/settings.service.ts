import prisma from '../lib/prisma';

export class SettingsService {
  async get(key: string): Promise<string | null> {
    const setting = await prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? null;
  }

  async getMultiple(keys: string[]): Promise<Record<string, string>> {
    const settings = await prisma.setting.findMany({
      where: { key: { in: keys } },
    });
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return map;
  }

  async set(key: string, value: string): Promise<void> {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async setMultiple(entries: Record<string, string>): Promise<void> {
    const ops = Object.entries(entries).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );
    await prisma.$transaction(ops);
  }

  /** Retorna as configurações de SMTP (ou null se não preenchidas) */
  async getSmtpConfig(): Promise<{ user: string; pass: string } | null> {
    const cfg = await this.getMultiple(['smtp_user', 'smtp_pass']);
    if (!cfg.smtp_user || !cfg.smtp_pass) return null;
    return { user: cfg.smtp_user, pass: cfg.smtp_pass };
  }
}

export const settingsService = new SettingsService();
