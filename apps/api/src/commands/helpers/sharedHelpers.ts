import { Snowflake, TextChannel } from "discord.js";
import DiscordClient from "../../discordClient";

export async function sendMessageToChannel(
  client: DiscordClient,
  channelId: Snowflake,
  message: string
): Promise<void> {
  const channel = client.channels.cache.get(channelId) as TextChannel;
  await channel.send(message);
}
