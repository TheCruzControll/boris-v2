import { prisma, User } from "database";

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
