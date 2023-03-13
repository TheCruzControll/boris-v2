import { getChance } from "../../singletons/chance";
import { DateTime } from "luxon";
import { createCanvas, loadImage, registerFont } from "canvas";
import { Rank, redis, Skin } from "database";
import { UserAction } from "../../types/users";

interface CardImage {
  skinId: number;
  generation: number;
  name: string;
  url: string;
  rank: Rank;
  championName: string;
}
/*
  Each number is weighted based off of their number
    i.e 1 has 1 entry. 100 has 100 entries etc.
 */
export function getGeneration(): number {
  const arr = Array.from(Array(2000).keys());
  return getChance().weighted(arr, arr);
}

export function getRank(): Rank {
  const ranks = [
    Rank.Iron,
    Rank.Bronze,
    Rank.Silver,
    Rank.Gold,
    Rank.Platinum,
    Rank.Diamond,
    Rank.Master,
    Rank.Grandmaster,
    Rank.Challenger,
  ];
  const weights = [4.05, 24.4, 32.8, 24.7, 10.7, 1.73, 0.18, 0.026, 0.011];
  return getChance().weighted(ranks, weights);
}

export function createCards(
  map: Record<string, Skin>
): Record<string, CardImage> {
  return Object.entries(map).reduce((acc, keyValuePair) => {
    const [id, skin] = keyValuePair;
    const generation = getGeneration();
    const name = skin.name;
    const url = skin.asset;
    const rank = getRank();
    const championName = skin.championName;
    const cardImage = {
      skinId: skin.id,
      generation,
      name,
      url,
      rank,
      championName,
    };
    acc[id] = cardImage;
    return acc;
  }, {} as Record<string, CardImage>);
}
export async function drawImages(
  cards: Record<string, CardImage>
): Promise<Buffer> {
  const largeBorders: Rank[] = [
    Rank.Platinum,
    Rank.Diamond,
    Rank.Master,
    Rank.Grandmaster,
    Rank.Challenger,
  ];
  const largeSkinPadding = 10;

  const borderHeight = 600;
  const borderWidth = 330;
  const borderYPosition = 0;

  const skinPositionOffset = 10;
  const spacing = 10;
  const numOfCards = Object.entries(cards).length;
  registerFont("./assets/BeaufortforLOL-Bold.ttf", { family: "Beaufort" });

  const canvas = createCanvas(
    borderWidth * numOfCards +
      numOfCards * spacing +
      numOfCards * largeSkinPadding,
    borderHeight
  );
  const ctx = canvas.getContext("2d");
  ctx.textAlign = "center";

  console.log("this is cards, ", cards);
  const borders = await Promise.all(
    Object.values(cards).map((card) => {
      console.log("this is card", card);
      return loadImage(`./assets/${card.rank}.png`);
    })
  );
  const images = await Promise.all(
    Object.values(cards).map((card) => {
      return loadImage(card.url);
    })
  );

  for (let i = 0; i < images.length; i++) {
    const cardId = Object.keys(cards)[i];
    const skin = cards[cardId];

    const skinXPosition = borderWidth * i + spacing * i + skinPositionOffset;
    const borderXPosition = borderWidth * i + spacing * i;
    const gradient = ctx.createLinearGradient(0, borderHeight - 10, 0, 0);
    gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(0.2, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(0.3, "rgba(0, 0, 0, 0)");
    // Write "Awesome!"
    ctx.font = "30px Impact";
    ctx.fillStyle = gradient;
    /*
      if large border:
        add largeSkinPadding/2 to skinXPosition
        add largeSkinPadding to border width
   */
    if (largeBorders.includes(skin.rank)) {
      // Background
      ctx.drawImage(
        images[i],
        skinXPosition + largeSkinPadding / 2,
        skinPositionOffset
      );

      // black gradient
      ctx.fillRect(skinXPosition + 10, borderHeight / 8, 300, borderHeight);

      // Text
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.font = 'bold 20pt "Beaufort"';
      const fillTextName =
        skin.name === "default" ? skin.championName : skin.name;
      ctx.fillText(
        fillTextName,
        skinXPosition + borderWidth / 2,
        borderHeight - borderHeight / 7,
        borderWidth - 60
      );
      ctx.fillText(
        `Gen ${skin.generation}`,
        skinXPosition + borderWidth / 2,
        borderHeight - borderHeight / 7 + 40,
        borderWidth - 60
      );

      // Border
      ctx.drawImage(
        borders[i],
        borderXPosition,
        borderYPosition,
        borderWidth + largeSkinPadding,
        borderHeight + 10
      );
    } else {
      // BG
      ctx.drawImage(images[i], skinXPosition + 10, skinPositionOffset);
      // Gradient
      ctx.fillRect(skinXPosition + 10, borderHeight / 8, 300, borderHeight);

      // Text
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.font = 'bold 20pt "Beaufort"';
      const fillTextName =
        skin.name === "default" ? skin.championName : skin.name;
      ctx.fillText(
        fillTextName,
        skinXPosition + borderWidth / 2,
        borderHeight - borderHeight / 7,
        borderWidth - 60
      );
      ctx.fillText(
        `Gen ${skin.generation}`,
        skinXPosition + borderWidth / 2,
        borderHeight - borderHeight / 7 + 40,
        borderWidth - 60
      );

      // Border
      ctx.drawImage(
        borders[i],
        borderXPosition + 10,
        borderYPosition,
        borderWidth - largeSkinPadding,
        borderHeight
      );
    }
  }
  return canvas.toBuffer();
}

export async function canUserMakeAction(
  userId: string,
  action: UserAction
): Promise<boolean> {
  return true;
  const exists: number = await redis.exists(`${userId}-${action}`);
  const cdDuration = await getCooldownDuration(userId, action);
  // 0 means does not exist
  return exists === 0 || (cdDuration.minutes <= 0 && cdDuration.seconds <= 0);
}

export async function getCooldownDuration(
  userId: string,
  action: UserAction
): Promise<{ minutes: number; seconds: number }> {
  const userExpireTime = await redis.get(`${userId}-${action}`);
  if (!userExpireTime) {
    await redis.del(`${userId}-${action}`);
    return { minutes: 0, seconds: 0 };
  }
  const expireTime = DateTime.fromISO(userExpireTime);
  const now = DateTime.now();
  const difference = expireTime.diff(now, ["minutes", "seconds"]);
  return {
    minutes: difference.minutes,
    seconds: difference.seconds,
  };
}
// sets userId to expiring time
export async function trackUserAction(
  userId: string,
  action: UserAction
): Promise<void> {
  if (!(await canUserMakeAction(userId, action))) {
    console.log(`cannot add new action for ${userId}, returning early`);
    return;
  }
  const cdInMinutes = 1;
  const time = DateTime.now().plus({ minutes: cdInMinutes });
  await redis.set(`${userId}-${action}`, time.toISO());
  await redis.expire(`${userId}-${action}`, cdInMinutes * 60);
}
