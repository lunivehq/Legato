import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import { SessionManager } from "../services/SessionManager";
import { WebSocketServer } from "../services/WebSocketServer";

export const stopCommand = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("재생을 종료하고 음성 채널에서 퇴장합니다."),

  async execute(
    interaction: ChatInputCommandInteraction,
    sessionManager: SessionManager,
    wsServer: WebSocketServer
  ) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.editReply({
        content: "❌ 먼저 음성 채널에 참여해주세요!",
      });
    }

    // Get session for this guild
    const session = sessionManager.getSessionByGuildId(interaction.guildId!);

    if (!session) {
      return interaction.editReply({
        content: "❌ 활성화된 음악 세션이 없습니다.",
      });
    }

    // Check if user is in the same voice channel
    if (session.channelId !== voiceChannel.id) {
      return interaction.editReply({
        content: "❌ 봇과 같은 음성 채널에 있어야 합니다.",
      });
    }

    // Destroy player and session
    const player = sessionManager.getPlayer(session.id);
    if (player) {
      player.destroy();
    }

    // Broadcast disconnect to web clients
    wsServer.broadcastToSession(session.id, {
      type: "disconnect",
      sessionId: session.id,
      payload: { reason: "호스트가 재생을 종료했습니다." },
      timestamp: Date.now(),
    });

    // Destroy session
    sessionManager.destroySession(session.id);

    return interaction.editReply({
      content: "👋 재생을 종료하고 음성 채널에서 퇴장했습니다.",
    });
  },
};
