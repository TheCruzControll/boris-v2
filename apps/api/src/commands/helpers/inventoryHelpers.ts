import {
  AttachmentBuilder,
  CommandInteraction,
  EmbedBuilder,
  TextChannel,
  User,
} from "discord.js";
import DiscordClient from "../../discordClient";
import * as uuid from "uuid";
import { drawImages } from "./cardDropHelpers";
import { emojisToEmojiIds } from "../../types/emoji";
import { Pagination } from "pagination.djs";
import { Card, prisma, Skin } from "database";

export async function getSingleCard(
  cardId: string,
  interaction: CommandInteraction,
  client: DiscordClient
): Promise<void> {
  const cardFromDb = await prisma.card.findFirst({
    where: {
      id: parseInt(cardId),
    },
  });
  if (!cardFromDb) {
    await interaction.deleteReply();
    const channel = client.channels.cache.get(
      interaction.channelId
    ) as TextChannel;
    if (channel) {
      await channel.send(`Could not find card with ID ${cardId}`);
    }
    return;
  }
  const skinFromDb = await prisma.skin.findFirst({
    where: {
      id: cardFromDb.skinId,
    },
  });
  if (!skinFromDb) {
    await interaction.deleteReply();
    const channel = client.channels.cache.get(
      interaction.channelId
    ) as TextChannel;
    if (channel) {
      await channel.send(
        `${interaction.user.toString()} Could not find your card with ID ${cardId}`
      );
    }
    return;
  }

  const skins = [
    {
      skinId: skinFromDb.id,
      generation: cardFromDb.generation,
      name: skinFromDb.name,
      url: skinFromDb.asset,
      rank: cardFromDb.rank,
      championName: skinFromDb.championName,
      mappedCustomButtonId: uuid.v4(),
    },
  ];
  const images = await drawImages(skins);
  const file = new AttachmentBuilder(images).setFile(images, "name.png");

  const { id, generation, rank, masteryPoints, masteryRank, ownerDiscordId } =
    cardFromDb;
  const exampleEmbed = new EmbedBuilder()
    .setTitle("Card Details")
    .setDescription(`Owned by <@${ownerDiscordId}>`)
    .setImage("attachment://name.png")
    .addFields(
      { name: "Id", value: id.toString() },
      { name: "Generation", value: generation.toString() },
      { name: "Rank", value: `${rank}${emojisToEmojiIds[rank]}` },
      { name: "Mastery Points", value: masteryPoints.toString() },
      { name: "Mastery Rank", value: masteryRank.toString() }
    );

  await interaction.followUp({ embeds: [exampleEmbed], files: [file] });
}

const PaginationActions = {
  First: "First",
  Prev: "Prev",
  Next: "Next",
  Last: "Last",
} as const;
export type PaginationActions =
  typeof PaginationActions[keyof typeof PaginationActions];

function buildEmbedFieldString(
  paginatedCards: Array<Card & { skin: Skin }>
): { name: string; value: string }[] {
  return paginatedCards.map((card) => {
    return {
      name: card.skin.name + ":",
      value: `Id:\`${card.id}\` · Gen:\`${card.generation}\` · Rank:${
        emojisToEmojiIds[card.rank]
      }\`${card.rank}\` · Mastery Points:\`${
        card.masteryPoints
      }\` · Mastery Rank:\`${card.masteryRank}\``,
    };
  });
}

export async function getAllCards(
  user: User,
  interaction: CommandInteraction
): Promise<void> {
  const cards = await prisma.card.findMany({
    where: {
      ownerDiscordId: user.id,
    },
    include: {
      skin: true,
    },
    orderBy: {
      id: "asc",
    },
  });
  const embeds = [];

  // @ts-ignore
  const pagination = new Pagination(interaction);

  function paginate<T>(
    array: Array<T>,
    page_size: number,
    page_number: number
  ): Array<T> {
    // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
    return array.slice((page_number - 1) * page_size, page_number * page_size);
  }

  const pages = Math.ceil(cards.length / 10);

  for (let i = 0; i < pages; i++) {
    const paginatedCards: Array<Card & { skin: Skin }> = paginate<
      Card & { skin: Skin }
    >(cards, 10, i + 1);
    const newEmbed = new EmbedBuilder()
      .setTitle(`Card Details`)
      .setDescription(`Cards owned by ${user.toString()}`)
      .addFields(buildEmbedFieldString(paginatedCards));
    embeds.push(newEmbed);
  }

  pagination.setEmbeds(embeds);
  // or if you want to set a common change in all embeds, you can do it by adding a cb.
  pagination.setEmbeds(
    embeds,
    (
      embed: { setFooter: (arg0: { text: string }) => any },
      index: number,
      array: string | any[]
    ) => {
      return embed.setFooter({ text: `Page: ${index + 1}/${array.length}` });
    }
  );
  await pagination.render();
}
