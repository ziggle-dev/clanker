import React from 'react';
import { Text } from 'ink';
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

export function MarkdownRenderer({ content, streamingCursor = false }: { content: string; streamingCursor?: boolean }) {
  // Process markdown content with marked-terminal
  const rendered = marked.parse(content) as string;
  
  // Split by newlines to handle multi-line content properly in Ink
  const lines = rendered.split('\n').filter(line => line !== ''); // Filter out empty lines at the end
  
  return (
    <>
      {lines.map((line, index) => {
        const isLastLine = index === lines.length - 1;
        return (
          <Text key={index}>
            {line}
            {isLastLine && streamingCursor && <Text color="cyan">█</Text>}
          </Text>
        );
      })}
    </>
  );
}