import {
  Client,
  ClientOptions,
  Collection,
  GatewayIntentBits,
  Message,
  REST,
  RESTPatchAPIChannelMessageJSONBody,
  Routes,
} from "discord.js";
import _ from "lodash";
import { Command } from "./types/command";

export type InteractionCollection = Collection<string, Command>;

export class DiscordClient extends Client {
  public readonly slashCommands: InteractionCollection;
  public readonly buttonCommands: InteractionCollection;

  constructor(options: ClientOptions) {
    const interactionsWithoutCollection = _.omit(options, "commands");
    super(interactionsWithoutCollection);
    this.slashCommands = new Collection();
    this.buttonCommands = new Collection();
  }

  public async editMessage(
    channelId: string,
    messageId: string,
    messageBody: RESTPatchAPIChannelMessageJSONBody
  ): Promise<Message> {
    const rest = new REST({ version: "10" }).setToken(
      process.env.DISCORD_TOKEN!
    );
    const res = await rest.patch(Routes.channelMessage(channelId, messageId), {
      body: messageBody,
    });

    return res as Message;
  }
}

let discordClient: DiscordClient;

export function getDiscordClient(): DiscordClient {
  if (!discordClient) {
    discordClient = new DiscordClient({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    });
  }
  return discordClient;
}
