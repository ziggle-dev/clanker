import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { GrokAgent } from '../../clanker/agent';

interface ClankerLogoProps {
    agent?: GrokAgent;
    onComplete?: () => void;
}

interface DynamicContentProps {
    agent?: GrokAgent;
    onReady?: () => void;
}

const DynamicContent: React.FC<DynamicContentProps> = ({ agent, onReady }) => {
    const [displayText, setDisplayText] = useState('');
    const [isStreaming, setIsStreaming] = useState(true);
    const [hasFetched, setHasFetched] = useState(false);
    
    useEffect(() => {
        if (hasFetched) return; // Prevent multiple fetches
        
        const fetchContent = async () => {
            setHasFetched(true);
            const categories = ['joke', 'tech_fact', 'dad_joke', 'inspirational', 'dark_humor'];
            const weights = [30, 25, 25, 19, 1]; // Total: 100
            const random = Math.random() * 100;
            let accumulated = 0;
            let selectedCategory = 'inspirational';
            
            for (let i = 0; i < weights.length; i++) {
                accumulated += weights[i];
                if (random < accumulated) {
                    selectedCategory = categories[i];
                    break;
                }
            }
            
            if (!agent) {
                // Get fallback content and stream it
                const fallback = getFallbackText(selectedCategory);
                await streamText(fallback, setDisplayText);
                setIsStreaming(false);
                // Wait 5 seconds after streaming completes
                await new Promise(resolve => setTimeout(resolve, 5000));
                if (onReady) onReady();
                return;
            }
            
            try {
                const prompts: Record<string, string> = {
                    joke: "Tell me a very short programmer joke (max 10 words). Be witty and clever.",
                    tech_fact: "Share a fascinating tech or robot fact (max 15 words). Make it mind-blowing.",
                    dad_joke: "Tell me a tech-related dad joke (max 10 words). Make it groan-worthy.",
                    inspirational: "Give an inspirational quote for makers and tinkerers (max 10 words). Be motivating.",
                    dark_humor: "Share a darkly humorous tech observation (max 12 words). Be subtly existential."
                };
                
                const stream = await agent.chat([
                    {role: 'user', content: prompts[selectedCategory]}
                ], "", true);
                
                let fullText = '';
                if (typeof stream === 'string') {
                    fullText = stream;
                    await streamText(fullText, setDisplayText);
                } else {
                    // Stream character by character as it comes in
                    for await (const chunk of stream) {
                        if (chunk.type === 'content' && chunk.content) {
                            for (const char of chunk.content) {
                                fullText += char;
                                setDisplayText(fullText);
                                await new Promise(resolve => setTimeout(resolve, 30));
                            }
                        }
                    }
                }
                setIsStreaming(false);
                // Wait 5 seconds after streaming completes
                await new Promise(resolve => setTimeout(resolve, 5000));
                if (onReady) onReady();
            } catch (error) {
                const fallback = getFallbackText(selectedCategory);
                await streamText(fallback, setDisplayText);
                setIsStreaming(false);
                // Wait 5 seconds after streaming completes
                await new Promise(resolve => setTimeout(resolve, 5000));
                if (onReady) onReady();
            }
        };
        
        fetchContent();
    }, []); // Run only once on mount
    
    return <Text>{parseMarkdownToJSX(displayText)}</Text>;
};

// Stream text character by character
async function streamText(text: string, setText: (text: string) => void) {
    let current = '';
    for (const char of text) {
        current += char;
        setText(current);
        await new Promise(resolve => setTimeout(resolve, 30));
    }
}

