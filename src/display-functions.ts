import chalk from "chalk";
import {GrokAgent} from "./clanker/agent";

// Simple clear console function
export async function clearConsole(): Promise<void> {
    if (process.stdout.isTTY) {
        process.stdout.write('\x1Bc'); // Clear console
    } else {
        console.clear(); // Fallback for non-TTY
    }
}

// Simulate typing effect
export async function simulateTyping(text: string, delay: number = 50): Promise<void> {
    for (const char of text) {
        process.stdout.write(char);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

// Parse and render markdown-like text with color support
function renderMarkdownText(text: string): string {
    // Handle bold
    text = text.replace(/\*\*(.*?)\*\*/g, (_, content) => chalk.bold(content));
    
    // Handle italic
    text = text.replace(/\*(.*?)\*/g, (_, content) => chalk.italic(content));
    
    // Handle colors - format: {color:text}
    text = text.replace(/\{(\w+):(.*?)\}/g, (_, color, content) => {
        if (typeof chalk[color] === 'function') {
            return chalk[color](content);
        }
        return content;
    });
    
    return text;
}

// Get dynamic content for the logo
async function getDynamicContent(agent?: GrokAgent): Promise<string> {
    const categories = [
        'joke',
        'tech_fact',
        'dad_joke',
        'inspirational',
        'dark_humor'
    ];
    
    // Weighted random selection (dark humor is rare)
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
    
    // If no agent, use fallback content
    if (!agent) {
        return getFallbackContent(selectedCategory);
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
        
        let response = '';
        if (typeof stream === 'string') {
            response = stream;
        } else {
            for await (const chunk of stream) {
                if (chunk.type === 'content' && chunk.content) {
                    response += chunk.content;
                }
            }
        }
        
        return response.trim();
    } catch {
        return getFallbackContent(selectedCategory);
    }
}

// Fallback content when no agent is available
function getFallbackContent(category: string): string {
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

// Display the new Clanker logo with dynamic content
export async function displayClankerLogo(agent?: GrokAgent): Promise<void> {
    await clearConsole();
    
    // Get dynamic content
    const dynamicContent = await getDynamicContent(agent);
    const renderedContent = renderMarkdownText(dynamicContent);
    
    // Calculate padding for center alignment
    const maxWidth = 103; // Width of the box
    const contentLength = dynamicContent.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\{(\w+):(.*?)\}/g, '$2').length;
    const padding = Math.max(0, Math.floor((maxWidth - contentLength) / 2));
    const paddedContent = ' '.repeat(padding) + renderedContent;
    
    // Display the logo
    console.log(chalk.magenta('╭───────────────────────────────────────────────────────────────────────────────────────────────────────╮'));
    console.log(chalk.magenta('│                                                                                                       │'));
    console.log(chalk.magenta('│ ') + chalk.red('╭────────────────────────────────────────────────────────────╮') + chalk.magenta('                                        │'));
    console.log(chalk.magenta('│ ') + chalk.red('│') + chalk.white(' ██████╗██╗      █████╗ ███╗   ██╗██╗  ██╗███████╗██████╗  ') + chalk.red('│') + chalk.magenta('                                        │'));
    console.log(chalk.magenta('│ ') + chalk.red('│') + chalk.white('██╔════╝██║     ██╔══██╗████╗  ██║██║ ██╔╝██╔════╝██╔══██╗ ') + chalk.red('│') + chalk.magenta('                                        │'));
    console.log(chalk.magenta('│ ') + chalk.red('│') + chalk.white('██║     ██║     ███████║██╔██╗ ██║█████╔╝ █████╗  ██████╔╝ ') + chalk.red('│') + chalk.magenta('                                        │'));
    console.log(chalk.magenta('│ ') + chalk.red('│') + chalk.white('██║     ██║     ██╔══██║██║╚██╗██║██╔═██╗ ██╔══╝  ██╔══██╗ ') + chalk.red('│') + chalk.magenta('                                        │'));
    console.log(chalk.magenta('│ ') + chalk.red('│') + chalk.white('╚██████╗███████╗██║  ██║██║ ╚████║██║  ██╗███████╗██║  ██║ ') + chalk.red('│') + chalk.magenta('                                        │'));
    console.log(chalk.magenta('│ ') + chalk.red('│') + chalk.white(' ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ') + chalk.red('│') + chalk.magenta('                                        │'));
    console.log(chalk.magenta('│ ') + chalk.red('╰────────────────────────────────────────────────────────────╯') + chalk.magenta('                                        │'));
    console.log(chalk.magenta('│                                                                                                       │'));
    console.log(chalk.magenta('│') + paddedContent + ' '.repeat(maxWidth - padding - contentLength) + chalk.magenta('│'));
    console.log(chalk.magenta('│                                                                                                       │'));
    console.log(chalk.magenta('╰───────────────────────────────────────────────────────────────────────────────────────────────────────╯'));
    
    // Add a small pause to let users read the message
    await new Promise(resolve => setTimeout(resolve, 2000));
}

// Display simulated AI chat with programmer joke (kept for backward compatibility)
export async function displayAIChat(_agent?: GrokAgent): Promise<void> {
    // This function is now deprecated in favor of the new logo display
    // but kept for backward compatibility
    return;
}

// Display complete intro sequence
export async function displayIntroSequence(agent?: GrokAgent): Promise<void> {
    // Just show the new logo with dynamic content
    await displayClankerLogo(agent);
    
    // Clear screen after logo display
    await clearConsole();
}