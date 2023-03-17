import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import DiscordClient from "../discordClient";
import { Command } from "../types/command";
import { startBurnCardWorkflow } from "./helpers/burnCardHelper";

export const Burn: Command = {
  // Slash command builder actually has AddStringOption as a function but the class and the interface the class represents are not consistent
  // @ts-ignore
  data: new SlashCommandBuilder()
    .setName("burn")
    .setDescription("Burn cards")
    .addStringOption((option) =>
      option.setName("cardid").setDescription("Id of card")
    ),
  /*
   *  - Burn by tag
   *  - Burn by rank
   */
  run: async (
    interaction: ChatInputCommandInteraction,
    client: DiscordClient
  ) => {
    await startBurnCardWorkflow(interaction, client);
  },
};

export default Burn;