// Get fallback text (plain string)
function getFallbackText(category: string): string {
    const fallbacks: Record<string, string[]> = {
        joke: [
            "**404**: Joke not found. *Please try again.*",
            "There are only **10** types of people: those who understand {green:binary}",
            "!false - It's {red:funny} because it's true"
        ],
        tech_fact: [
            "The first computer bug was an {yellow:actual moth}",
            "**CAPTCHA** stands for *Completely Automated Public Turing test*",
            "The {blue:@ symbol} was used to save space in email"
        ],
        dad_joke: [
            "Why do programmers prefer {gray:dark mode}? Light attracts **bugs**!",
            "I'd tell you a UDP joke, but you might *not get it*",
            "My code doesn't have bugs, it has {red:surprise features}"
        ],
        inspirational: [
            "For the *tinkerers* and **makers** in all of us",
            "Build things that make you {yellow:smile}",
            "Every expert was once a {green:beginner}",
            "**Create**, *iterate*, and never stop {blue:learning}"
        ],
        dark_humor: [
            "We're all just {gray:biological computers} running on anxiety",
            "AI will replace us all... *eventually*",
            "Your code will outlive you. {red:Plan accordingly.}"
        ]
    };
    
    const options = fallbacks[category] || fallbacks.inspirational;
    return options[Math.floor(Math.random() * options.length)];
}

// Parse markdown-like syntax to JSX
function parseMarkdownToJSX(text: string): React.ReactElement {
    const parts: React.ReactElement[] = [];
    let currentIndex = 0;
    let key = 0;
    
    // Regex patterns for different markdown elements
    const patterns = [
        { regex: /\*\*(.*?)\*\*/g, style: 'bold' },
        { regex: /\*(.*?)\*/g, style: 'italic' },
        { regex: /\{(\w+):(.*?)\}/g, style: 'color' }
    ];
    
    // Combine all patterns and process text
    const allMatches: Array<{index: number, length: number, content: string, style: string, color?: string}> = [];
    
    patterns.forEach(({ regex, style }) => {
        let match;
        while ((match = regex.exec(text)) !== null) {
            if (style === 'color') {
                allMatches.push({
                    index: match.index,
                    length: match[0].length,
                    content: match[2],
                    style: style,
                    color: match[1]
                });
            } else {
                allMatches.push({
                    index: match.index,
                    length: match[0].length,
                    content: match[1],
                    style: style
                });
            }
        }
    });
    
    // Sort matches by index
    allMatches.sort((a, b) => a.index - b.index);
    
    // Process text with matches
    allMatches.forEach((match) => {
        // Add text before match
        if (match.index > currentIndex) {
            parts.push(<Text key={key++}>{text.substring(currentIndex, match.index)}</Text>);
        }
        
        // Add styled text
        switch (match.style) {
            case 'bold':
                parts.push(<Text key={key++} bold>{match.content}</Text>);
                break;
            case 'italic':
                parts.push(<Text key={key++} italic>{match.content}</Text>);
                break;
            case 'color':
                parts.push(<Text key={key++} color={match.color}>{match.content}</Text>);
                break;
        }
        
        currentIndex = match.index + match.length;
    });
    
    // Add remaining text
    if (currentIndex < text.length) {
        parts.push(<Text key={key++}>{text.substring(currentIndex)}</Text>);
    }
    
    return <>{parts}</>;
}

