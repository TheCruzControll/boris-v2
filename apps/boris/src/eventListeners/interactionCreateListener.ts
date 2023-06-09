import {
  CommandInteraction,
  Events,
  Interaction,
  ModalSubmitInteraction,
} from "discord.js";
import { handleSubmitModal } from "../commands/helpers/tradeHelpers";
import { DiscordClient } from "../discordClient";
import { Listener } from "../types/listener";

const run = async (client: DiscordClient, interaction: Interaction) => {
  if (interaction.isCommand()) {
    await handleSlashCommand(client, interaction);
  }

  if (interaction.isModalSubmit()) {
    await handleSubmitModal(interaction);
  }
};

const handleSlashCommand = async (
  client: DiscordClient,
  interaction: CommandInteraction
): Promise<void> => {
  // handle slash command here
  if (!interaction.isChatInputCommand()) return;

  const command = client.slashCommands.get(interaction.commandName);
  if (!command) {
    await interaction.followUp({
      content: `${interaction.commandName} command does not exist`,
    });
    return;
  }
  await interaction.deferReply();

  try {
    await command.run(interaction, client);
  } catch (err) {
    await interaction.followUp({
      content: `${interaction.user.toString()} woops, an error happened. Please try again.`,
    });
    console.log(err);
    return;
  }
};

const interactionCreateListener: Listener = {
  name: Events.InteractionCreate,
  once: false,
  run,
};

export default interactionCreateListener;
