import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Colors,
  EmbedBuilder,
  MessageComponentInteraction,
  TextChannel,
} from "discord.js";
import { Colors as LeagueColors } from "../../types/colors";
import * as uuid from "uuid";
import { DiscordClient } from "../../discordClient";
import { drawImages } from "./cardDropHelpers";
import { Duration } from "luxon";
import { sendMessageToChannel } from "./sharedHelpers";
import {
  blueEssenceEmoji,
  closeEmoji,
  emojisToEmojiIds,
  fireEmoji,
} from "../../types/emoji";
import { Card, Rank } from "database";
import {
  deleteCard,
  deleteManyCards,
  getUserCard,
} from "../../services/cardService";
import { addBalanceToUser } from "../../services/userService";
import { getCardsForTag, getTag } from "../../services/tagService";

export async function startBurnCardWorkflow(
  interaction: ChatInputCommandInteraction,
  client: DiscordClient
): Promise<void> {
  /*
   *  - get card to delete (card service) default to newest if no cardId
   *  - show card to user with info about how much essence is generated
   *  - prompt user to confirm or cancel
   *  - If confirm, delete and change embed color to green
   *  - If cancel, chance embed color to red
   */
  const unparsedCardId = interaction.options.getString("cardid");
  const cardId = unparsedCardId
    ? parseInt(unparsedCardId as string)
    : undefined;

  const cardToDelete = await getUserCard(interaction.user.id, cardId);
  if (!cardToDelete) {
    await interaction.deleteReply();
    const channel = client.channels.cache.get(
      interaction.channelId
    ) as TextChannel;
    if (channel) {
      await channel.send(`Could not find card with ID ${cardId}`);
    }
    return;
  }

  const { skin } = cardToDelete;

  const skins = [
    {
      skinId: skin.id,
      generation: cardToDelete.generation,
      name: skin.name,
      url: skin.asset,
      rank: cardToDelete.rank,
      championName: skin.championName,
      mappedCustomButtonId: uuid.v4(),
    },
  ];
  const image = await (async () => {
    if (cardToDelete.url) {
      return cardToDelete.url;
    } else {
      return drawImages(skins);
    }
  })();
  const file = new AttachmentBuilder(image).setName("card.png");

  const burnButtonId = uuid.v4();
  const cancelButtonId = uuid.v4();
  const blueEssence = calculateBlueEssence(cardToDelete);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
    new ButtonBuilder()
      .setCustomId(burnButtonId)
      .setEmoji(fireEmoji)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(cancelButtonId)
      .setEmoji(closeEmoji)
      .setStyle(ButtonStyle.Danger),
  ]);
  const { id, generation, rank, masteryPoints, masteryRank } = cardToDelete;
  const exampleEmbed = new EmbedBuilder()
    .setTitle(`Burn ${skin.name}`)
    .setImage("attachment://card.png")
    .addFields(
      {
        name: "\u200B",
        value: `*Name*: **${skin.name}** \n 
*Id*: **${id.toString()}** \n
*Generation*: **${generation.toString()}** \n
*Rank*: **${rank.toString()}${emojisToEmojiIds[rank]}** \n
*Mastery Points*: **${masteryPoints.toString()}** \n
*Mastery Rank*: **${masteryRank.toString()}**
`,
      },
      {
        name: "\u200B",
        value: "\u200B",
      },
      {
        name: "Burn Rewards",
        value: `${blueEssenceEmoji}**${blueEssence.toString()}** blue essence`,
      }
    )
    .setColor(LeagueColors.Gold4);

  const message = await interaction.followUp({
    embeds: [exampleEmbed],
    files: [file],
    components: [row],
  });

  const interactionTime = Duration.fromObject({ seconds: 30 });
  const collector = message.createMessageComponentCollector({
    time: interactionTime.toMillis(),
  });

  collector.on(
    "collect",
    async (buttonInteraction: MessageComponentInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return;
      }

      const buttonCustomId = buttonInteraction.customId;
      if (buttonCustomId === burnButtonId) {
        await deleteCard(cardToDelete.id);
        await addBalanceToUser(interaction.user.id, blueEssence);
        const editedEmbed = exampleEmbed.setColor(Colors.Green);
        await interaction.editReply({
          embeds: [editedEmbed],
          content: `**BURN SUCCESSFUL**`,
          components: [
            row.setComponents([
              new ButtonBuilder()
                .setCustomId(burnButtonId)
                .setEmoji(fireEmoji)
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId(cancelButtonId)
                .setEmoji(closeEmoji)
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),
            ]),
          ],
        });
        await sendMessageToChannel(
          client,
          interaction.channelId,
          `${interaction.user.toString()} received **${blueEssenceEmoji}${blueEssence} blue essence!**`
        );
      } else if (buttonCustomId === cancelButtonId) {
        const editedEmbed = exampleEmbed.setColor(Colors.Red);
        await interaction.editReply({
          embeds: [editedEmbed],
          content: `**BURN CANCELED**`,
          components: [
            row.setComponents([
              new ButtonBuilder()
                .setCustomId(burnButtonId)
                .setEmoji(fireEmoji)
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId(cancelButtonId)
                .setEmoji(closeEmoji)
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),
            ]),
          ],
        });
      } else {
        await sendMessageToChannel(
          client,
          interaction.channelId,
          `Something went wrong. Please try again`
        );
      }

      await buttonInteraction.deferUpdate();
    }
  );
}

