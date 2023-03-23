import { ItemType } from "database";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import DiscordClient from "../discordClient";
import { Command } from "../types/command";
import {
  startBuyItemWorkflow,
  startShopItemsWorkflow,
  startViewItemsWorkflow,
} from "./helpers/itemHelper";

const Items: Command = {
  data: new SlashCommandBuilder()
    .setName("items")
    .setDescription("Commands for items")
    .addSubcommand((subcommand) =>
      subcommand.setName("view").setDescription("View all of your items")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("shop").setDescription("View the item shop")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("buy")
        .setDescription("Buy items from item shop")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Name of item")
            .setRequired(true)
            .addChoices(
              { name: ItemType.Drop, value: ItemType.Drop },
              { name: ItemType.Claim, value: ItemType.Claim }
            )
        )
        .addNumberOption((option) =>
          option
            .setName("quantity")
            .setDescription("Quantity of item. Default to 1")
        )
    ),
  run: async (
    interaction: ChatInputCommandInteraction,
    client: DiscordClient
  ) => {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case "view":
        await startViewItemsWorkflow(interaction);
        return;
      case "shop":
        await startShopItemsWorkflow(interaction);
        return;
      case "buy":
        await startBuyItemWorkflow(interaction, client);
        return;
    }
  },
};

export default Items;
