import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import DiscordClient from "../discordClient";
import { Command } from "../types/command";
import { getAllCards, getSingleCard } from "./helpers/inventoryHelpers";

const Inventory: Command = {
  data: new SlashCommandBuilder()
    .setName("inv")
    .setDescription("Show claimed cards")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("card")
        .setDescription("View single card")
        .addStringOption((option) =>
          option.setName("cardid").setDescription("Id of card")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("user")
        .setDescription("View inventory of user")
        .addUserOption((option) =>
          option
            .setName("username")
            .setDescription("Name of user you want to view the inventory of ")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("self").setDescription("View inventory of self")
    ),
  run: async (interaction: CommandInteraction, client: DiscordClient) => {
    // this is weird typing, Command interaction does have options.getSubcommand but the omit messes stuff up
    // @ts-ignore
    switch (interaction.options.getSubcommand()) {
      case "card":
        await getSingleCard(
          // @ts-ignore
          // this is weird typing, Command interaction does have options.getString but the omit messes stuff up
          interaction.options.getString("cardid"),
          interaction,
          client
        );
        return;
      case "user":
        const user = interaction.options.getUser("username");
        await getAllCards(user!, interaction, client);
        return;
      case "self":
        await getAllCards(interaction.user, interaction, client);
        return;
    }
  },
};

export default Inventory;
