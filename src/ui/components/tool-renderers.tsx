import React from 'react';
import { Text } from 'ink';
import { ToolResult } from '../../types';
import { CompactOutput, ToolOutput } from './tool-output';

/**
 * Common props for tool renderers
 */
export interface ToolRenderProps {
  toolName: string;
  arguments: Record<string, unknown>;
  result?: ToolResult;
  isExecuting: boolean;
}

/**
 * Simple tool renderer that shows execution status and result
 */
export const SimpleToolRenderer: React.FC<ToolRenderProps> = ({
  isExecuting,
  result
}) => {
  if (isExecuting) {
    return (
      <CompactOutput>
        <Text color="cyan"> Executing...</Text>
      </CompactOutput>
    );
  }

  if (!result) {
    return null;
  }

  if (result.success) {
    return (
      <CompactOutput>
        <Text color="gray"> {result.output || 'Completed'}</Text>
      </CompactOutput>
    );
  }

  return (
    <CompactOutput>
      <Text color="red"> Error: {result.error}</Text>
    </CompactOutput>
  );
};

/**
 * File content renderer - shows file content with proper indentation
 */
export const FileContentRenderer: React.FC<ToolRenderProps> = ({
  isExecuting,
  result
}) => {
  if (isExecuting) {
    return (
      <CompactOutput>
        <Text color="cyan"> Reading file...</Text>
      </CompactOutput>
    );
  }

  if (!result || !result.success) {
    return (
      <CompactOutput>
        <Text color="red"> {result?.error || 'Failed to read file'}</Text>
      </CompactOutput>
    );
  }

  const content = result.output || '';
  const lines = content.split('\n').slice(0, 10); // Show first 10 lines
  const hasMore = content.split('\n').length > 10;

  return (
    <ToolOutput>
      <Text color="gray">
        {lines.join('\n')}
        {hasMore && '\n... (truncated)'}
      </Text>
    </ToolOutput>
  );
};

/**
 * List renderer - shows items in a nice list format
 */
export const ListRenderer: React.FC<{
  items: string[];
  itemColor?: string;
  emptyMessage?: string;
}> = ({ items, itemColor = 'white', emptyMessage = 'No items' }) => {
  if (items.length === 0) {
    return (
      <CompactOutput>
        <Text color="gray"> {emptyMessage}</Text>
      </CompactOutput>
    );
  }

  return (
    <ToolOutput>
      {items.map((item, index) => (
        <Text key={index} color={itemColor}>
          {item}
        </Text>
      ))}
    </ToolOutput>
  );
};

/**
 * Progress renderer - shows a progress message
 */
export const ProgressRenderer: React.FC<{
  message: string;
  color?: string;
}> = ({ message, color = 'cyan' }) => {
  return (
    <CompactOutput>
      <Text color={color}> {message}</Text>
    </CompactOutput>
  );
};

/**
 * Error renderer - shows an error message
 */
export const ErrorRenderer: React.FC<{
  error: string;
}> = ({ error }) => {
  return (
    <CompactOutput>
      <Text color="red"> Error: {error}</Text>
    </CompactOutput>
  );
};

/**
 * Success renderer - shows a success message
 */
export const SuccessRenderer: React.FC<{
  message: string;
}> = ({ message }) => {
  return (
    <CompactOutput>
      <Text color="green"> ✓ {message}</Text>
    </CompactOutput>
  );
};