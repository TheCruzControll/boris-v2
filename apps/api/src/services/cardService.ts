import { Card, prisma, Skin } from "database";

export async function getUserCard(
  userId: string,
  cardId?: number | null
): Promise<(Card & { skin: Skin }) | null> {
  if (!cardId) {
    return prisma.card.findFirst({
      include: { user: true, skin: true },
      where: { userId },
      take: -1,
    });
  } else {
    return prisma.card.findFirst({
      include: { user: true, skin: true },
      where: { userId, id: cardId },
    });
  }
}

export async function deleteCard(cardId: number): Promise<Card> {
  const deletedCard = await prisma.card.delete({
    include: { user: true },
    where: { id: cardId },
  });
  return deletedCard;
}