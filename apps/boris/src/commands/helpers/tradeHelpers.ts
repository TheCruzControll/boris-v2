import { ItemType, redis } from "database";
import {
  ActionRowBuilder,
  APIEmbed,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageComponentInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
  User,
} from "discord.js";
import * as _ from "lodash";
import { DateTime } from "luxon";
import { getDiscordClient } from "../../discordClient";
import { assignCardToUser } from "../../services/cardService";
import { transferItems } from "../../services/itemService";
import { getUser, transferUserBalance } from "../../services/userService";
import { Colors } from "../../types/colors";
import {
  blueEssenceEmoji,
  cardEmoji,
  closeEmoji,
  dropEmoji,
  lockEmoji,
  plusEmoji,
} from "../../types/emoji";

export const acceptTradeButtonId = "acceptTrade";
export const cancelTradeButtonId = "cancelTrade";
export const lockTradeButtonId = "lockTrade";
export const addTradeOptionButtonId = "addTradeOption";
export const cardInputId = "cardInput";
export const confirmTradeButtonId = "confirmTradeButtonId";

export async function renderTradeFollowup(
  interaction: ChatInputCommandInteraction,
  endTime: DateTime,
  tradee: User
): Promise<EmbedBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
    new ButtonBuilder()
      .setCustomId(lockTradeButtonId)
      .setEmoji(lockEmoji)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(cancelTradeButtonId)
      .setEmoji(closeEmoji)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(addTradeOptionButtonId)
      .setEmoji(plusEmoji)
      .setLabel("Add trade option")
      .setStyle(ButtonStyle.Primary),
  ]);

  const embedContentArr = [
    `To trade, click on the trade button below. Submitting the modal form will override any currently existing trade options`,
    `Separate entries with , to add multiple cards/items/currency with a single message`,
    `${cardEmoji}Trade cards by inputting cardIds`,
    `${dropEmoji}Trade items by prefixing items with \`!\` followed by item name: Ex: \`!drop\``,
    `${blueEssenceEmoji}Trade Blue Essence using \`be-QUANTITY\``,
  ];

  const initialBlankFieldValueArr = ["```diff", "- Not Locked", "```"];

  const timeLeft = endTime.diff(DateTime.now(), ["minutes", "seconds"]);
  const embed = new EmbedBuilder()
    .setTitle(`Trade ends in ${timeLeft.minutes} minutes`)
    .setColor(Colors.Gold4)
    .setFooter({ text: "Both parties must lock in before proceeding" })
    .setDescription(embedContentArr.join("\n"))
    .setFields(
      {
        name: interaction.user.username,
        value: initialBlankFieldValueArr.join("\n"),
        inline: true,
      },
      {
        name: tradee.username,
        value: initialBlankFieldValueArr.join("\n"),
        inline: true,
      }
    );

  await redis.json.set(
    `${interaction.user.id}-embed`,
    "$",
    JSON.stringify(embed.toJSON())
  );
  await redis.json.set(
    `${tradee.id}-embed`,
    "$",
    JSON.stringify(embed.toJSON())
  );

  await interaction.editReply({ embeds: [embed], components: [row] });

  return embed;
}

export async function renderTradeOptionModal(
  buttonInteraction: MessageComponentInteraction
) {
  const modal = new ModalBuilder()
    .setCustomId("tradeOptionModal")
    .setTitle("Trade");

  const cardInput = new TextInputBuilder()
    .setCustomId(cardInputId)
    .setLabel("Cards/Items/Blue Essence to trade")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    cardInput
  );

  // Add inputs to the modal
  modal.addComponents(firstActionRow);

  // Show the modal to the user
  await buttonInteraction.showModal(modal);
}

async function validateTradeOptions(
  userId: string,
  options: { blueEssence: number; items: ItemType[]; cards: string[] }
): Promise<void> {
  const user = await getUser(userId);

  if (options.blueEssence > user.balance) {
    throw new Error("you do not have enough blue essence balance");
  }

  options.items.reduce((acc, item) => {
    const index = acc.findIndex(
      (userItems) => userItems.type.toLowerCase() === item.toLowerCase()
    );
    if (index === -1) {
      throw new Error(`you do not have a ${item} item`);
    }
    acc.splice(index, 1);
    return acc;
  }, user.items);

  options.cards.reduce((acc, cardId) => {
    const index = acc.findIndex(
      (userCards) => userCards.id === parseInt(cardId)
    );
    if (index === -1) {
      throw new Error(`you do not own Card ${cardId}`);
    }
    acc.splice(index, 1);
    return acc;
  }, user.cards);
}

