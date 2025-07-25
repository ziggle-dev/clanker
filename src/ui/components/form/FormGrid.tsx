import React, { ReactNode } from 'react';
import { Box } from 'ink';

export interface FormGridProps {
    children: ReactNode;
    gap?: number;
}

export const FormGrid: React.FC<FormGridProps> = ({ children, gap = 2 }) => {
    const childArray = React.Children.toArray(children);
    
    return (
        <Box flexDirection="row" gap={gap} marginBottom={1}>
            {childArray.map((child, index) => (
                <Box key={index} flexGrow={1}>
                    {child}
                </Box>
            ))}
        </Box>
    );
};