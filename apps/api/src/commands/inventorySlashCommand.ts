import { Card, prisma, Skin } from "database";
import {
  AttachmentBuilder,
  BaseInteraction,
  CommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  TextChannel,
  User,
} from "discord.js";
import * as uuid from "uuid";
import DiscordClient from "../discordClient";
import { Command } from "../types/command";
import { emojisToEmojiIds } from "../types/emoji";
import { drawImages } from "./helpers/cardDropHelpers";
import { Pagination } from "pagination.djs";

async function getSingleCard(
  cardId: string,
  interaction: CommandInteraction,
  client: DiscordClient
): Promise<void> {
  const cardFromDb = await prisma.card.findFirst({
    where: {
      id: parseInt(cardId),
      ownerDiscordId: interaction.user.id,
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

  const { id, generation, rank, masteryPoints, masteryRank } = cardFromDb;
  const exampleEmbed = new EmbedBuilder()
    .setTitle("Card Details")
    .setDescription(`Owned by ${interaction.user.toString()}`)
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

async function getAllCards(
  user: User,
  interaction: CommandInteraction,
  client: DiscordClient
): Promise<void> {
  const cards = await prisma.card.findMany({
    where: {
      ownerDiscordId: user.id,
    },
    include: {
      skin: true,
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

const Inventory: Command = {
  data: new SlashCommandBuilder()
    .setName("inv")
    .setDescription("Show claimed cards")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("card")
        .setDescription("View single card")
        .addStringOption((option) =>
          option.setName("cardid").setDescription("Id of card")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("user")
        .setDescription("View inventory of user")
        .addUserOption((option) =>
          option
            .setName("username")
            .setDescription("Name of user you want to view the inventory of ")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("self").setDescription("View inventory of self")
    ),
  run: async (interaction: CommandInteraction, client: DiscordClient) => {
    // this is weird typing, Command interaction does have options.getSubcommand but the omit messes stuff up
    // @ts-ignore
    switch (interaction.options.getSubcommand()) {
      case "card":
        await getSingleCard(
          // @ts-ignore
          // this is weird typing, Command interaction does have options.getString but the omit messes stuff up
          interaction.options.getString("cardid"),
          interaction,
          client
        );
        return;
      case "user":
        const user = interaction.options.getUser("username");
        if (!user) {
          console.log("theres no user in here with that username");
        }
        await getAllCards(user!, interaction, client);
        return;
      case "self":
        // eslint-disable-next-line no-case-declarations
        await getAllCards(interaction.user, interaction, client);
        return;
    }
  },
};

export default Inventory;
