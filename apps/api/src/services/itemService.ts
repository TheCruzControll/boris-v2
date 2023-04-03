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

export async function transferItems(
  senderId: string,
  receiverId: string,
  items: ItemType[]
) {
  await Promise.all(
    items.map(async (item) => {
      const foundItem = await prisma.item.findFirst({
        where: { type: item, userId: senderId },
      });
      if (!foundItem) {
        throw new Error(`User does not have item ${item}`);
      }
      await prisma.item.update({
        where: { id: foundItem.id },
        data: { userId: receiverId },
      });
    })
  );
}

export async function addManyItemsToUser(userId: string, items: ItemType[]) {
  return prisma.item.createMany({
    data: items.map((item) => {
      return {
        type: item,
        userId,
      };
    }),
  });
}
