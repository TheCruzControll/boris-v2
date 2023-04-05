import { redis } from "database";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageComponentInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { DateTime, Duration } from "luxon";
import { DiscordClient } from "../discordClient";
import { Colors } from "../types/colors";
import { Command } from "../types/command";
import { checkEmoji, closeEmoji } from "../types/emoji";
import { sendMessageToChannel } from "./helpers/sharedHelpers";
import {
  acceptTradeButtonId,
  addTradeOptionButtonId,
  buildLockTradeOptionsEmbed,
  buildUnlockTradeOptionsEmbed,
  cancelTradeButtonId,
  canUserMakeTrade,
  confirmTradeButtonId,
  lockTradeButtonId,
  removeTradeTracking,
  renderTradeFollowup,
  renderTradeOptionModal,
  trackTradeInteraction,
  trade,
} from "./helpers/tradeHelpers";

const Trade: Command = {
  // @ts-ignore
  data: new SlashCommandBuilder()
    .setName("trade")
    .setDescription("Trade cards or items with another user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to trade with")
        .setRequired(true)
    ),
  run: async (
    interaction: ChatInputCommandInteraction,
    client: DiscordClient
  ) => {
    // Check first if user already has trade going on
    const interactionTime = Duration.fromObject({ seconds: 300 });
    const endTime = DateTime.now().plus(interactionTime);
    if (!(await canUserMakeTrade(interaction.user.id))) {
      await interaction.followUp(
        `${interaction.user.toString()} sorry, you can only initiate 1 trade at a time`
      );
      return;
    }

    const initiator = interaction.user;
    const tradee = interaction.options.getUser("user")!;
    const nonLockedTraders = new Set();
    nonLockedTraders.add(initiator.id);
    nonLockedTraders.add(tradee.id);

    const confirmedTraders = new Set();
    const expectedTraders = [initiator.id, tradee.id];

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
      new ButtonBuilder()
        .setCustomId(acceptTradeButtonId)
        .setEmoji(checkEmoji)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(cancelTradeButtonId)
        .setEmoji(closeEmoji)
        .setStyle(ButtonStyle.Danger),
    ]);

    let embed = new EmbedBuilder().setFields({
      name: "\u200B",
      value: `${initiator.toString()} has requested to trade with ${tradee.toString()}. ${tradee.toString()} please accept to start trading or deny to cancel the request`,
    });

    const message = await interaction.followUp({
      content: `${initiator.toString()} ${tradee.toString()}`,
      embeds: [embed],
      components: [row],
    });

    await trackTradeInteraction({
      userId: interaction.user.id,
      endTime,
      messageId: message.id,
      embedJson: embed.toJSON(),
      username: interaction.user.username,
      tradePartnerId: tradee.id,
    });
    const collector = message.createMessageComponentCollector({
      time: interactionTime.toMillis(),
    });

    collector.on(
      "collect",
      async (buttonInteraction: MessageComponentInteraction) => {
        if (
          buttonInteraction.user.id !== tradee.id &&
          buttonInteraction.user.id !== interaction.user.id
        ) {
          await buttonInteraction.deferUpdate();
          return;
        }
        const buttonCustomId = buttonInteraction.customId;
        const embedJson = await redis.json.get(`${interaction.user.id}-embed`);
        const embedObj = JSON.parse(embedJson as string);
        embed = new EmbedBuilder(embedObj);
        switch (buttonCustomId) {
          case acceptTradeButtonId:
            if (buttonInteraction.user.id === tradee.id) {
              embed = await renderTradeFollowup(interaction, endTime, tradee);
            }
            await trackTradeInteraction({
              userId: buttonInteraction.user.id,
              endTime,
              messageId: message.id,
              embedJson: embed.toJSON(),
              username: buttonInteraction.user.username,
              tradePartnerId: interaction.user.id,
            });
            break;
          case cancelTradeButtonId:
            await removeTradeTracking(interaction.user.id);
            await removeTradeTracking(tradee.id);
            const editedEmbed = embed
              .setTitle(`TRADE CANCELED BY ${buttonInteraction.user.username}`)
              .setColor(Colors.Red);
            await interaction.editReply({
              embeds: [editedEmbed],
              components: [],
            });
            break;
          case addTradeOptionButtonId:
            if (!nonLockedTraders.has(buttonInteraction.user.id)) {
              await sendMessageToChannel(
                client,
                interaction.channelId,
                `${buttonInteraction.user.toString()}, you cannot add more trade options after locking. Please unlock your trade if you want to add more options`
              );
              await buttonInteraction.deferUpdate();
              return;
            }
            await renderTradeOptionModal(buttonInteraction);
            // returning here so we dont deferupdate
            return;
          case lockTradeButtonId:
            if (nonLockedTraders.has(buttonInteraction.user.id)) {
              embed = await buildLockTradeOptionsEmbed(
                buttonInteraction,
                embed,
                initiator.id,
                tradee.id
              );
              nonLockedTraders.delete(buttonInteraction.user.id);
              if (nonLockedTraders.size === 0) {
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                  [
                    new ButtonBuilder()
                      .setCustomId(confirmTradeButtonId)
                      .setLabel("Confirm Trade")
                      .setEmoji(checkEmoji)
                      .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                      .setCustomId(cancelTradeButtonId)
                      .setEmoji(closeEmoji)
                      .setStyle(ButtonStyle.Danger),
                  ]
                );
                const embedContentArr = [
                  `Both parties have locked in their trade options`,
                  `Both parties must now confirm the trade or cancel`,
                ];
                embed = embed.setDescription(embedContentArr.join("\n"));
                await interaction.editReply({
                  embeds: [embed],
                  components: [row],
                });
              } else {
                await interaction.editReply({ embeds: [embed] });
              }
            } else {
              embed = await buildUnlockTradeOptionsEmbed(
                buttonInteraction,
                embed,
                initiator.id,
                tradee.id
              );
              await interaction.editReply({ embeds: [embed] });
              nonLockedTraders.add(buttonInteraction.user.id);
            }
            break;
          case confirmTradeButtonId:
            confirmedTraders.add(buttonInteraction.user.id);
            if (confirmedTraders.size === 2) {
              try {
                await trade(initiator.id, tradee.id, embed.toJSON());
              } catch (e: any) {
                const editedEmbed = embed
                  .setTitle(`TRADE FAILED `)
                  .setColor(Colors.Red);
                await interaction.editReply({
                  embeds: [editedEmbed],
                  components: [],
                });
                await sendMessageToChannel(
                  client,
                  interaction.channelId,
                  e.message
                );
                return;
              }
              embed = embed
                .setTitle("Trade Successful")
                .setDescription("\u200B")
                .setColor(Colors.Green);
              await interaction.editReply({ embeds: [embed], components: [] });
              await removeTradeTracking(initiator.id);
              await removeTradeTracking(tradee.id);
            }
            break;
        }
        await buttonInteraction.deferUpdate();
      }
    );
  },
};

// class TradeInteraction
export default Trade;
