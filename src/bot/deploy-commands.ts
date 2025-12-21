import "dotenv/config";
import { REST, Routes } from "discord.js";
import { playCommand } from "./commands/play";
import { skipCommand } from "./commands/skip";
import { stopCommand } from "./commands/stop";

const commands = [
  playCommand.data.toJSON(),
  skipCommand.data.toJSON(),
  stopCommand.data.toJSON(),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    const data = (await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
      { body: commands }
    )) as unknown[];

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();
