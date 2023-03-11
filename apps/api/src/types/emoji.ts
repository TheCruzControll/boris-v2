import { Rank } from '@prisma/client';

export const emojisToEmojiIds: Record<Rank, string> = {
  [Rank.Iron]: '<:iron:1081478893032181831>',
  [Rank.Bronze]: '<:bronze:1081479064415637576>',
  [Rank.Silver]: '<:silver:1081478890398175253>',
  [Rank.Gold]: '<:gold:1081478887990640670>',
  [Rank.Platinum]: '<:platinum:1081478883964100650>',
  [Rank.Diamond]: '<:diamond:1081478880663195729>',
  [Rank.Master]: '<:master:1081478876137521222>',
  [Rank.Grandmaster]: '<:grandmaster:1081478873490931782>',
  [Rank.Challenger]: '<:challenger:1081478869795753994>'
};

export const FirstEmoji = '⏮️';
export const PrevEmoji = '⬅️';
export const NextEmoji = '➡️';
export const LastEmoji = '⏭️';
