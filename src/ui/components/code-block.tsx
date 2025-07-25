import React from 'react';
import { Text, Box } from 'ink';
import Prism from 'prismjs';

// Import common language support
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';

interface CodeBlockProps {
  content: string;
  language?: string;
  showLineNumbers?: boolean;
  maxLines?: number;
  startLineNumber?: number;
}

// Map file extensions to Prism language names
const languageMap: Record<string, string> = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  rs: 'rust',
  go: 'go',
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
  sh: 'bash',
  bash: 'bash',
  json: 'json',
  css: 'css',
  html: 'html',
  xml: 'xml',
};

// Color scheme for syntax highlighting
const tokenColors: Record<string, string> = {
  comment: 'gray',
  prolog: 'gray',
  doctype: 'gray',
  cdata: 'gray',
  
  punctuation: 'gray',
  
  property: 'cyan',
  tag: 'cyan',
  boolean: 'cyan',
  number: 'cyan',
  constant: 'cyan',
  symbol: 'cyan',
  deleted: 'cyan',
  
  selector: 'green',
  'attr-name': 'green',
  string: 'green',
  char: 'green',
  builtin: 'green',
  inserted: 'green',
  
  operator: 'yellow',
  entity: 'yellow',
  url: 'yellow',
  variable: 'yellow',
  
  atrule: 'magenta',
  'attr-value': 'magenta',
  function: 'magenta',
  'class-name': 'magenta',
  
  keyword: 'blue',
  regex: 'red',
  important: 'red',
};

/**
 * Render a token with appropriate color
 */
const renderToken = (token: Prism.Token | string, key: number): React.ReactElement => {
  if (typeof token === 'string') {
    return <Text key={key}>{token}</Text>;
  }

  const color = tokenColors[token.type] || 'white';
  const content = Array.isArray(token.content) 
    ? token.content.map((t, i) => renderToken(t, i))
    : typeof token.content === 'object'
    ? renderToken(token.content, 0)
    : token.content;

  return (
    <Text key={key} color={color}>
      {content}
    </Text>
  );
};

/**
 * Code block component with syntax highlighting
 */
export const CodeBlock: React.FC<CodeBlockProps> = ({ 
  content, 
  language = 'text', 
  showLineNumbers = false,
  maxLines,
  startLineNumber = 1
}) => {
  const lines = content.split('\n');
  const displayLines = maxLines && lines.length > maxLines 
    ? lines.slice(0, maxLines) 
    : lines;
  
  const lastLineNumber = startLineNumber + displayLines.length - 1;
  const lineNumberWidth = String(lastLineNumber).length;
  
  // Get the Prism language
  const prismLang = languageMap[language] || language;
  const grammar = Prism.languages[prismLang];
  
  // If we have a grammar, tokenize the content
  let tokenizedLines: Array<Array<string | Prism.Token>> = [];
  if (grammar) {
    const tokens = Prism.tokenize(content, grammar);
    
    // Split tokens into lines
    let currentLine: Array<string | Prism.Token> = [];
    tokenizedLines.push(currentLine);
    
    const processToken = (token: string | Prism.Token) => {
      if (typeof token === 'string') {
        const parts = token.split('\n');
        parts.forEach((part, i) => {
          if (i > 0) {
            currentLine = [];
            tokenizedLines.push(currentLine);
          }
          if (part) currentLine.push(part);
        });
      } else {
        // For complex tokens, we need to handle newlines inside them
        const content = Array.isArray(token.content) 
          ? token.content.join('') 
          : String(token.content);
        
        if (content.includes('\n')) {
          const parts = content.split('\n');
          parts.forEach((part, i) => {
            if (i > 0) {
              currentLine = [];
              tokenizedLines.push(currentLine);
            }
            if (part) {
              currentLine.push({
                ...token,
                content: part
              } as Prism.Token);
            }
          });
        } else {
          currentLine.push(token);
        }
      }
    };
    
    tokens.forEach(processToken);
    
    // Trim to maxLines if needed
    if (maxLines && tokenizedLines.length > maxLines) {
      tokenizedLines = tokenizedLines.slice(0, maxLines);
    }
  }
  
  return (
    <Box flexDirection="column" paddingLeft={showLineNumbers ? 0 : 1}>
      {grammar && tokenizedLines.length > 0 ? (
        // Render with syntax highlighting
        tokenizedLines.map((lineTokens, lineIndex) => (
          <Box key={lineIndex}>
            {showLineNumbers && (
              <>
                <Text color="gray" dimColor>
                  {String(startLineNumber + lineIndex).padStart(lineNumberWidth, ' ')}
                </Text>
                <Text color="gray" dimColor> │ </Text>
              </>
            )}
            <Box>
              {lineTokens.length > 0 
                ? lineTokens.map((token, tokenIndex) => renderToken(token, tokenIndex))
                : <Text> </Text>
              }
            </Box>
          </Box>
        ))
      ) : (
        // Fallback to plain rendering
        displayLines.map((line, index) => (
          <Box key={index}>
            {showLineNumbers && (
              <>
                <Text color="gray" dimColor>
                  {String(startLineNumber + index).padStart(lineNumberWidth, ' ')}
                </Text>
                <Text color="gray" dimColor> │ </Text>
              </>
            )}
            <Text>{line || ' '}</Text>
          </Box>
        ))
      )}
    </Box>
  );
};