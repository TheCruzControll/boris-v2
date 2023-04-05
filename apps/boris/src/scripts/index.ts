import { DDragon } from "@fightmegg/riot-api";
import { ChampionName, prisma, Skin } from "database";

async function run() {
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
  //     championName: "MonkeyKing",
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
  //   // skinUpdatesToPush.push(championName);
  //   const skins = data[championName].skins;
  //   for (const skin of skins) {
  //     const assetUrl = `http://ddragon.leagueoflegends.com/cdn/img/champion/loading/${championName}_${skin.num}.jpg`;
  //     const skinToCreate: Skin = {
  //       id: parseInt(skin.id),
  //       name: skin.name,
  //       championName,
  //       asset: assetUrl,
  //     };
  //     console.log(championName, assetUrl);
  //     skinsToPush.push(skinToCreate);
  //   }
  // }
  // await prisma.skin.createMany({ data: skinsToPush });
}

run()
  .then(() => console.log("Succesfully seeded db"))
  .catch((err) => console.log("err: ", err.message));
