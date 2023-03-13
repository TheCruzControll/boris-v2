import { DDragon } from "@fightmegg/riot-api";
import { ChampionName, Skin } from "database";
import { prisma } from "database";

async function run() {
  const ddragon = new DDragon();
  const skinsToPush: Skin[] = [];
  for (const championName of Object.values(ChampionName)) {
    const champ = await ddragon.champion.byName({ championName });
    const { data } = champ;
    const skins = data[championName].skins;
    for (const skin of skins) {
      const assetUrl = `http://ddragon.leagueoflegends.com/cdn/img/champion/loading/${championName}_${skin.num}.jpg`;
      const skinToCreate: Skin = {
        id: parseInt(skin.id),
        name: skin.name,
        championName,
        asset: assetUrl,
      };
      skinsToPush.push(skinToCreate);
    }
  }
  await prisma.skin.createMany({ data: skinsToPush });
}

run()
  .then(() => console.log("Succesfully seeded db"))
  .catch((err) => console.log("err: ", err.message));
