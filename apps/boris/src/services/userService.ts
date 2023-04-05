import { Card, Item, prisma, User } from "database";

export async function addBalanceToUser(
  userId: string,
  balanceToAdd: number
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      balance: {
        increment: balanceToAdd,
      },
    },
  });
}

export async function subtractBalanceFromUser(
  userId: string,
  balanceToSubtract: number
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      balance: {
        decrement: balanceToSubtract,
      },
    },
  });
}

// bad code, but this is essentially the add and subtract functions but with a transaction
export async function transferUserBalance(
  senderId: string,
  receiverId: string,
  balance: number
) {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: receiverId },
      data: {
        balance: {
          increment: balance,
        },
      },
    }),
    prisma.user.update({
      where: { id: senderId },
      data: {
        balance: {
          decrement: balance,
        },
      },
    }),
  ]);
}

export async function getOrCreateUser(userId: string): Promise<User> {
  return prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, balance: 0 },
    update: {},
  });
}

export async function createUser(discordUserId: string): Promise<User> {
  return prisma.user.create({
    data: {
      id: discordUserId,
      balance: 0,
    },
  });
}

export async function getUser(
  userId: string
): Promise<User & { cards: Card[]; items: Item[] }> {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { cards: true, items: true },
  });
}
