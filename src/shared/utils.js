"use strict";
// Utility functions shared between bot and web
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDuration = formatDuration;
exports.parseDuration = parseDuration;
exports.generateSessionId = generateSessionId;
exports.truncateText = truncateText;
exports.shuffleArray = shuffleArray;
exports.getProgressPercentage = getProgressPercentage;
exports.delay = delay;
exports.isValidUrl = isValidUrl;
exports.extractVideoId = extractVideoId;
exports.cleanYouTubeUrl = cleanYouTubeUrl;
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
function parseDuration(duration) {
    const parts = duration.split(":").map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return parts[0] || 0;
}
function generateSessionId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.slice(0, maxLength - 3) + "...";
}
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
function getProgressPercentage(current, total) {
    if (total === 0)
        return 0;
    return Math.min(100, Math.max(0, (current / total) * 100));
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    }
    catch {
        return false;
    }
}
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match)
            return match[1];
    }
    return null;
}
function cleanYouTubeUrl(url) {
    const videoId = extractVideoId(url);
    if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }
    return url;
}
