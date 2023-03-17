import { getUser, createUser } from "database";
import {
  CommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import DiscordClient from "../discordClient";
import { Colors } from "../types/colors";
import { Command } from "../types/command";
import { blueEssenceEmoji } from "../types/emoji";

const Items: Command = {
  data: new SlashCommandBuilder()
    .setName("items")
    .setDescription("Display all item quantities"),
  run: async (interaction: CommandInteraction, _client: DiscordClient) => {
    let user = await getUser(interaction.user.id);
    if (!user) {
      user = await createUser(interaction.user.id);
    }
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${interaction.user.username}'s Items`,
        iconURL: interaction.user.avatarURL()!,
      })
      .addFields({
        name: "\u200B",
        value: `${blueEssenceEmoji}**${user.balance.toString()}** blue essence`,
      })
      .setColor(Colors.Gold4);
    await interaction.followUp({ embeds: [embed] });
  },
};

export default Items;
