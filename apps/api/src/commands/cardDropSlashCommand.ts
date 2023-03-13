import { prisma, Skin } from "database";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  MessageComponentInteraction,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { Duration } from "luxon";
import { v4 } from "uuid";
import DiscordClient from "../discordClient";
import { getChance } from "../singletons/chance";
import { Command } from "../types/command";
import { emojisToEmojiIds } from "../types/emoji";
import { UserActions } from "../types/users";
import {
  canUserMakeAction,
  createCards,
  drawImages,
  getCooldownDuration,
  trackUserAction,
} from "./helpers/cardDropHelpers";
import { removeNil } from "../utils";

const DropCards: Command = {
  data: new SlashCommandBuilder().setName("drop").setDescription("Drop Cards"),
  run: async (interaction: CommandInteraction, client: DiscordClient) => {
    if (!(await canUserMakeAction(interaction.user.id, UserActions.Drop))) {
      const cdDuration = await getCooldownDuration(
        interaction.user.id,
        UserActions.Drop
      );
      await interaction.deleteReply();
      const channel = client.channels.cache.get(
        interaction.channelId
      ) as TextChannel;
      if (channel) {
        await channel.send(
          `${interaction.user.toString()} **You must wait ${
            cdDuration.minutes
          }m and ${Math.floor(cdDuration.seconds)}s before you can drop again**`
        );
      }
      return;
    }
    const buttonIds = new Array(3).fill("").map(() => {
      return v4();
    });

    const uniqueButtonIds = new Map();
    uniqueButtonIds.set(buttonIds[0], new Set<string>());
    uniqueButtonIds.set(buttonIds[1], new Set<string>());
    uniqueButtonIds.set(buttonIds[2], new Set<string>());

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
      new ButtonBuilder()
        .setCustomId(buttonIds[0])
        .setLabel("1")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(buttonIds[1])
        .setLabel("2")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(buttonIds[2])
        .setLabel("3")
        .setStyle(ButtonStyle.Primary),
    ]);
    const itemCount = await prisma.skin.count();
    const skips: number[] = Array.from(Array(3)).map(() =>
      getChance().integer({ min: 0, max: itemCount })
    );
    const skinsFromDb: Array<Skin | null> = await Promise.all([
      prisma.skin.findFirst({ skip: skips[0] }),
      prisma.skin.findFirst({ skip: skips[1] }),
      prisma.skin.findFirst({ skip: skips[2] }),
    ]);

    const skinsWithoutNil: Array<Skin> = removeNil(skinsFromDb);

    const customIdToSkinMap = buttonIds.reduce((acc, id, index) => {
      acc[id] = skinsWithoutNil[index];
      return acc;
    }, {} as Record<string, Skin>);

    const skins = createCards(customIdToSkinMap);
    const images = await drawImages(skins);
    const attachment = new AttachmentBuilder(images);

    const message = await interaction.editReply({
      content: `${interaction.user.toString()} is dropping cards`,
      files: [attachment],
      components: [row],
    });
    await trackUserAction(interaction.user.id, UserActions.Drop);

    const interactionTime = Duration.fromObject({ seconds: 30 });
    const collector = message.createMessageComponentCollector({
      time: interactionTime.toMillis(),
    });

    collector.on(
      "collect",
      async (buttonInteraction: MessageComponentInteraction) => {
        await buttonInteraction.deferUpdate();

        if (
          !(await canUserMakeAction(
            buttonInteraction.user.id,
            UserActions.Claim
          ))
        ) {
          const cdDuration = await getCooldownDuration(
            buttonInteraction.user.id,
            UserActions.Claim
          );
          const channel = client.channels.cache.get(
            interaction.channelId
          ) as TextChannel;
          if (channel) {
            await channel.send(
              `${buttonInteraction.user.toString()} **You must wait ${
                cdDuration.minutes
              }m and ${Math.floor(
                cdDuration.seconds
              )}s before you can claim another card**`
            );
          }
          return;
        }
        const chosenSkin = skins[buttonInteraction.customId];

        if (!chosenSkin) {
          const channel = client.channels.cache.get(
            interaction.channelId
          ) as TextChannel;
          if (channel) {
            await channel.send(
              `${buttonInteraction.user.toString()} woops, an error happened. Please try again`
            );
          }
          return;
        }

        // if chosen skin has already been claimed,
        if (!uniqueButtonIds.has(buttonInteraction.customId)) {
          const channel = client.channels.cache.get(
            interaction.channelId
          ) as TextChannel;
          if (channel) {
            await channel.send(
              `${buttonInteraction.user.toString()} sorry, ${
                chosenSkin.name
              } is already claimed`
            );
          }
          return;
        }

        if (interaction.user.id === buttonInteraction.user.id) {
          uniqueButtonIds.delete(buttonInteraction.customId);
          const card = await prisma.card.create({
            data: {
              generation: chosenSkin.generation,
              rank: chosenSkin.rank,
              ownerDiscordId: buttonInteraction.user.id,
              skin: {
                connect: {
                  id: chosenSkin.skinId,
                },
              },
            },
          });

          const channel = client.channels.cache.get(
            interaction.channelId
          ) as TextChannel;
          if (channel) {
            await channel.send(
              `${buttonInteraction.user.toString()} claimed **${
                chosenSkin.name
              } | ${emojisToEmojiIds[chosenSkin.rank]}${chosenSkin.rank}` +
                ` | \`${card.id}\`!**`
            );
          }
          await trackUserAction(buttonInteraction.user.id, UserActions.Claim);
        } else {
          if (!uniqueButtonIds.has(buttonInteraction.customId)) {
            const channel = client.channels.cache.get(
              interaction.channelId
            ) as TextChannel;
            if (channel) {
              await channel.send(
                `${buttonInteraction.user.toString()} sorry, ${
                  chosenSkin.name
                } is already claimed`
              );
            }
            return;
          }
          uniqueButtonIds.set(
            buttonInteraction.customId,
            uniqueButtonIds
              .get(buttonInteraction.customId)
              .add(buttonInteraction.user.id)
          );
          const channel = client.channels.cache.get(
            interaction.channelId
          ) as TextChannel;
          if (channel) {
            await channel.send(
              `${buttonInteraction.user.toString()} has joined the raffle for ${
                chosenSkin.name
              }`
            );
          }
          return;
        }
      }
    );

    collector.on("end", async () => {
      for (const [buttonId, set] of Object.entries(uniqueButtonIds)) {
        const userId = getChance().pickone(Array.from(set)) as string;
        const chosenSkin = skins[buttonId];
        const card = await prisma.card.create({
          data: {
            generation: chosenSkin.generation,
            rank: chosenSkin.rank,
            ownerDiscordId: userId,
            skin: {
              connect: {
                id: chosenSkin.skinId,
              },
            },
          },
        });

        const channel = client.channels.cache.get(
          interaction.channelId
        ) as TextChannel;
        if (channel) {
          await channel.send(
            `<:@${userId}> claimed **${chosenSkin.name} | ${
              emojisToEmojiIds[chosenSkin.rank]
            }${chosenSkin.rank}` + ` | \`${card.id}\`!**`
          );
        }
        await trackUserAction(userId, UserActions.Claim);
      }
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents([
        new ButtonBuilder()
          .setCustomId(buttonIds[0])
          .setLabel("1")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(buttonIds[1])
          .setLabel("2")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(buttonIds[3])
          .setLabel("3")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
      ]);

      await interaction.editReply({
        content: "*Cards can no longer be claimed*",
        components: [disabledRow],
      });
    });
  },
};

export default DropCards;
