import { ItemType } from "database";

const dropDescription =
  "*Buy an extra drop. Gets consumed automatically on next Drop command with an active cooldown*";
const claimDescription =
  "*Buy an extra claim. Gets consumed automatically on next Claim with an active cooldown*";

const dropStringArr = [
  dropDescription,
  "```diff",
  "- 5,000 Blue Essence",
  "> /items buy name:Drop quantity:1```",
];

const claimStringArr = [
  dropDescription,
  "```diff",
  "- 5,000 Blue Essence",
  "> /items buy name:Claim quantity:1```",
];

export const itemToPriceMap: { [item in ItemType]: number } = {
  [ItemType.Claim]: 15000,
  [ItemType.Drop]: 15000,
};

export const itemTypeToDescription: { [item in ItemType]: string } = {
  [ItemType.Claim]: claimDescription,
  [ItemType.Drop]: dropDescription,
};

export const itemTypeToDescriptionArray: { [item in ItemType]: string[] } = {
  [ItemType.Claim]: claimStringArr,
  [ItemType.Drop]: dropStringArr,
};
