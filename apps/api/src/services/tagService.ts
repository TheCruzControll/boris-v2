import { Card, prisma, Tag, User } from "database";

export async function createTag(
  userId: string,
  name: string,
  emoji: string
): Promise<Tag | null> {
  const foundTag = await prisma.tag.findUnique({
    where: {
      userId_name: {
        userId,
        name,
      },
    },
  });

  if (foundTag) {
    return null;
  }
  const createdTag = await prisma.tag.create({
    include: { user: true },
    data: {
      name,
      emoji,
      user: {
        connect: { id: userId },
      },
    },
  });
  return createdTag;
}

export async function getTag(
  userId: string,
  name: string
): Promise<Tag | null> {
  const foundTag = await prisma.tag.findUnique({
    where: {
      userId_name: {
        userId,
        name,
      },
    },
  });
  return foundTag;
}

export async function connectTagToCard(
  userId: string,
  name: string,
  cardId: number
): Promise<Tag> {
  const connectedTag = await prisma.tag.update({
    where: {
      userId_name: {
        userId,
        name,
      },
    },
    data: {
      cards: {
        connect: {
          id: cardId,
        },
      },
    },
  });
  return connectedTag;
}

export async function getCardsForTag(
  userId: string,
  name: string
): Promise<Tag | null> {
  return prisma.tag.findUnique({
    include: {
      cards: true,
    },
    where: {
      userId_name: {
        userId,
        name,
      },
    },
  });
}

export async function deleteTag(userId: string, name: string): Promise<Tag> {
  return prisma.tag.delete({
    where: {
      userId_name: {
        userId,
        name,
      },
    },
  });
}

export async function getAllTags(
  userId: string
): Promise<Array<Tag & { cards: Card[] }>> {
  return prisma.tag.findMany({ include: { cards: true }, where: { userId } });
}
