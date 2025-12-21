import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Events,
  Collection,
  ActivityType,
} from "discord.js";
import { playCommand } from "./commands/play";
import { skipCommand } from "./commands/skip";
import { stopCommand } from "./commands/stop";
import { SessionManager } from "./services/SessionManager";
import { WebSocketServer } from "./services/WebSocketServer";

// Extended client type with commands collection
declare module "discord.js" {
  interface Client {
    commands: Collection<string, typeof playCommand>;
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize commands collection
client.commands = new Collection();
client.commands.set(playCommand.data.name, playCommand);
client.commands.set(skipCommand.data.name, skipCommand);
client.commands.set(stopCommand.data.name, stopCommand);

// Initialize session manager and WebSocket server
const sessionManager = new SessionManager();
const wsServer = new WebSocketServer(sessionManager);

// Make session manager and ws server available globally
export { sessionManager, wsServer };

client.once(Events.ClientReady, (readyClient) => {
  console.log(`🎵 Legato is ready! Logged in as ${readyClient.user.tag}`);

  // Set bot activity
  readyClient.user.setActivity("music | /play", {
    type: ActivityType.Listening,
  });

  // Start WebSocket server
  wsServer.start(parseInt(process.env.WS_PORT || "3001"));
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction, sessionManager, wsServer);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);

    const errorMessage = {
      content: "❌ 명령어 실행 중 오류가 발생했습니다.",
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Handle voice state updates (e.g., when bot is alone in channel)
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  // Check if the update is for our bot
  if (oldState.member?.user.id === client.user?.id) {
    // Bot was disconnected from voice
    if (!newState.channel && oldState.channel) {
      const session = sessionManager.getSessionByGuildId(oldState.guild.id);
      if (session) {
        sessionManager.destroySession(session.id);
        wsServer.broadcastToSession(session.id, {
          type: "disconnect",
          sessionId: session.id,
          timestamp: Date.now(),
        });
      }
    }
    return;
  }

  // Check if bot is alone in voice channel
  if (oldState.channel && !newState.channel) {
    // Someone left a channel
    const botMember = oldState.channel.members.find(
      (m) => m.user.id === client.user?.id
    );
    if (botMember) {
      // Bot is in this channel
      const humanMembers = oldState.channel.members.filter((m) => !m.user.bot);
      if (humanMembers.size === 0) {
        // Bot is alone, start timeout
        const session = sessionManager.getSessionByGuildId(oldState.guild.id);
        if (session) {
          console.log(
            `Bot is alone in ${oldState.channel.name}, will disconnect in 5 minutes`
          );
          sessionManager.startAloneTimeout(session.id, 5 * 60 * 1000, () => {
            const player = sessionManager.getPlayer(session.id);
            if (player) {
              player.destroy();
            }
            sessionManager.destroySession(session.id);
            wsServer.broadcastToSession(session.id, {
              type: "disconnect",
              sessionId: session.id,
              payload: {
                reason: "음성 채널에 아무도 없어 연결이 종료되었습니다.",
              },
              timestamp: Date.now(),
            });
          });
        }
      }
    }
  } else if (newState.channel) {
    // Someone joined a channel
    const botMember = newState.channel.members.find(
      (m) => m.user.id === client.user?.id
    );
    if (botMember) {
      // Cancel alone timeout if someone joins
      const session = sessionManager.getSessionByGuildId(newState.guild.id);
      if (session) {
        sessionManager.cancelAloneTimeout(session.id);
      }
    }
  }
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("Shutting down Legato...");
  sessionManager.destroyAllSessions();
  wsServer.close();
  client.destroy();
  process.exit(0);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
