import React from 'react';
import { Box, Text } from 'ink';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// Configure marked to use marked-terminal for terminal-friendly output
marked.setOptions({
  renderer: new TerminalRenderer({
    showSectionPrefix: false,
    width: 80,
    reflowText: true,
    tab: 2,
    firstHeading: (text: string) => text,
    codespan: (text: string) => `\x1b[36m${text}\x1b[0m`, // Cyan for inline code
    code: (code: string) => `\x1b[90m${code}\x1b[0m`, // Gray for code blocks
  }) as any
});

export const MarkdownRenderer = React.memo(function MarkdownRenderer({ content, streamingCursor = false }: { content: string; streamingCursor?: boolean }) {
  // Process markdown content with marked-terminal
  const rendered = React.useMemo(() => {
    try {
      return marked.parse(content) as string;
    } catch (error) {
      console.error('[MarkdownRenderer] Error parsing markdown:', error);
      return content; // Fallback to raw content
    }
  }, [content]);
  
  // Split by newlines and handle empty lines properly
  const lines = React.useMemo(() => {
    const allLines = rendered.split('\n');
    // Limit lines to prevent performance issues with very large outputs
    const MAX_LINES = 500;
    if (allLines.length > MAX_LINES) {
      // console.warn(`[MarkdownRenderer] Truncating output from ${allLines.length} to ${MAX_LINES} lines`);
      return [...allLines.slice(0, MAX_LINES - 1), `... (${allLines.length - MAX_LINES} more lines)`];
    }
    return allLines;
  }, [rendered]);
  
  // // Add debug info for large content
  // React.useEffect(() => {
  //   if (content.length > 1000) {
  //     console.log(`[MarkdownRenderer] Rendering large content: ${content.length} chars, ${lines.length} lines`);
  //   }
  // }, [content.length, lines.length]);
  
  return (
    <Box flexDirection="column" width="100%">
      {lines.map((line, index) => {
        const isLastLine = index === lines.length - 1;
        // Handle empty lines by rendering a space
        if (line === '') {
          return <Text key={index}> </Text>;
        }
        return (
          <Text key={index} wrap="wrap">
            {line}
            {isLastLine && streamingCursor && <Text color="cyan">█</Text>}
          </Text>
        );
      })}
    </Box>
  );
}, (prevProps, nextProps) => {
  // Only re-render if content or cursor state changes
  return prevProps.content === nextProps.content && 
         prevProps.streamingCursor === nextProps.streamingCursor;
});