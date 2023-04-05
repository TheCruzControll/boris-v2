import { ItemType } from "database";

export const UserActions = ItemType;
export type UserAction = typeof UserActions[keyof typeof UserActions];
