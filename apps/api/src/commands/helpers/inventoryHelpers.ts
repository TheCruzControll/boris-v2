import {
  ActionRowBuilder,
  AttachmentBuilder,
  CommandInteraction,
  EmbedBuilder,
  Events,
  SelectMenuComponentOptionData,
  StringSelectMenuBuilder,
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
    include: {
      user: true,
    },
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

  const { id, generation, rank, masteryPoints, masteryRank, user } = cardFromDb;
  const exampleEmbed = new EmbedBuilder()
    .setTitle("Card Details")
    .setDescription(`Owned by <@${user.id}>`)
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

const inventorySortingDropdownOptions: SelectMenuComponentOptionData[] = [
  {
    label: "ID (asc)",
    description: "Sort by ID ascending",
    value: "id:asc",
  },
  {
    label: "ID (desc)",
    description: "Sort by ID descending",
    value: "id:desc",
  },
  {
    label: "Gen (asc)",
    description: "Sort by Gen ascending",
    value: "generation:asc",
  },
  {
    label: "Gen (desc)",
    description: "Sort by Gen descending",
    value: "generation:desc",
  },
  {
    label: "Rank (asc)",
    description: "Sort by Rank ascending",
    value: "rank:asc",
  },
  {
    label: "Rank (desc)",
    description: "Sort by Rank descending",
    value: "rank:desc",
  },
  {
    label: "Mastery Points (asc)",
    description: "Sort by Mastery Points ascending",
    value: "masteryPoints:asc",
  },
  {
    label: "Mastery Points (desc)",
    description: "Sort by Mastery Points descending",
    value: "masteryPoints:desc",
  },
  {
    label: "Mastery Rank (asc)",
    description: "Sort by Mastery Rank ascending",
    value: "masteryRank:asc",
  },
  {
    label: "Mastery Rank (desc)",
    description: "Sort by Mastery Rank descending",
    value: "masteryRank:desc",
  },
  {
    label: "Champion Name (asc)",
    description: "Sort by Champion Name ascending",
    value: "championName:asc",
  },
  {
    label: "Champion Name (desc)",
    description: "Sort by Champion Name descending",
    value: "championName:desc",
  },
  /*
   NOTE: IF SORTING BASED OFF OF SKIN FIELDS. YOU HAVE TO EDIT THE GET SORTED CARDS QUERY
   TODO: Sorting based off of skin line
   */
];

async function setEmbedsFromCards(
  cards: Array<Card & { skin: Skin }>,
  pagination: Pagination,
  user: User,
  sortingOption: SelectMenuComponentOptionData
): Promise<void> {
  function paginate<T>(
    array: Array<T>,
    page_size: number,
    page_number: number
  ): Array<T> {
    // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
    return array.slice((page_number - 1) * page_size, page_number * page_size);
  }

  const embeds = [];
  const pages = Math.ceil(cards.length / 10);

  for (let i = 0; i < pages; i++) {
    const paginatedCards: Array<Card & { skin: Skin }> = paginate<
      Card & { skin: Skin }
    >(cards, 10, i + 1);
    const newEmbed = new EmbedBuilder().addFields(
      buildEmbedFieldString(paginatedCards)
    );
    embeds.push(newEmbed);
  }

  pagination.setEmbeds(embeds, (embed, index, array) => {
    return embed
      .setDescription(`Cards owned by ${user.toString()}`)
      .setTitle(`Card Details sorted by ${sortingOption!.label}`)
      .setFooter({ text: `Page: ${index + 1}/${array.length}` });
  });
}

export async function getAllCards(
  user: User,
  interaction: CommandInteraction,
  client: DiscordClient
): Promise<void> {
  const cards = await getSortedCards({
    field: "id",
    sorting: "asc",
    userId: user.id,
  });

  // @ts-ignore
  const pagination = new Pagination(interaction);

  await setEmbedsFromCards(
    cards,
    pagination,
    user,
    inventorySortingDropdownOptions[0]
  );
  const sortDropdownId = uuid.v4();
  const dropdownActionRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(sortDropdownId)
        .setPlaceholder("Choose sorting")
        .addOptions(inventorySortingDropdownOptions)
    );
  pagination.addActionRows([dropdownActionRow]);

  const payloads = pagination.ready();
  const message = await interaction.followUp(payloads);
  pagination.paginate(message);

  client.on(Events.InteractionCreate, async (stringMenuInteraction) => {
    if (
      !stringMenuInteraction.isStringSelectMenu() ||
      stringMenuInteraction.customId !== sortDropdownId
    )
      return;
    const interactionValue = stringMenuInteraction.values[0];
    const [field, sorting] = interactionValue.split(":");
    const sortingOption = inventorySortingDropdownOptions.find((option) => {
      return option.value === interactionValue;
    });
    const newSortedCards = await getSortedCards({
      field,
      sorting,
      userId: user.id,
    });

    await setEmbedsFromCards(newSortedCards, pagination, user, sortingOption!);

    const payloads = pagination.ready();
    await message.edit(payloads);
    await stringMenuInteraction.deferUpdate();
  });
}

async function getSortedCards(options: {
  field: string;
  sorting: string;
  userId: string;
}): Promise<Array<Card & { skin: Skin }>> {
  const { field, sorting, userId } = options;
  const orderBy =
    field === "championName"
      ? {
          skin: {
            [field]: sorting,
          },
        }
      : { [field]: sorting };
  // @ts-ignore
  return await prisma.card.findMany({
    include: {
      skin: true,
      user: true,
    },
    where: {
      user: {
        id: userId,
      },
    },
    // @ts-ignore
    orderBy,
  });
}
