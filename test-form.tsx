#!/usr/bin/env tsx
import React from 'react';
import { render } from 'ink';
import { SettingsScreen } from './src/ui/screens/SettingsScreen';

const TestApp = () => {
    return (
        <SettingsScreen 
            onComplete={(settings) => {
                console.log('Settings saved:', settings);
                process.exit(0);
            }}
            onCancel={() => {
                console.log('Cancelled');
                process.exit(0);
            }}
        />
    );
};

render(<TestApp />);