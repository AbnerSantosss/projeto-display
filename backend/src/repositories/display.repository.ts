import prisma from '../lib/prisma';

export class DisplayRepository {
  async findAll() {
    return prisma.display.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    return prisma.display.findUnique({ where: { id } });
  }

  async findBySlug(slug: string) {
    return prisma.display.findUnique({ where: { slug } });
  }

  // Query ultra-leve: retorna apenas o timestamp de atualização
  async findVersionBySlug(slug: string) {
    return prisma.display.findUnique({
      where: { slug },
      select: { updatedAt: true },
    });
  }

  async upsert(data: { id?: string; name: string; slug: string; pages: string; coverImage?: string | null }) {
    return prisma.display.upsert({
      where: { id: data.id || '' },
      update: {
        name: data.name,
        slug: data.slug,
        pages: data.pages,
        coverImage: data.coverImage ?? undefined,
      },
      create: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        pages: data.pages,
        coverImage: data.coverImage ?? null,
      },
    });
  }

  async delete(id: string) {
    return prisma.display.delete({ where: { id } });
  }
}

export const displayRepository = new DisplayRepository();
