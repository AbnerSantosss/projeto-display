import { displayRepository } from '../repositories/display.repository';

export class DisplayService {
  async getAll() {
    const displays = await displayRepository.findAll();
    return displays.map((d) => ({
      ...d,
      pages: typeof d.pages === 'string' ? JSON.parse(d.pages) : d.pages,
    }));
  }

  async getById(id: string) {
    const display = await displayRepository.findById(id);
    if (!display) return null;
    return {
      ...display,
      pages: typeof display.pages === 'string' ? JSON.parse(display.pages) : display.pages,
    };
  }

  async getBySlug(slug: string) {
    const display = await displayRepository.findBySlug(slug);
    if (!display) return null;
    return {
      ...display,
      pages: typeof display.pages === 'string' ? JSON.parse(display.pages) : display.pages,
    };
  }

  // Retorna apenas o updatedAt — query ultra-leve para o Player checar versão
  async getVersionBySlug(slug: string) {
    return displayRepository.findVersionBySlug(slug);
  }

  async save(data: { id?: string; name: string; slug: string; pages: any }) {
    const pagesStr = typeof data.pages === 'string' ? data.pages : JSON.stringify(data.pages);
    return displayRepository.upsert({
      id: data.id,
      name: data.name,
      slug: data.slug,
      pages: pagesStr,
    });
  }

  async delete(id: string) {
    return displayRepository.delete(id);
  }
}

export const displayService = new DisplayService();
