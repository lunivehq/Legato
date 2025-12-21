import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import {
  joinVoiceChannel,
  DiscordGatewayAdapterCreator,
} from "@discordjs/voice";
import { SessionManager } from "../services/SessionManager";
import { WebSocketServer } from "../services/WebSocketServer";
import { generateSessionId } from "../../shared/utils";

export const playCommand = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("음악을 재생하고 웹 대시보드 링크를 제공합니다.")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("재생할 음악의 URL 또는 검색어 (선택사항)")
        .setRequired(false)
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    sessionManager: SessionManager,
    wsServer: WebSocketServer
  ) {
    await interaction.deferReply();

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.editReply({
        content: "❌ 먼저 음성 채널에 참여해주세요!",
      });
    }

    // Check bot permissions
    const permissions = voiceChannel.permissionsFor(interaction.client.user!);
    if (!permissions?.has(["Connect", "Speak"])) {
      return interaction.editReply({
        content: "❌ 음성 채널에 연결하거나 말할 권한이 없습니다.",
      });
    }

    // Check if there's an existing session for this guild
    let session = sessionManager.getSessionByGuildId(interaction.guildId!);

    if (!session) {
      // Create new session
      const sessionId = generateSessionId();

      // Join voice channel
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guildId!,
        adapterCreator: interaction.guild!
          .voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
        selfDeaf: true,
      });

      session = sessionManager.createSession({
        id: sessionId,
        guildId: interaction.guildId!,
        guildName: interaction.guild!.name,
        channelId: voiceChannel.id,
        channelName: voiceChannel.name,
        connection,
      });
    }

    // Handle optional query parameter
    const query = interaction.options.getString("query");
    if (query) {
      // Add track to queue via WebSocket service
      const player = sessionManager.getPlayer(session.id);
      if (player) {
        try {
          const track = await player.addTrack(query, member.user.username);
          if (track) {
            wsServer.broadcastToSession(session.id, {
              type: "queue_update",
              sessionId: session.id,
              payload: { queue: session.queue },
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          console.error("Error adding track:", error);
        }
      }
    }

    // Generate dashboard URL
    const dashboardUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    }/session/${session.id}`;

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0xfa2d48) // Apple Music Red
      .setTitle("🎵 Legato Music Player")
      .setDescription("웹 대시보드에서 음악을 컨트롤하세요!")
      .addFields(
        { name: "🔗 세션 ID", value: `\`${session.id}\``, inline: true },
        { name: "🔊 채널", value: voiceChannel.name, inline: true },
        { name: "\u200b", value: "\u200b", inline: true },
        { name: "📱 대시보드", value: `[여기를 클릭하세요](${dashboardUrl})` }
      )
      .setThumbnail(interaction.client.user!.displayAvatarURL())
      .setFooter({ text: "Legato • Apple Music inspired Discord Bot" })
      .setTimestamp();

    // Create button for dashboard
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("대시보드 열기")
        .setStyle(ButtonStyle.Link)
        .setURL(dashboardUrl)
        .setEmoji("🎵")
    );

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  },
};
