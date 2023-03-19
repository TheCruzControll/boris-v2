import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { hasEmoji, unemojify } from "node-emoji";
import { getUserCard } from "../../services/cardService";
import {
  connectTagToCard,
  createTag,
  deleteTag,
  getAllTags,
  getTag,
} from "../../services/tagService";
import { Colors } from "../../types/colors";
import { emojiRegex } from "../../types/emoji";

export async function startCreateTagWorkflow(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const tagname = interaction.options.getString("name")!;
  const emoji = interaction.options.getString("emoji")!;
  if (hasEmoji(emoji)) {
    // native emoji. convert to unicode and save in db
    const unicodeEmoji = unemojify(emoji);
    const createdTag = await createTag(
      interaction.user.id,
      tagname,
      unicodeEmoji
    );
    if (!createdTag) {
      await interaction.followUp(
        `${interaction.user.toString()}, a tag with name **${tagname}** could not be added because one with that name already exists`
      );
      return;
    }

    await interaction.followUp(
      `${interaction.user.toString()}, tag **${tagname} ${unicodeEmoji}** has been created`
    );
  } else if (!hasEmoji(emoji) && emojiRegex.test(emoji)) {
    // non-native emoji. Save with form <:name:id>
    const createdTag = await createTag(interaction.user.id, tagname, emoji);
    if (!createdTag) {
      await interaction.followUp(
        `${interaction.user.toString()}, a tag with name **${tagname}** could not be added because one with that name already exists`
      );
      return;
    }
    await interaction.followUp(
      `${interaction.user.toString()}, tag **${tagname} ${emoji}** has been created`
    );
  } else {
    // error out here
    await interaction.followUp({
      content: `${interaction.user.toString()}, could not parse your tag emoji. Please try again`,
    });
    return;
  }
}

export async function startTagCardWorkflow(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const tagname = interaction.options.getString("name")!;
  const cardId = interaction.options.getString("cardid")!;
  const tag = await getTag(interaction.user.id, tagname);
  const card = await getUserCard(interaction.user.id, parseInt(cardId));
  if (!tag) {
    await interaction.followUp(
      `${interaction.user.toString()}, that tag does not exist`
    );
    return;
  }
  if (!card) {
    await interaction.followUp(
      `${interaction.user.toString()}, you are not the owner of that card`
    );
    return;
  }

  await connectTagToCard(interaction.user.id, tagname, card.id);

  await interaction.followUp(
    `${interaction.user.toString()}, **${
      card.skin.name
    }** has been tagged successfully`
  );

  return;
}

export async function startDeleteTagWorkflow(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const tagname = interaction.options.getString("name")!;
  const tag = await getTag(interaction.user.id, tagname);
  if (!tag) {
    await interaction.followUp(
      `${interaction.user.toString()}, that tag does not exist`
    );
    return;
  }
  await deleteTag(interaction.user.id, tagname);

  await interaction.followUp(
    `${interaction.user.toString()}, tag **${
      tag.name
    }** has been deleted successfully`
  );

  return;
}

export async function startListTagWorkflow(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const tags = await getAllTags(interaction.user.id);
  const fieldStringArr = [];

  for (const tag of tags) {
    const row = `${tag.emoji} • \`${tag.name}\` • **${tag.cards.length} Cards**\n`;
    fieldStringArr.push(row);
  }

  const exampleEmbed = new EmbedBuilder()
    .setDescription(`Owned by ${interaction.user.toString()}`)
    .setTitle("Tags")
    .setImage("attachment://card.png")
    .addFields({
      name: "\u200B",
      value: `${fieldStringArr.join("")}`,
    })
    .setColor(Colors.Gold4);

  await interaction.followUp({
    embeds: [exampleEmbed],
  });
}
