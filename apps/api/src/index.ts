import { Events, GatewayIntentBits } from "discord.js";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { redis } from "database";
import DiscordClient from "./discordClient";
import registerListeners from "./registerListeners";
import registerSlashCommands from "./registerSlashCommands";

dotenv.config();

registerSlashCommands()
  .then(() => console.log("slash commands registered successfully"))
  .catch((err) => {
    console.log("slash commands could not be registered", err);
  });

// Create a new client instance
const client = new DiscordClient({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

// // Log in to Discord with your client's token
client
  .login(process.env.DISCORD_TOKEN)
  .then(() => console.log("Discord client successfully logged in"))
  .catch((err) => {
    console.log("Could not log into discord", err);
  });
registerListeners(client);

redis.on("error", (err: any) => console.log("Redis Client Error", err));
redis
  .connect()
  .then(() => {
    console.log(`Redis Client connected`);
  })
  .catch(() => {
    console.log(`Redis Client connection Failed`);
  });
