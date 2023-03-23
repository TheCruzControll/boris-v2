import { Item, ItemType, prisma } from "database";

export async function addItemToUser(
  userId: string,
  item: ItemType
): Promise<Item> {
  const createdItem = await prisma.item.create({
    data: {
      type: item,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
  return createdItem;
}

export async function getAllItems(userId: string): Promise<Item[]> {
  const items = await prisma.item.findMany({ where: { userId } });
  return items;
}

export async function getItemByItemType(
  userId: string,
  type: ItemType
): Promise<Item | null> {
  return prisma.item.findFirst({ where: { userId, type } });
}

export async function deleteItem(id: number): Promise<Item> {
  return prisma.item.delete({ where: { id } });
}
