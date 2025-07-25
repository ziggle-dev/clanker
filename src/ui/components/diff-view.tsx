import React from 'react';
import { Text, Box } from 'ink';
import Prism from 'prismjs';

// Import language support (reuse from code-block)
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-tsx.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-go.js';
import 'prismjs/components/prism-rust.js';

interface DiffViewProps {
  oldContent: string;
  newContent: string;
  filePath: string;
  language?: string;
  context?: number; // Number of context lines to show
  startLine?: number;
}

interface DiffLine {
  type: 'context' | 'add' | 'remove';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

// Language map (same as code-block)
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
};

// Token colors for syntax highlighting
const tokenColors: Record<string, string> = {
  comment: 'gray',
  prolog: 'gray',
  doctype: 'gray',
  cdata: 'gray',
  
  punctuation: 'white',
  
  property: 'cyan',
  tag: 'cyan',
  boolean: 'cyan',
  number: 'cyan',
  constant: 'cyan',
  symbol: 'cyan',
  
  selector: 'green',
  'attr-name': 'green',
  string: 'green',
  char: 'green',
  builtin: 'green',
  
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
 * Compute a simple diff between two texts
 */
function computeDiff(oldLines: string[], newLines: string[], context: number = 3): DiffLine[] {
  const diff: DiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  
  // Simple line-by-line diff (could be improved with a proper diff algorithm)
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex >= oldLines.length) {
      // Rest are additions
      diff.push({
        type: 'add',
        content: newLines[newIndex],
        newLineNum: newIndex + 1
      });
      newIndex++;
    } else if (newIndex >= newLines.length) {
      // Rest are deletions
      diff.push({
        type: 'remove',
        content: oldLines[oldIndex],
        oldLineNum: oldIndex + 1
      });
      oldIndex++;
    } else if (oldLines[oldIndex] === newLines[newIndex]) {
      // Same line
      diff.push({
        type: 'context',
        content: oldLines[oldIndex],
        oldLineNum: oldIndex + 1,
        newLineNum: newIndex + 1
      });
      oldIndex++;
      newIndex++;
    } else {
      // Look ahead to find matching lines
      let found = false;
      
      // Check if the old line appears soon in new
      for (let i = 1; i <= 3 && newIndex + i < newLines.length; i++) {
        if (oldLines[oldIndex] === newLines[newIndex + i]) {
          // Add the new lines as additions
          for (let j = 0; j < i; j++) {
            diff.push({
              type: 'add',
              content: newLines[newIndex + j],
              newLineNum: newIndex + j + 1
            });
          }
          newIndex += i;
          found = true;
          break;
        }
      }
      
      if (!found) {
        // Check if the new line appears soon in old
        for (let i = 1; i <= 3 && oldIndex + i < oldLines.length; i++) {
          if (newLines[newIndex] === oldLines[oldIndex + i]) {
            // Add the old lines as removals
            for (let j = 0; j < i; j++) {
              diff.push({
                type: 'remove',
                content: oldLines[oldIndex + j],
                oldLineNum: oldIndex + j + 1
              });
            }
            oldIndex += i;
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        // Treat as remove + add
        diff.push({
          type: 'remove',
          content: oldLines[oldIndex],
          oldLineNum: oldIndex + 1
        });
        diff.push({
          type: 'add',
          content: newLines[newIndex],
          newLineNum: newIndex + 1
        });
        oldIndex++;
        newIndex++;
      }
    }
  }
  
  return diff;
}

/**
 * Filter diff to show only changes with context
 */
function filterDiffWithContext(diff: DiffLine[], contextLines: number): DiffLine[] {
  const result: DiffLine[] = [];
  const changedIndices = new Set<number>();
  
  // Find all changed lines
  diff.forEach((line, index) => {
    if (line.type !== 'context') {
      changedIndices.add(index);
    }
  });
  
  // Include context around changes
  diff.forEach((line, index) => {
    let include = false;
    
    if (line.type !== 'context') {
      include = true;
    } else {
      // Check if within context of a change
      for (let i = -contextLines; i <= contextLines; i++) {
        if (changedIndices.has(index + i)) {
          include = true;
          break;
        }
      }
    }
    
    if (include) {
      result.push(line);
    }
  });
  
  return result;
}

/**
 * Render a token with syntax highlighting
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
 * Render a line with syntax highlighting
 */
const renderHighlightedLine = (content: string, language: string): React.ReactElement => {
  const grammar = Prism.languages[language];
  
  if (!grammar) {
    return <Text>{content}</Text>;
  }
  
  const tokens = Prism.tokenize(content, grammar);
  return (
    <>
      {tokens.map((token, index) => renderToken(token, index))}
    </>
  );
};

/**
 * Diff view component
 */
export const DiffView: React.FC<DiffViewProps> = ({
  oldContent,
  newContent,
  filePath,
  language,
  context = 3,
  startLine = 1
}) => {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  // Get language for syntax highlighting
  const ext = language || filePath.split('.').pop() || 'text';
  const prismLang = languageMap[ext] || ext;
  
  // Compute diff
  const fullDiff = computeDiff(oldLines, newLines);
  const diff = filterDiffWithContext(fullDiff, context);
  
  // Calculate line number widths
  const maxOldLine = Math.max(...diff.filter(d => d.oldLineNum).map(d => d.oldLineNum || 0));
  const maxNewLine = Math.max(...diff.filter(d => d.newLineNum).map(d => d.newLineNum || 0));
  const oldLineWidth = String(maxOldLine).length;
  const newLineWidth = String(maxNewLine).length;
  
  // Group consecutive lines for better visualization
  let previousType: string | null = null;
  let inHunk = false;
  
  return (
    <Box flexDirection="column">
      {diff.map((line, index) => {
        // Add hunk separator if needed
        const elements: React.ReactElement[] = [];
        
        if (index > 0 && previousType === 'context' && line.type === 'context' && !inHunk) {
          // Skip if multiple context lines
          return null;
        }
        
        if (line.type !== 'context' && !inHunk) {
          inHunk = true;
          if (index > 0) {
            elements.push(
              <Box key={`sep-${index}`}>
                <Text color="cyan" dimColor>
                  ────────────────────────────────────────
                </Text>
              </Box>
            );
          }
        } else if (line.type === 'context' && inHunk && 
                   index < diff.length - 1 && diff[index + 1].type === 'context') {
          inHunk = false;
        }
        
        // Render the diff line
        elements.push(
          <Box key={index}>
            {/* Line numbers */}
            <Text color="gray" dimColor>
              {line.oldLineNum 
                ? String(line.oldLineNum).padStart(oldLineWidth, ' ')
                : ' '.repeat(oldLineWidth)}
            </Text>
            <Text color="gray" dimColor> </Text>
            <Text color="gray" dimColor>
              {line.newLineNum 
                ? String(line.newLineNum).padStart(newLineWidth, ' ')
                : ' '.repeat(newLineWidth)}
            </Text>
            <Text color="gray" dimColor> │ </Text>
            
            {/* Change indicator and content */}
            {line.type === 'remove' && (
              <>
                <Text color="red" backgroundColor="red" dimColor>-</Text>
                <Text backgroundColor="red" dimColor>
                  {renderHighlightedLine(line.content, prismLang)}
                </Text>
              </>
            )}
            {line.type === 'add' && (
              <>
                <Text color="green" backgroundColor="green" dimColor>+</Text>
                <Text backgroundColor="green" dimColor>
                  {renderHighlightedLine(line.content, prismLang)}
                </Text>
              </>
            )}
            {line.type === 'context' && (
              <>
                <Text color="gray" dimColor> </Text>
                <Text color="gray">
                  {renderHighlightedLine(line.content, prismLang)}
                </Text>
              </>
            )}
          </Box>
        );
        
        previousType = line.type;
        return elements;
      })}
    </Box>
  );
};