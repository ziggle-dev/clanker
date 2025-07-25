import React, { ReactNode, useState, useEffect } from 'react';
import { Box } from 'ink';

export type ColumnWidth = number | `${number}%` | 'auto' | 'flex';

export interface FormRowProps {
    children: ReactNode;
    gap?: number;
    breakpoint?: number;
    columns?: ColumnWidth[];
}

export const FormRow: React.FC<FormRowProps> = ({ 
    children, 
    gap = 2,
    breakpoint = 80,
    columns
}) => {
    const [terminalWidth, setTerminalWidth] = useState(process.stdout.columns || 80);
    
    // Update terminal width on resize
    useEffect(() => {
        const handleResize = () => {
            setTerminalWidth(process.stdout.columns || 80);
        };
        
        process.stdout.on('resize', handleResize);
        return () => {
            process.stdout.off('resize', handleResize);
        };
    }, []);
    
    // Convert children to array
    const childArray = React.Children.toArray(children);
    const childCount = childArray.length;
    
    // Determine if we should stack
    const shouldStack = terminalWidth < breakpoint || (childCount > 2 && !columns);
    
    if (shouldStack) {
        return (
            <Box flexDirection="column" gap={gap} marginBottom={1} width="100%">
                {children}
            </Box>
        );
    }
    
    // Calculate widths for horizontal layout
    const calculateWidth = (index: number): number | undefined => {
        // Account for form padding (4) and borders (2) and gaps
        // Form has paddingX={2} on each side = 4
        // Form border = 2
        // Additional margin = 4
        const formOverhead = 10;
        const availableWidth = terminalWidth - formOverhead;
        const totalGaps = gap * (childCount - 1);
        const contentWidth = availableWidth - totalGaps;
        
        if (columns && columns[index]) {
            const colWidth = columns[index];
            
            if (typeof colWidth === 'number') {
                return colWidth;
            } else if (typeof colWidth === 'string' && colWidth.endsWith('%')) {
                const percentage = parseInt(colWidth) / 100;
                return Math.floor(contentWidth * percentage);
            } else if (colWidth === 'flex' || colWidth === 'auto') {
                // For flex/auto, distribute remaining space equally
                const fixedWidths = columns.reduce<number>((acc, col) => {
                    if (typeof col === 'number') return acc + col;
                    if (typeof col === 'string' && col.endsWith('%')) {
                        return acc + Math.floor(contentWidth * (parseInt(col) / 100));
                    }
                    return acc;
                }, 0);
                
                const flexCount = columns.filter(col => col === 'flex' || col === 'auto').length;
                return Math.floor((contentWidth - fixedWidths) / flexCount);
            }
        }
        
        // Default: equal distribution
        return Math.floor(contentWidth / childCount);
    };
    
    return (
        <Box 
            flexDirection="row" 
            gap={gap}
            marginBottom={1}
            width="100%"
        >
            {childArray.map((child, index) => (
                <Box key={index} width={calculateWidth(index)}>
                    {child}
                </Box>
            ))}
        </Box>
    );
};