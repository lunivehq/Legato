import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import { SessionManager } from "../services/SessionManager";
import { WebSocketServer } from "../services/WebSocketServer";

export const skipCommand = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("현재 재생 중인 트랙을 스킵합니다."),

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
        content:
          "❌ 활성화된 음악 세션이 없습니다. `/play`를 사용해 시작하세요.",
      });
    }

    // Check if user is in the same voice channel
    if (session.channelId !== voiceChannel.id) {
      return interaction.editReply({
        content: "❌ 봇과 같은 음성 채널에 있어야 합니다.",
      });
    }

    const player = sessionManager.getPlayer(session.id);
    if (!player) {
      return interaction.editReply({
        content: "❌ 플레이어를 찾을 수 없습니다.",
      });
    }

    const currentTrack = session.queue.tracks[session.queue.currentIndex];
    if (!currentTrack) {
      return interaction.editReply({
        content: "❌ 현재 재생 중인 트랙이 없습니다.",
      });
    }

    // Skip to next track
    const skipped = player.skip();

    if (skipped) {
      // Broadcast update to web clients
      wsServer.broadcastToSession(session.id, {
        type: "queue_update",
        sessionId: session.id,
        payload: { queue: session.queue },
        timestamp: Date.now(),
      });

      return interaction.editReply({
        content: `⏭️ **${currentTrack.title}**를 스킵했습니다.`,
      });
    } else {
      return interaction.editReply({
        content: "❌ 스킵할 수 없습니다.",
      });
    }
  },
};