// Get fallback content when no agent is available
function getFallbackContent(category: string): React.ReactElement {
    const fallbacks: Record<string, Array<() => React.ReactElement>> = {
        joke: [
            () => <Text><Text bold>404</Text>: Joke not found. <Text italic>Please try again.</Text></Text>,
            () => <Text>There are only <Text bold>10</Text> types of people: those who understand <Text color="green">binary</Text></Text>,
            () => <Text>!false - It's <Text color="red">funny</Text> because it's true</Text>
        ],
        tech_fact: [
            () => <Text>The first computer bug was an <Text color="yellow">actual moth</Text></Text>,
            () => <Text><Text bold>CAPTCHA</Text> stands for <Text italic>Completely Automated Public Turing test</Text></Text>,
            () => <Text>The <Text color="blue">@ symbol</Text> was used to save space in email</Text>
        ],
        dad_joke: [
            () => <Text>Why do programmers prefer <Text color="gray">dark mode</Text>? Light attracts <Text bold>bugs</Text>!</Text>,
            () => <Text>I'd tell you a UDP joke, but you might <Text italic>not get it</Text></Text>,
            () => <Text>My code doesn't have bugs, it has <Text color="red">surprise features</Text></Text>
        ],
        inspirational: [
            () => <Text>For the <Text italic>tinkerers</Text> and <Text bold>makers</Text> in all of us</Text>,
            () => <Text>Build things that make you <Text color="yellow">smile</Text></Text>,
            () => <Text>Every expert was once a <Text color="green">beginner</Text></Text>,
            () => <Text><Text bold>Create</Text>, <Text italic>iterate</Text>, and never stop <Text color="blue">learning</Text></Text>
        ],
        dark_humor: [
            () => <Text>We're all just <Text color="gray">biological computers</Text> running on anxiety</Text>,
            () => <Text>AI will replace us all... <Text italic>eventually</Text></Text>,
            () => <Text>Your code will outlive you. <Text color="red">Plan accordingly.</Text></Text>
        ]
    };
    
    const options = fallbacks[category] || fallbacks.inspirational;
    const selectedOption = options[Math.floor(Math.random() * options.length)];
    return selectedOption();
}

export const ClankerLogo: React.FC<ClankerLogoProps> = ({ agent, onComplete }) => {
    const [shouldSkip, setShouldSkip] = useState(false);
    const [contentReady, setContentReady] = useState(false);
    const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
    const [colorIndex, setColorIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    
    // Color cycle for the border
    const colors = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];
    
    // Handle escape key
    useInput((input, key) => {
        if (key.escape) {
            setShouldSkip(true);
        }
    });
    
    // Color cycling effect - always running
    useEffect(() => {
        const colorInterval = setInterval(() => {
            setColorIndex((prev) => (prev + 1) % colors.length);
        }, 200); // Change color every 200ms
        
        return () => clearInterval(colorInterval);
    }, []);
    
    // Set minimum display time
    useEffect(() => {
        const timer = setTimeout(() => {
            setMinimumTimeElapsed(true);
        }, 5000); // Minimum 5 seconds display time
        
        return () => clearTimeout(timer);
    }, []);
    
    useEffect(() => {
        if (shouldSkip && onComplete) {
            setIsVisible(false);
            onComplete();
            return;
        }
        
        // Only transition when content is ready AND minimum time has elapsed
        if (contentReady && minimumTimeElapsed && onComplete) {
            setIsVisible(false);
            onComplete();
        }
    }, [onComplete, shouldSkip, contentReady, minimumTimeElapsed]);
    
    // Only render when visible
    if (!isVisible) {
        return null;
    }
    
    return (
        <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
            {/* Outer rounded box with padding */}
            <Box 
                flexDirection="column" 
                borderStyle="round" 
                borderColor={colors[colorIndex]}
                paddingX={3}
                paddingY={2}
            >
                {/* Inner content */}
                <Box flexDirection="column" alignItems="center">
                    <Box marginBottom={1}>
                        <Text color={colors[colorIndex]}>
                            {' ██████╗██╗      █████╗ ███╗   ██╗██╗  ██╗███████╗██████╗  \n'}
                            {'██╔════╝██║     ██╔══██╗████╗  ██║██║ ██╔╝██╔════╝██╔══██╗ \n'}
                            {'██║     ██║     ███████║██╔██╗ ██║█████╔╝ █████╗  ██████╔╝ \n'}
                            {'██║     ██║     ██╔══██║██║╚██╗██║██╔═██╗ ██╔══╝  ██╔══██╗ \n'}
                            {'╚██████╗███████╗██║  ██║██║ ╚████║██║  ██╗███████╗██║  ██║ \n'}
                            {' ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ '}
                        </Text>
                    </Box>
                    <Box justifyContent="center" paddingX={2} paddingY={1}>
                        <DynamicContent agent={agent} onReady={() => setContentReady(true)} />
                    </Box>
                </Box>
            </Box>
            <Box marginTop={1}>
                <Text dimColor>Press ESC to skip...</Text>
            </Box>
        </Box>
    );
};