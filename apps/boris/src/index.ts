import { Events } from "discord.js";
import { redis } from "database";
import { getDiscordClient } from "./discordClient";
import registerListeners from "./registerListeners";
import registerSlashCommands from "./registerSlashCommands";

// Create a new client instance
const client = getDiscordClient();

registerSlashCommands()
  .then(() => console.log("slash commands registered successfully"))
  .catch((err) => {
    console.log("slash commands could not be registered", err);
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

redis.on("error", (err) => {
  return console.log("Redis Client Error", err);
});
redis
  .connect()
  .then(() => {
    console.log(`Redis Client connected`);
  })
  .catch(() => {
    console.log(`Redis Client connection Failed`);
  });
