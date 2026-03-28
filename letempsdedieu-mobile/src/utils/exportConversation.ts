import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Conversation } from '../screens/ChatScreen';

/**
 * Format a conversation as readable plain text.
 */
export function conversationToText(conv: Conversation): string {
  const date = new Date(conv.createdAt).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines: string[] = [
    'Le Temps de Dieu - Conversation',
    '================================',
    conv.title,
    `Date: ${date}`,
    '',
  ];

  for (const msg of conv.messages) {
    const label = msg.role === 'user' ? '[Vous]' : '[Assistant IA]';
    lines.push(`${label}: ${msg.content}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('Exporte depuis Le Temps de Dieu - voietv.org');

  return lines.join('\n');
}

/**
 * Format a conversation as a beautiful HTML document with inline CSS.
 */
export function conversationToHTML(conv: Conversation): string {
  const date = new Date(conv.createdAt).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const escapeHTML = (str: string): string =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br/>');

  const messagesHTML = conv.messages
    .map((msg) => {
      const isUser = msg.role === 'user';
      return `
      <div style="
        display: flex;
        justify-content: ${isUser ? 'flex-end' : 'flex-start'};
        margin-bottom: 12px;
      ">
        <div style="
          max-width: 80%;
          padding: 12px 16px;
          border-radius: 16px;
          ${
            isUser
              ? 'background: linear-gradient(135deg, #0d7377, #14b8a6); color: #ffffff; border-bottom-right-radius: 4px;'
              : 'background-color: #111827; color: #d1d5db; border: 1px solid rgba(255,255,255,0.1); border-bottom-left-radius: 4px;'
          }
          font-size: 14px;
          line-height: 1.6;
        ">
          <div style="
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 4px;
            color: ${isUser ? 'rgba(255,255,255,0.8)' : '#c4a35a'};
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">${isUser ? 'Vous' : 'Assistant IA'}</div>
          ${escapeHTML(msg.content)}
        </div>
      </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHTML(conv.title)} - Le Temps de Dieu</title>
</head>
<body style="
  margin: 0;
  padding: 0;
  background-color: #060b18;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #d1d5db;
">
  <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="
      text-align: center;
      padding: 24px 16px;
      margin-bottom: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    ">
      <div style="font-size: 28px; font-weight: 700; margin-bottom: 8px;">
        <span style="color: #14b8a6;">Le Temps </span>
        <span style="color: #c4a35a;">de Dieu</span>
      </div>
      <div style="font-size: 18px; color: #f3f4f6; font-weight: 600; margin-bottom: 4px;">
        ${escapeHTML(conv.title)}
      </div>
      <div style="font-size: 13px; color: #6b7280;">${date}</div>
    </div>

    <!-- Messages -->
    <div style="padding: 0 8px;">
      ${messagesHTML}
    </div>

    <!-- Footer -->
    <div style="
      text-align: center;
      padding: 24px 16px;
      margin-top: 24px;
      border-top: 1px solid rgba(255,255,255,0.1);
      font-size: 12px;
      color: #6b7280;
    ">
      Exporte depuis <span style="color: #14b8a6;">Le Temps de Dieu</span> &mdash;
      <a href="https://voietv.org" style="color: #c4a35a; text-decoration: none;">voietv.org</a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Share a conversation as plain text using the native Share API.
 */
export async function shareConversation(conv: Conversation): Promise<void> {
  const text = conversationToText(conv);
  await Share.share({
    title: conv.title,
    message: text,
  });
}

/**
 * Share a conversation as an HTML file using expo-file-system and expo-sharing.
 */
export async function shareConversationAsFile(conv: Conversation): Promise<void> {
  const html = conversationToHTML(conv);
  const fileName = `conversation-${conv.id}.html`;
  const filePath = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, html, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(filePath, {
    mimeType: 'text/html',
    dialogTitle: conv.title,
    UTI: 'public.html',
  });
}
