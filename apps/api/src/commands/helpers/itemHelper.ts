import { ItemType } from "database";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageComponentInteraction,
  Colors as DiscordColors,
} from "discord.js";
import * as uuid from "uuid";
import { Duration } from "luxon";
import DiscordClient from "../../discordClient";
import {
  createUser,
  getOrCreateUser,
  subtractBalanceFromUser,
} from "../../services/userService";
import { Colors } from "../../types/colors";
import {
  blueEssenceEmoji,
  checkEmoji,
  closeEmoji,
  itemTypeToEmoji,
} from "../../types/emoji";
import {
  itemToPriceMap,
  itemTypeToDescription,
  itemTypeToDescriptionArray,
} from "../../types/items";
import { sendMessageToChannel } from "./sharedHelpers";
import { addItemToUser, getAllItems } from "../../services/itemService";

export async function startViewItemsWorkflow(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const user = await getOrCreateUser(interaction.user.id);
  const items = await getAllItems(interaction.user.id);
  const itemsMap = items.reduce((acc, item) => {
    const { type } = item;
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type]++;
    return acc;
  }, {} as Record<ItemType, number>);

  const fieldValueStringArr = [
    `${blueEssenceEmoji}**${user.balance.toString()}** blue essence`,
  ];

  Object.entries(itemsMap).map(([itemType, count]) => {
    const itemString = `${
      itemTypeToEmoji[itemType as ItemType]
    }**${count}** ${itemType}${count > 1 ? "s" : ""}`;
    fieldValueStringArr.push(itemString);
  });

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `${interaction.user.username}'s Items`,
      iconURL: interaction.user.avatarURL()!,
    })
    .addFields({
      name: "\u200B",
      value: fieldValueStringArr.join("\n"),
    })
    .setColor(Colors.Gold4);
  await interaction.followUp({ embeds: [embed] });
}

export async function startShopItemsWorkflow(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(Colors.Gold4)
    .setTitle("Item Shop")
    .addFields(
      {
        name: `Drop`,
        value: itemTypeToDescriptionArray[ItemType.Drop].join("\n"),
      },
      {
        name: "Claim",
        value: itemTypeToDescriptionArray[ItemType.Claim].join("\n"),
      }
    );

  await interaction.followUp({ embeds: [embed] });
}

export async function startBuyItemWorkflow(
  interaction: ChatInputCommandInteraction,
  client: DiscordClient
): Promise<void> {
  const itemName = interaction.options.getString("name")!;
  const quantity = interaction.options.getNumber("quantity") || 1;
  const price = quantity * itemToPriceMap[itemName as ItemType];
  const valueStringArr = [
    `${interaction.user.toString()} will **gain**`,
    "```diff",
    `+${quantity} ${itemName}${quantity > 1 ? "s" : ""}\`\`\``,
    `${interaction.user.toString()} will **lose**`,
    "```diff",
    `-${price} Blue Essence\`\`\``,
  ];

  const embed = new EmbedBuilder()
    .setColor(Colors.Gold4)
    .setTitle("Item Purchase")
    .addFields(
      {
        name: `${itemName}`,
        value: itemTypeToDescription[itemName as ItemType],
      },
      { name: `\u200B`, value: valueStringArr.join("\n") }
    );

  const confirmButtonId = uuid.v4();
  const cancelButtonId = uuid.v4();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
    new ButtonBuilder()
      .setCustomId(confirmButtonId)
      .setStyle(ButtonStyle.Success)
      .setEmoji(checkEmoji),
    new ButtonBuilder()
      .setCustomId(cancelButtonId)
      .setStyle(ButtonStyle.Danger)
      .setEmoji(closeEmoji),
  ]);

  const message = await interaction.followUp({
    embeds: [embed],
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
      if (buttonCustomId === confirmButtonId) {
        const user = await getOrCreateUser(interaction.user.id);
        if (user.balance < price) {
          const editedEmbed = embed.setColor(DiscordColors.Red).addFields({
            name: "\u200B",
            value: "**You do not have enough essence to make this purchase**",
          });
          await interaction.editReply({
            embeds: [editedEmbed],
            content: `**PURCHASE VOID**`,
            components: [
              row.setComponents([
                new ButtonBuilder()
                  .setCustomId("Confirm")
                  .setEmoji(checkEmoji)
                  .setStyle(ButtonStyle.Success)
                  .setDisabled(true),
                new ButtonBuilder()
                  .setCustomId("Cancel")
                  .setEmoji(closeEmoji)
                  .setStyle(ButtonStyle.Danger)
                  .setDisabled(true),
              ]),
            ],
          });
          await buttonInteraction.deferUpdate();
          return;
        }
        await Promise.all([
          subtractBalanceFromUser(interaction.user.id, price),
          addItemToUser(interaction.user.id, itemName as ItemType),
        ]);

        const editedEmbed = embed.setColor(DiscordColors.Green);
        await interaction.editReply({
          embeds: [editedEmbed],
          content: `**BURN SUCCESSFUL**`,
          components: [
            row.setComponents([
              new ButtonBuilder()
                .setCustomId(confirmButtonId)
                .setStyle(ButtonStyle.Success)
                .setEmoji(checkEmoji)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId(cancelButtonId)
                .setStyle(ButtonStyle.Danger)
                .setEmoji(closeEmoji)
                .setDisabled(true),
            ]),
          ],
        });
        await sendMessageToChannel(
          client,
          interaction.channelId,
          `${interaction.user.toString()} received **${quantity} ${itemName}${
            quantity > 1 ? "s" : ""
          }**`
        );
      } else if (buttonCustomId === cancelButtonId) {
        const editedEmbed = embed.setColor(DiscordColors.Red);
        await interaction.editReply({
          embeds: [editedEmbed],
          content: `**PURCHASE CANCELED**`,
          components: [
            row.setComponents([
              new ButtonBuilder()
                .setCustomId("Confirm")
                .setEmoji(checkEmoji)
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId("Cancel")
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
function getItems(id: string) {
  throw new Error("Function not implemented.");
}
