import { User } from "@prisma/client";
import { prisma } from "./index";

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

export async function getUser(userId: string): Promise<User | null> {
  return prisma.user.findFirst({ where: { id: userId } });
}

export async function createUser(discordUserId: string): Promise<User> {
  return prisma.user.create({
    data: {
      id: discordUserId,
      balance: 0,
    },
  });
}