export async function handleSubmitModal(interaction: ModalSubmitInteraction) {
  await interaction.deferReply();
  const inputValue = interaction.fields.getTextInputValue(cardInputId);
  const values = inputValue.split(",").map((item) => item.trim());
  const blueEssence = values
    .filter((item) => item.startsWith("be-"))
    .map((item) => item.replace("be-", ""))
    .filter(Boolean)
    .reduce((acc, itemValue) => {
      acc += parseInt(itemValue);
      return acc;
    }, 0);
  const items = values
    .filter((item) => item.startsWith("!"))
    .map((item) => {
      const itemWithoutExclamation = item.replace("!", "").toLowerCase();
      return (itemWithoutExclamation.charAt(0).toUpperCase() +
        itemWithoutExclamation.slice(1)) as ItemType;
    });
  const cards = values.filter(
    (item) => !item.startsWith("!") && !item.startsWith("be-")
  );

  try {
    await validateTradeOptions(interaction.user.id, {
      blueEssence,
      items,
      cards,
    });
  } catch (e: any) {
    const message = e.message;
    await interaction.followUp(
      `${interaction.user.toString()}, sorry ${message}`
    );
    return;
  }

  const messageId = await redis.hGet(interaction.user.id, "messageId");
  const username = await redis.hGet(interaction.user.id, "username");
  const tradePartnerId = await redis.hGet(
    interaction.user.id,
    "tradePartnerId"
  );
  const embedJson = await redis.json.get(`${interaction.user.id}-embed`);
  const embedObj = JSON.parse(embedJson as string);
  const isTradee = embedObj.fields[1].name === username;
  const initiatorFieldValues = embedObj.fields[0].value.split("\n");
  const tradeeFieldValues = embedObj.fields[1].value.split("\n");

  if (isTradee) {
    if (blueEssence > 0) {
      tradeeFieldValues.splice(-1, 0, `Blue Essence: ${blueEssence}`);
    }
    items.forEach((item) => tradeeFieldValues.splice(-1, 0, `Item: ${item}`));
    cards.forEach((card) => tradeeFieldValues.splice(-1, 0, `Card: ${card}`));
  } else {
    if (blueEssence > 0) {
      initiatorFieldValues.splice(-1, 0, `${blueEssence} Blue Essence`);
    }
    items.forEach((item) =>
      initiatorFieldValues.splice(-1, 0, `Item: ${item}`)
    );
    cards.forEach((card) =>
      initiatorFieldValues.splice(-1, 0, `Card: ${card}`)
    );
  }
  embedObj.fields[0].value = initiatorFieldValues.join("\n");
  embedObj.fields[1].value = tradeeFieldValues.join("\n");

  const embed = new EmbedBuilder(embedObj);

  const discordClient = getDiscordClient();
  await discordClient.editMessage(interaction.channelId!, messageId!, {
    embeds: [embed.toJSON()],
  });

  await redis.json.set(
    `${interaction.user.id}-embed`,
    "$",
    JSON.stringify(embed.toJSON())
  );
  await redis.json.set(
    `${tradePartnerId}-embed`,
    "$",
    JSON.stringify(embed.toJSON())
  );

  await interaction.deleteReply();
}

