import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types/command';

const Hello: Command = {
  data: new SlashCommandBuilder().setName('hello').setDescription('replies with hello there'),
  run: async function (interaction: CommandInteraction) {
    const content = 'Hello there!';

    await interaction.followUp({
      ephemeral: true,
      content
    });
  }
};

export default Hello;
