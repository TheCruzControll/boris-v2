import { prisma, supabase } from "database";
import { v4 } from "uuid";
import { drawImages } from "../commands/helpers/cardDropHelpers";

async function run() {
  const cardWithoutImage = await prisma.card.findMany({
    where: { url: "" },
    include: { skin: true },
  });
  // const skins = [
  //   {
  //     skinId: skin.id,
  //     generation: cardFromDb.generation,
  //     name: skin.name,
  //     url: skin.asset,
  //     rank: cardFromDb.rank,
  //     championName: skin.championName,
  //     mappedCustomButtonId: uuid.v4(),
  //   },
  // ]
  cardWithoutImage.map(async (card) => {
    const chosenSkin = {
      skinId: card.skin.id,
      generation: card.generation,
      name: card.skin.name,
      url: card.skin.asset,
      rank: card.rank,
      championName: card.skin.championName,
      mappedCustomButtonId: "",
    };
    const cardImage = await drawImages([chosenSkin]);
    const cardUrl = v4();
    supabase.storage.from("cards").upload(`${cardUrl}.png`, cardImage, {
      contentType: "image/png",
      cacheControl: "3600",
      upsert: true,
    });
    await prisma.card.update({
      where: { id: card.id },
      data: {
        url: `https://mprewltrqlcensldqcxe.supabase.co/storage/v1/object/public/cards/${cardUrl}`,
      },
    });
  });

  // console.log(cardWithoutImage);
  // const maliaId = "570740201564012546";
  // const skins:Card[]=[{
  //   generation: 1776,
  //   rank: Rank.Challenger,
  //   masteryPoints: 0,
  //   masteryRank: 0,
  //   skin:{}
  // }]
  // await prisma.card.createMany({
  //   data: [
  //     {
  //       generation: 1776,
  //       rank: Rank.Challenger,
  //       masteryRank: 1,
  //       masteryPoints: 0,
  //       skinId: 143004,
  //       userId: maliaId,
  //     },
  //     {
  //       generation: 908,
  //       rank: Rank.Platinum,
  //       masteryPoints: 0,
  //       masteryRank: 1,
  //       skinId: 147000,
  //       userId: maliaId,
  //     },
  //   ],
  // });
  // await prisma.skin.updateMany({
  //   where: {
  //     championName: ChampionName.MonkeyKing,
  //   },
  //   data: {
  //     championName: ChampionName.Wukong,
  //   },
  // });
  // const skinsToPush = [];
  // const ddragon = new DDragon();
  // for (const championName of Object.values(ChampionName)) {
  //   const champ = await ddragon.champion.byName({ championName });
  //   const { data } = champ;
  //   const skins = data[championName].skins;
  //   for (const skin of skins) {
  //     const skinName = skin.name === "default" ? championName : skin.name;
  //     const skinFromDb = await prisma.skin.findFirst({
  //       where: { id: parseInt(skin.id) },
  //     });
  //     if (!skinFromDb) {
  //       const assetUrl = `http://ddragon.leagueoflegends.com/cdn/img/champion/loading/${championName}_${skin.num}.jpg`;
  //       const skinToCreate: Skin = {
  //         id: parseInt(skin.id),
  //         name: skinName,
  //         championName,
  //         asset: assetUrl,
  //       };
  //       console.log({ championName, assetUrl, skinToCreate });
  //       skinsToPush.push(skinToCreate);
  //     }
  // const assetUrl = `http://ddragon.leagueoflegends.com/cdn/img/champion/loading/${championName}_${skin.num}.jpg`;
  // const skinToCreate: Skin = {
  //   id: parseInt(skin.id),
  //   name: skin.name,
  //   championName,
  //   asset: assetUrl,
  // };
  // console.log(championName, assetUrl);
  // skinsToPush.push(skinToCreate);
  // }
  // }
  // await prisma.skin.createMany({ data: skinsToPush });
  // console.log(skinsToPush.map((skin) => skin.name));
}

run()
  .then(() => console.log("Succesfully seeded db"))
  .catch((err) => console.log("err: ", err.message));
