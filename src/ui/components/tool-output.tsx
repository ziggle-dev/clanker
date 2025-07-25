import React from 'react';
import { Box, Text } from 'ink';

/**
 * Props for ToolOutput component
 */
interface ToolOutputProps {
  children: React.ReactNode;
  /**
   * Style of the relationship indicator
   * - 'tree': Shows a tree-like structure with └─ or ├─
   * - 'simple': Shows a simple ⎿ indicator
   * - 'none': No indicator
   */
  style?: 'tree' | 'simple' | 'none';
  /**
   * Whether this is the last item in a list (affects tree style)
   */
  isLast?: boolean;
  /**
   * Indentation level (for nested outputs)
   */
  level?: number;
  /**
   * Color of the relationship indicator
   */
  indicatorColor?: string;
}

/**
 * Component for rendering tool output with relationship indicators
 */
export const ToolOutput: React.FC<ToolOutputProps> = ({
  children,
  style = 'simple',
  isLast = true,
  level = 0,
  indicatorColor = 'gray'
}) => {
  // Calculate indentation
  const indent = '  '.repeat(level);
  
  // Get the appropriate indicator
  let indicator = '';
  switch (style) {
    case 'tree':
      indicator = isLast ? '└─' : '├─';
      break;
    case 'simple':
      indicator = '⎿';
      break;
    case 'none':
      indicator = '';
      break;
  }
  
  if (style === 'none') {
    return (
      <Box marginLeft={level * 2}>
        {children}
      </Box>
    );
  }
  
  return (
    <Box>
      <Text color={indicatorColor}>{indent}{indicator} </Text>
      <Box flexDirection="column" flexGrow={1} paddingLeft={indicator ? 1 : 0}>
        {children}
      </Box>
    </Box>
  );
};

/**
 * Container for multiple tool outputs with consistent styling
 */
interface ToolOutputListProps {
  children: React.ReactNode;
  style?: 'tree' | 'simple' | 'none';
  indicatorColor?: string;
}

export const ToolOutputList: React.FC<ToolOutputListProps> = ({
  children,
  style = 'simple',
  indicatorColor = 'gray'
}) => {
  const childArray = React.Children.toArray(children);
  
  return (
    <Box flexDirection="column">
      {childArray.map((child, index) => {
        const isLast = index === childArray.length - 1;
        
        // If the child is already a ToolOutput, clone it with the list props
        if (React.isValidElement(child) && child.type === ToolOutput) {
          const childElement = child as React.ReactElement<ToolOutputProps>;
          const childProps = childElement.props;
          return React.cloneElement(childElement, {
            style: childProps.style || style,
            isLast: childProps.isLast !== undefined ? childProps.isLast : isLast,
            indicatorColor: childProps.indicatorColor || indicatorColor
          });
        }
        
        // Otherwise wrap it in a ToolOutput
        return (
          <ToolOutput
            key={index}
            style={style}
            isLast={isLast}
            indicatorColor={indicatorColor}
          >
            {child}
          </ToolOutput>
        );
      })}
    </Box>
  );
};

/**
 * Compact output for showing just the indicator without complex layout
 */
interface CompactOutputProps {
  indicator?: string;
  indicatorColor?: string;
  children: React.ReactNode;
}

export const CompactOutput: React.FC<CompactOutputProps> = ({
  indicator = '⎿',
  indicatorColor = 'gray',
  children
}) => {
  return (
    <Box>
      <Text color={indicatorColor}>{indicator}</Text>
      {children}
    </Box>
  );
};