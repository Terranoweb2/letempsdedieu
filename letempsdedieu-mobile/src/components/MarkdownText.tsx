import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface MarkdownTextProps {
  content: string;
  isUser: boolean;
}

type Segment =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string }
  | { type: 'codeblock'; value: string }
  | { type: 'bullet'; value: string }
  | { type: 'header'; value: string; level: number };

function parseInline(line: string): Segment[] {
  const segments: Segment[] = [];
  // Match bold (**...**), italic (*...*), and inline code (`...`)
  const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(line)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: line.slice(lastIndex, match.index) });
    }

    if (match[2]) {
      // Bold: **...**
      segments.push({ type: 'bold', value: match[2] });
    } else if (match[3]) {
      // Italic: *...*
      segments.push({ type: 'italic', value: match[3] });
    } else if (match[4]) {
      // Inline code: `...`
      segments.push({ type: 'code', value: match[4] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < line.length) {
    segments.push({ type: 'text', value: line.slice(lastIndex) });
  }

  return segments;
}

function parseMarkdown(content: string): Segment[][] {
  const lines = content.split('\n');
  const blocks: Segment[][] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block: ```...```
    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = [];
      i++; // skip opening ```
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push([{ type: 'codeblock', value: codeLines.join('\n') }]);
      continue;
    }

    // Header: # / ## / ###
    const headerMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headerMatch) {
      blocks.push([{ type: 'header', value: headerMatch[2], level: headerMatch[1].length }]);
      i++;
      continue;
    }

    // Bullet list: - item or * item
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
    if (bulletMatch) {
      blocks.push([{ type: 'bullet', value: bulletMatch[1] }]);
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      blocks.push([{ type: 'text', value: '' }]);
      i++;
      continue;
    }

    // Regular line with possible inline formatting
    blocks.push(parseInline(line));
    i++;
  }

  return blocks;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ content, isUser }) => {
  const textColor = isUser ? Colors.white : Colors.gray100;
  const codeBg = isUser ? 'rgba(255,255,255,0.15)' : Colors.navy800;
  const blocks = parseMarkdown(content);

  const renderInlineSegments = (segments: Segment[], keyPrefix: string) => {
    return segments.map((seg, idx) => {
      const key = `${keyPrefix}-${idx}`;
      switch (seg.type) {
        case 'bold':
          return (
            <Text key={key} style={{ fontWeight: '700', color: textColor }}>
              {seg.value}
            </Text>
          );
        case 'italic':
          return (
            <Text key={key} style={{ fontStyle: 'italic', color: textColor }}>
              {seg.value}
            </Text>
          );
        case 'code':
          return (
            <Text
              key={key}
              style={{
                fontFamily: 'monospace',
                backgroundColor: codeBg,
                color: textColor,
                paddingHorizontal: 4,
                borderRadius: 3,
                fontSize: 13,
              }}
            >
              {seg.value}
            </Text>
          );
        case 'text':
        default:
          return (
            <Text key={key} style={{ color: textColor }}>
              {seg.value}
            </Text>
          );
      }
    });
  };

  return (
    <View>
      {blocks.map((block, blockIdx) => {
        const seg = block[0];
        if (!seg) return null;

        // Code block
        if (seg.type === 'codeblock') {
          return (
            <View
              key={blockIdx}
              style={{
                backgroundColor: codeBg,
                borderRadius: 8,
                padding: 10,
                marginVertical: 4,
              }}
            >
              <Text
                selectable
                style={{
                  fontFamily: 'monospace',
                  fontSize: 13,
                  lineHeight: 19,
                  color: textColor,
                }}
              >
                {seg.value}
              </Text>
            </View>
          );
        }

        // Header
        if (seg.type === 'header') {
          const fontSize = seg.level === 1 ? 20 : seg.level === 2 ? 18 : 16;
          return (
            <Text
              key={blockIdx}
              selectable
              style={{
                fontSize,
                fontWeight: '700',
                color: textColor,
                lineHeight: fontSize + 8,
                marginTop: 6,
                marginBottom: 2,
              }}
            >
              {seg.value}
            </Text>
          );
        }

        // Bullet
        if (seg.type === 'bullet') {
          const inlineSegments = parseInline(seg.value);
          return (
            <View key={blockIdx} style={{ flexDirection: 'row', marginVertical: 1 }}>
              <Text style={{ color: textColor, fontSize: 15, lineHeight: 22, marginRight: 6 }}>
                {'\u2022'}
              </Text>
              <Text
                selectable
                style={{ color: textColor, fontSize: 15, lineHeight: 22, flex: 1 }}
              >
                {renderInlineSegments(inlineSegments, `b${blockIdx}`)}
              </Text>
            </View>
          );
        }

        // Empty line
        if (block.length === 1 && seg.type === 'text' && seg.value === '') {
          return <View key={blockIdx} style={{ height: 8 }} />;
        }

        // Inline segments (regular text with possible bold/italic/code)
        return (
          <Text
            key={blockIdx}
            selectable
            style={{ color: textColor, fontSize: 15, lineHeight: 22 }}
          >
            {renderInlineSegments(block, `l${blockIdx}`)}
          </Text>
        );
      })}
    </View>
  );
};
