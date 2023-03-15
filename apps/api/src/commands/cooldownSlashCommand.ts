import { Command } from "../types/command";
import {
  CommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import DiscordClient from "../discordClient";
import { getCooldownDuration } from "./helpers/cardDropHelpers";
import { UserAction, UserActions } from "../types/users";
import { readyEmoji, waitingEmoji } from "../types/emoji";

function generateCooldownString(
  dropDuration: {
    minutes: number;
    seconds: number;
  },
  userAction: UserAction
) {
  const isReady = dropDuration.minutes <= 0 && dropDuration.seconds <= 0;
  const emoji = isReady ? readyEmoji : waitingEmoji;
  const cooldownString = isReady
    ? "ready"
    : `${dropDuration.minutes}m ${dropDuration.seconds}s`;
  return `**${emoji} ${userAction}: \`${cooldownString}\`**`;
}

const Cooldowns: Command = {
  data: new SlashCommandBuilder()
    .setName("cd")
    .setDescription("Show all Cooldowns"),
  run: async (interaction: CommandInteraction, _client: DiscordClient) => {
    const dropDuration = await getCooldownDuration(
      interaction.user.id,
      UserActions.Drop
    );
    const claimDuration = await getCooldownDuration(
      interaction.user.id,
      UserActions.Claim
    );
    const dropString = generateCooldownString(dropDuration, UserActions.Drop);
    const claimString = generateCooldownString(
      claimDuration,
      UserActions.Claim
    );
    const embed = new EmbedBuilder()
      .setAuthor({
        name: "Cooldowns",
        iconURL: interaction.user.avatarURL()!,
      })
      .addFields(
        {
          name: "\u200B",
          value: dropString,
        },
        {
          name: "\u200B",
          value: claimString,
        }
      );
    await interaction.followUp({ embeds: [embed] });
  },
};
export default Cooldowns;
