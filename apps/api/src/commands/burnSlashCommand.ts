import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { DiscordClient } from "../discordClient";
import { Command } from "../types/command";
import {
  startBurnCardWorkflow,
  startBurnTagWorkflow,
} from "./helpers/burnCardHelper";

export const Burn: Command = {
  data: new SlashCommandBuilder()
    .setName("burn")
    .setDescription("Burn cards")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("card")
        .setDescription("burn single card")
        .addStringOption((option) =>
          option.setName("cardid").setDescription("Id of card")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("tag")
        .setDescription("Burn all cards with tag")
        .addStringOption((option) =>
          option
            .setName("tagname")
            .setDescription("Name of tag to mass burn")
            .setRequired(true)
        )
    ),
  /*
   *  - Burn by tag
   *  - Burn by rank
   */
  run: async (
    interaction: ChatInputCommandInteraction,
    client: DiscordClient
  ) => {
    switch (interaction.options.getSubcommand()) {
      case "card":
        await startBurnCardWorkflow(interaction, client);
        return;
      case "tag":
        await startBurnTagWorkflow(interaction, client);
        return;
    }
  },
};

export default Burn;