async function getTradeCooldownDuration(
  userId: string
): Promise<{ minutes: number; seconds: number }> {
  const userExpireTime = await redis.hGet(userId, "endingTime");
  if (!userExpireTime) {
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

export async function canUserMakeTrade(userId: string): Promise<boolean> {
  const endingTime = await redis.hExists(userId, "endingTime");
  const cdDuration = await getTradeCooldownDuration(userId);
  // 0 means does not exist
  return (
    _.isNil(endingTime) || (cdDuration.minutes <= 0 && cdDuration.seconds <= 0)
  );
}

export async function removeTradeTracking(userId: string) {
  await redis.del(userId);
  await redis.del(`${userId}-embed`);
}

export async function trackTradeInteraction(options: {
  userId: string;
  endTime: DateTime;
  messageId: string;
  embedJson: APIEmbed;
  username: string;
  tradePartnerId: string;
}) {
  const { userId, endTime, messageId, embedJson, username, tradePartnerId } =
    options;
  await redis.hSet(userId, "endingTime", endTime.toISO());
  await redis.hSet(userId, "messageId", messageId);
  await redis.hSet(userId, "username", username);
  await redis.hSet(userId, "tradePartnerId", tradePartnerId);
  await redis.json.set(`${userId}-embed`, "$", JSON.stringify(embedJson));
  await redis.expire(userId, 5 * 60);
  await redis.expire(`${userId}-embed`, 5 * 60);
}

export async function buildLockTradeOptionsEmbed(
  interaction: MessageComponentInteraction,
  embed: EmbedBuilder,
  initiatorId: string,
  tradeeId: string
): Promise<EmbedBuilder> {
  const embedJson = embed.toJSON();
  const fieldIndex = embedJson.fields?.findIndex(
    (field) => field.name === interaction.user.username
  );
  const fieldArr = embedJson.fields![fieldIndex!].value.split("\n");
  fieldArr[1] = `+ Locked`;
  embedJson.fields![fieldIndex!].value = fieldArr.join("\n");
  await redis.json.set(
    `${initiatorId}-embed`,
    "$",
    JSON.stringify(embed.toJSON())
  );
  await redis.json.set(
    `${tradeeId}-embed`,
    "$",
    JSON.stringify(embed.toJSON())
  );

  return new EmbedBuilder(embedJson);
}

export async function buildUnlockTradeOptionsEmbed(
  interaction: MessageComponentInteraction,
  embed: EmbedBuilder,
  initiatorId: string,
  tradeeId: string
): Promise<EmbedBuilder> {
  const embedJson = embed.toJSON();
  const fieldIndex = embedJson.fields?.findIndex(
    (field) => field.name === interaction.user.username
  );
  const fieldArr = embedJson.fields![fieldIndex!].value.split("\n");
  fieldArr[1] = `- Not Locked`;
  embedJson.fields![fieldIndex!].value = fieldArr.join("\n");
  await redis.json.set(
    `${initiatorId}-embed`,
    "$",
    JSON.stringify(embed.toJSON())
  );
  await redis.json.set(
    `${tradeeId}-embed`,
    "$",
    JSON.stringify(embed.toJSON())
  );

  return new EmbedBuilder(embedJson);
}

export async function trade(
  initiatorId: string,
  tradeeId: string,
  embedJson: APIEmbed
): Promise<void> {
  const initiatorTradeOptionStringArr = embedJson.fields![0].value.split("\n");
  const tradeeTradeOptionStringArr = embedJson.fields![1].value.split("\n");
  const initiatorTradeOptions = getTradeOptions(initiatorTradeOptionStringArr);
  const tradeeTradeOptions = getTradeOptions(tradeeTradeOptionStringArr);

  await transferUserBalance(
    tradeeId,
    initiatorId,
    tradeeTradeOptions.blueEssence
  );
  await assignCardToUser(tradeeTradeOptions.cardIds, initiatorId);
  await transferItems(
    tradeeId,
    initiatorId,
    tradeeTradeOptions.items as ItemType[]
  );
  await transferUserBalance(
    initiatorId,
    tradeeId,
    initiatorTradeOptions.blueEssence
  );
  await assignCardToUser(initiatorTradeOptions.cardIds, tradeeId);
  await transferItems(
    initiatorId,
    tradeeId,
    initiatorTradeOptions.items as ItemType[]
  );
}

function getTradeOptions(options: string[]): {
  blueEssence: number;
  cardIds: number[];
  items: string[];
} {
  const blueEssence = options
    .filter((option) => option.includes("Blue Essence"))
    .map((option) => {
      const withoutIdentifier = option.replace("Blue Essence", "");
      return withoutIdentifier.trim();
    })
    .filter(Number)
    .reduce((acc: number, option: string) => {
      acc += parseInt(option);
      return acc;
    }, 0);
  const cardIds = options
    .filter((option) => option.includes("Card:"))
    .map((option) => {
      const withoutIdentifier = option.replace("Card:", "");
      return withoutIdentifier.trim();
    })
    .filter(Number)
    .map((option: string) => parseInt(option));
  const items = options
    .filter((option) => option.includes("Item: "))
    .map((option) => {
      const withoutIdentifier = option.replace("Item:", "");
      const trimmedOption = withoutIdentifier.trim().toLowerCase();
      return trimmedOption.charAt(0).toUpperCase() + trimmedOption.slice(1);
    });

  return { blueEssence, cardIds, items };
}