export async function startBurnTagWorkflow(
  interaction: ChatInputCommandInteraction,
  client: DiscordClient
): Promise<void> {
  const tagname = interaction.options.getString("tagname")!;
  const tag = await getTag(interaction.user.id, tagname);
  if (!tag) {
    await interaction.followUp(
      `${interaction.user.toString()}, that tag does not exist`
    );
  }

  const cardsToDelete = await getCardsForTag(interaction.user.id, tagname);
  const cardsToShow: string[] = [];
  const dot = "•";

  for (const card of cardsToDelete) {
    const rowString =
      `${tag!.emoji} ` +
      `**${card.skin.name}** ${dot} ` +
      `${emojisToEmojiIds[card.rank]}${card.rank} ${dot} ` +
      `\`ID:${card.id}\` ${dot} ` +
      `\`Gen: ${card.generation}\``;
    cardsToShow.push(rowString);
  }

  const burnButtonId = uuid.v4();
  const cancelButtonId = uuid.v4();
  const blueEssence = cardsToDelete.reduce((acc, card) => {
    acc += calculateBlueEssence(card);
    return acc;
  }, 0);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
    new ButtonBuilder()
      .setCustomId(burnButtonId)
      .setEmoji(fireEmoji)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(cancelButtonId)
      .setEmoji(closeEmoji)
      .setStyle(ButtonStyle.Danger),
  ]);
  const exampleEmbed = new EmbedBuilder()
    .setTitle(`Mass Burn`)
    .addFields(
      {
        name: "Burn Rewards",
        value: `${blueEssenceEmoji} ${dot} ${blueEssence}\n`,
      },
      {
        name: `Cards Burned: ${cardsToDelete.length}`,
        value: cardsToShow.length === 0 ? "\u200B" : cardsToShow.join("\n"),
      }
    )
    .setColor(LeagueColors.Gold4);

  const message = await interaction.followUp({
    components: [row],
    embeds: [exampleEmbed],
  });
  const interactionTime = Duration.fromObject({ seconds: 30 });
  const collector = message.createMessageComponentCollector({
    time: interactionTime.toMillis(),
  });

  collector.on(
    "collect",
    async (buttonInteraction: MessageComponentInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return;
      }

      const buttonCustomId = buttonInteraction.customId;
      if (buttonCustomId === burnButtonId) {
        await deleteManyCards(cardsToDelete);
        await addBalanceToUser(interaction.user.id, blueEssence);
        const editedEmbed = exampleEmbed.setColor(Colors.Green);
        await interaction.editReply({
          embeds: [editedEmbed],
          content: `**BURN SUCCESSFUL**`,
          components: [
            row.setComponents([
              new ButtonBuilder()
                .setCustomId(burnButtonId)
                .setEmoji(fireEmoji)
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId(cancelButtonId)
                .setEmoji(closeEmoji)
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),
            ]),
          ],
        });
        await sendMessageToChannel(
          client,
          interaction.channelId,
          `${interaction.user.toString()} received **${blueEssenceEmoji}${blueEssence} blue essence!**`
        );
      } else if (buttonCustomId === cancelButtonId) {
        const editedEmbed = exampleEmbed.setColor(Colors.Red);
        await interaction.editReply({
          embeds: [editedEmbed],
          content: `**BURN CANCELED**`,
          components: [
            row.setComponents([
              new ButtonBuilder()
                .setCustomId(burnButtonId)
                .setEmoji(fireEmoji)
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId(cancelButtonId)
                .setEmoji(closeEmoji)
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),
            ]),
          ],
        });
      } else {
        await sendMessageToChannel(
          client,
          interaction.channelId,
          `Something went wrong. Please try again`
        );
      }

      await buttonInteraction.deferUpdate();
    }
  );
}

const rankToBaseValue: { [name in Rank]: number } = {
  [Rank.Iron]: 0,
  [Rank.Bronze]: 100,
  [Rank.Silver]: 200,
  [Rank.Gold]: 300,
  [Rank.Platinum]: 400,
  [Rank.Diamond]: 500,
  [Rank.Master]: 600,
  [Rank.Grandmaster]: 700,
  [Rank.Challenger]: 800,
};

function calculateBlueEssence(deletedCard: Card): number {
  const { rank, generation } = deletedCard;
  const baseValue = rankToBaseValue[rank];
  const adjustment = Math.round(((generation - 1) / 2000) * 99);
  const result = baseValue + (100 - adjustment);

  return result;
}
