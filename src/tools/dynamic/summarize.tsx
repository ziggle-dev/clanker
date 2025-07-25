/**
 * Summarize tool - provides intelligent text summarization with optional guidance
 */

import React from 'react';
import {Text, Box} from 'ink';
import {createTool, ToolCategory, ToolCapability, ExtractToolArgs} from '../../registry';
import {CompactOutput, ToolOutput} from '../../ui/components/tool-output';
import {GrokClient} from '../../clanker/client';
import {SettingsManager} from '../../utils/settings-manager';
import * as fs from 'fs';
import * as path from 'path';

const summarizeTool = createTool()
    .id('summarize')
    .name('Text Summarizer')
    .description('Intelligently summarize text content into a concise, structured markdown format with numbered lists, key points, and hierarchical organization. Produces high-level overviews while preserving essential details when necessary.')
    .category(ToolCategory.Utility)
    .capabilities(ToolCapability.FileRead)
    .tags('summarize', 'text', 'analysis', 'extract', 'condense')

    // Arguments
    .stringArg('text', 'The text content to summarize', {
        required: false,
        validate: (value) => {
            if (value !== undefined && typeof value !== 'string') return 'Text must be a string';
            if (value && value.trim().length < 10) return 'Text must be at least 10 characters long';
            if (value && value.trim().length > 100000) return 'Text must be less than 100,000 characters';
            return true;
        }
    })
    .stringArg('file', 'Path to file to summarize (alternative to text)', {
        required: false,
        validate: (value) => {
            if (value !== undefined && typeof value !== 'string') return 'File path must be a string';
            return true;
        }
    })
    .stringArg('instructions', 'Optional instructions for how to summarize (e.g., "focus on technical details", "extract action items", "keep it under 50 words")', {required: false})

    // Examples
    .examples([
        {
            description: "Summarize meeting notes extracting action items",
            arguments: {
                text: "Meeting Notes - Product Launch Review\n\nAttendees: Sarah (PM), Mike (Dev), Lisa (Design)\n\nDiscussion:\n- Sarah presented the launch timeline, targeting March 15th\n- Mike mentioned the API integration is 80% complete, needs 2 more days\n- Lisa showed the new UI mockups, team loved the dark mode option\n- Budget concerns raised about marketing spend\n\nDecisions:\n- Approved dark mode for v1.0\n- Marketing budget capped at $50k\n- Beta testing starts March 1st\n\nNext Steps:\n- Mike to complete API by Friday\n- Lisa to finalize icons by next week\n- Sarah to recruit 20 beta testers",
                instructions: "Extract only the action items and deadlines in a bullet list"
            },
            result: "• Mike: Complete API integration by Friday\n• Lisa: Finalize icons by next week\n• Sarah: Recruit 20 beta testers\n• Team: Start beta testing March 1st\n• Team: Launch product March 15th"
        },
        {
            description: "Technical documentation summary for quick reference",
            arguments: {
                text: "# Redis Cluster Configuration Guide\n\nRedis Cluster provides a way to run a Redis installation where data is automatically sharded across multiple Redis nodes. Redis Cluster also provides some degree of availability during partitions.\n\n## Minimal Requirements\n- At least 3 master nodes\n- Recommended: 6 nodes (3 masters, 3 replicas)\n- Each node should have at least 16GB RAM\n- Network latency between nodes < 2ms\n\n## Configuration Steps\n1. Install Redis on all nodes\n2. Configure redis.conf with cluster-enabled yes\n3. Set cluster-config-file nodes.conf\n4. Define cluster-node-timeout 5000\n5. Start all Redis instances\n6. Use redis-cli --cluster create to form cluster\n7. Verify with redis-cli --cluster check\n\n## Important Notes\n- Cluster uses hash slots (16384 total)\n- Automatic failover requires majority of masters\n- Cross-slot operations require special handling\n- Monitor with redis-cli --cluster info",
                instructions: "Create a condensed technical summary focusing on the essential setup requirements and key concepts, suitable for a DevOps quick reference card"
            },
            result: "**Redis Cluster Quick Ref**\n\n**Min Setup**: 3 masters (recommended: 3 masters + 3 replicas), 16GB RAM/node, <2ms latency\n\n**Config**: cluster-enabled yes, cluster-node-timeout 5000\n\n**Commands**: redis-cli --cluster [create|check|info]\n\n**Key Points**: 16384 hash slots, auto-failover needs majority, cross-slot ops need special handling"
        },
        {
            description: "Extract key insights from user research data",
            arguments: {
                text: "User Interview Summary - E-commerce Mobile App\n\nParticipant 1 (Age 28, frequent buyer):\n- Loves the quick checkout feature\n- Frustrated by slow image loading\n- Wants better filter options\n- Would pay for premium shipping\n\nParticipant 2 (Age 45, occasional buyer):\n- Finds navigation confusing\n- Appreciates detailed product descriptions\n- Wants guest checkout option\n- Price comparison feature requested\n\nParticipant 3 (Age 22, daily user):\n- Uses wishlist extensively\n- Wants social sharing features\n- Frustrated by limited payment options\n- Loves the recommendation engine\n\nParticipant 4 (Age 35, business buyer):\n- Needs bulk ordering features\n- Wants invoice generation\n- Requires purchase approval workflow\n- Appreciates order tracking\n\nCommon themes observed:\n- Loading performance issues (3/4 users)\n- Payment options need expansion (2/4 users)\n- Navigation could be improved (2/4 users)",
                instructions: "Identify the top 3 pain points and top 3 valued features based on user feedback frequency"
            },
            result: "**Top 3 Pain Points:**\n1. Performance issues (slow image loading) - 75% of users\n2. Limited payment options - 50% of users\n3. Navigation complexity - 50% of users\n\n**Top 3 Valued Features:**\n1. Quick checkout process\n2. Product recommendations\n3. Order tracking/wishlist functionality"
        },
        {
            description: "Summarize a file with specific focus",
            arguments: {
                file: "docs/architecture.md",
                instructions: "Focus on the key design decisions and system components"
            },
            result: "**Key Design Decisions:**\n1. Microservices architecture for scalability\n2. Event-driven communication via Kafka\n3. PostgreSQL for transactional data, Redis for caching\n\n**System Components:**\n- API Gateway (Kong)\n- Authentication Service (OAuth2)\n- Core Business Services (User, Product, Order)\n- Data Pipeline (Apache Spark)\n- Monitoring Stack (Prometheus/Grafana)"
        },
        {
            description: "Create an executive summary from a technical report",
            arguments: {
                text: "Q4 2024 Infrastructure Performance Report\n\nOverview:\nOur cloud infrastructure served 2.4 billion requests this quarter, a 40% increase from Q3. Overall uptime was 99.97%, meeting our SLA requirements.\n\nKey Metrics:\n- Average response time: 120ms (down from 145ms in Q3)\n- Peak concurrent users: 1.2M (Oct 15 during flash sale)\n- Data transferred: 850TB\n- Cost per transaction: $0.0023 (reduced by 15%)\n\nIncidents:\n- Oct 5: 15-minute partial outage affecting EU region (faulty load balancer)\n- Nov 12: 5-minute database replication lag causing stale data\n- Dec 3: DDoS attack successfully mitigated, no user impact\n\nInfrastructure Changes:\n- Migrated 60% of services to Kubernetes\n- Implemented new caching layer (Redis Cluster)\n- Upgraded all database instances to latest version\n- Added 3 new edge locations in Asia\n\nBudget:\n- Total spend: $485,000 (under budget by 8%)\n- Largest cost: Compute (45%), Storage (30%), Network (25%)\n\nRecommendations:\n1. Complete Kubernetes migration by Q1 2025\n2. Implement multi-region database failover\n3. Investigate serverless options for variable workloads\n4. Upgrade monitoring stack to reduce incident detection time",
                instructions: "Create a 100-word executive summary highlighting business impact, major achievements, and critical recommendations"
            },
            result: "Q4 infrastructure handled 40% more traffic (2.4B requests) while reducing costs by 15% and improving performance (120ms avg response). Achieved 99.97% uptime despite three minor incidents. Key wins: 60% Kubernetes migration, new Redis caching layer, and 3 Asian edge locations delivered under budget ($485K). Critical recommendations: complete Kubernetes migration Q1 2025, implement multi-region database failover for resilience, and explore serverless to optimize variable workload costs. Infrastructure successfully supported business growth while improving efficiency."
        },
        {
            description: "Summarize code review comments for PR description",
            arguments: {
                text: "Code Review Comments for PR #1234: Implement User Authentication\n\nReviewer 1 (Senior Dev):\n- Line 45: Password hashing should use bcrypt instead of SHA256\n- Line 78: SQL injection vulnerability in login query - use parameterized queries\n- Line 120: Good error handling implementation\n- Line 145: Rate limiting needed on login endpoint\n- Overall: Solid structure but security improvements needed\n\nReviewer 2 (Security Lead):\n- Critical: Store sessions in Redis, not in memory\n- Add CSRF token validation\n- Implement account lockout after failed attempts\n- Enable secure cookie flags\n- Add audit logging for auth events\n\nReviewer 3 (Tech Lead):\n- Extract validation logic to separate module\n- Add unit tests for auth functions\n- Update API documentation\n- Consider using JWT for stateless auth\n- Performance: Add database indexes for email field\n\nPositive feedback:\n- Clean code structure\n- Good error messages\n- Follows team naming conventions",
                instructions: "Summarize as a brief PR update comment, grouping by: critical security fixes needed, suggested improvements, and positive aspects"
            },
            result: "**PR Update Summary:**\n\n🔴 **Critical Security Fixes Required:**\n- Replace SHA256 with bcrypt for passwords\n- Fix SQL injection vulnerability using parameterized queries\n- Implement Redis session storage\n- Add CSRF protection and secure cookie flags\n\n🟡 **Suggested Improvements:**\n- Add rate limiting and account lockout\n- Include audit logging\n- Create unit tests and extract validation logic\n- Add database indexes for performance\n- Update API docs\n\n✅ **Positive:** Clean structure, good error handling, follows conventions"
        }
    ])

    // Execute
    .execute(async (args, context) => {
        const {text, file, instructions} = args as {
            text?: string;
            file?: string;
            instructions?: string;
        };

        // Validate that either text or file is provided
        if (!text && !file) {
            return {
                success: false,
                error: 'Either text or file parameter must be provided'
            };
        }

        if (text && file) {
            return {
                success: false,
                error: 'Cannot provide both text and file parameters'
            };
        }

        let contentToSummarize = text || '';

        // Read file if file path is provided
        if (file) {
            try {
                const resolvedPath = path.resolve(context.workingDirectory, file);
                if (!fs.existsSync(resolvedPath)) {
                    return {
                        success: false,
                        error: `File not found: ${file}`
                    };
                }
                contentToSummarize = fs.readFileSync(resolvedPath, 'utf-8');
                context.logger?.debug(`Read file: ${resolvedPath} (${contentToSummarize.length} characters)`);
            } catch (error) {
                return {
                    success: false,
                    error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }

        context.logger?.debug(`Summarizing text of length: ${contentToSummarize.length}`);
        if (instructions) {
            context.logger?.debug(`Using custom instructions: ${instructions}`);
        }

        try {
            // Get settings to create a client
            const settingsManager = SettingsManager.getInstance();
            const {settings, isValid} = settingsManager.loadSettings();
            
            if (!isValid || !settings.apiKey) {
                // Fall back to basic text processing if no API key available
                context.logger?.warn('No API key configured, using basic text processing');
                return performBasicSummarization(contentToSummarize, instructions, context);
            }

            // Create a client for chat completion
            const baseURL = settings.provider === 'custom' && settings.customBaseURL 
                ? settings.customBaseURL 
                : undefined;
            
            const client = new GrokClient(
                settings.apiKey,
                settings.model,
                baseURL
            );

            // Prepare the summarization prompt
            let prompt = `Please summarize the following text in a clear and concise manner:\n\n${contentToSummarize}`;
            
            if (instructions) {
                prompt = `Please summarize the following text according to these instructions: ${instructions}\n\nText to summarize:\n${contentToSummarize}`;
            }

            context.logger?.info('Generating AI-powered summary...');
            
            // Make the chat completion request
            const response = await client.chat([
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            const summary = response.choices[0]?.message?.content || '';
            
            if (!summary) {
                return {
                    success: false,
                    error: 'No summary generated from AI'
                };
            }
            // Calculate stats
            const originalWords = contentToSummarize.split(/\s+/).length;
            const summaryWords = summary.split(/\s+/).length;
            const compressionRatio = Math.round((1 - summaryWords / originalWords) * 100);

            context.logger?.info(`AI summary generated successfully (${compressionRatio}% compression)`);

            return {
                success: true,
                output: summary,
                data: {
                    originalLength: contentToSummarize.length,
                    summaryLength: summary.length,
                    originalWords,
                    summaryWords,
                    compressionRatio,
                    instructions,
                    summaryType: 'ai_generated',
                    source: file ? `file: ${file}` : 'text input'
                }
            };
        } catch (error) {
            context.logger?.error(`Summarization failed: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                error: `Failed to summarize: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    })
    
    // Custom renderer
    .renderResult(({ isExecuting, result, arguments: args }) => {
        if (isExecuting) {
            return (
                <CompactOutput>
                    <Text color="cyan"> Generating summary...</Text>
                </CompactOutput>
            );
        }

        if (!result) {
            return null;
        }

        if (!result.success) {
            return (
                <CompactOutput>
                    <Text color="red"> {result.error || 'Summarization failed'}</Text>
                </CompactOutput>
            );
        }

        const data = result.data as {
            originalWords?: number;
            summaryWords?: number;
            compressionRatio?: number;
            instructions?: string;
            summaryType?: string;
            summaryData?: any;
            source?: string;
            note?: string;
        };

        const summary = result.output || '';
        const summaryType = data?.summaryType || 'unknown';
        const isAIGenerated = summaryType === 'ai_generated';

        // Format the summary output similar to the user's preferred style
        return (
            <ToolOutput>
                <Box flexDirection="column">
                    {/* Main title */}
                    <Box marginBottom={1}>
                        <Text color="cyan" bold>Summary generated with:</Text>
                    </Box>
                    
                    {/* 1. Summary Type and Stats */}
                    <Box flexDirection="column" paddingLeft={2}>
                        <Text bold>1. Summary Statistics:</Text>
                        <Box paddingLeft={3} flexDirection="column">
                            <Text color="gray">   - Type: {isAIGenerated ? 'AI Generated' : summaryType}</Text>
                            {data?.source && <Text color="gray">   - Source: {data.source}</Text>}
                            <Text color="gray">   - Original: {data?.originalWords} words</Text>
                            <Text color="gray">   - Summary: {data?.summaryWords} words</Text>
                            <Text color="gray">   - Compression: {data?.compressionRatio}% reduction</Text>
                            {data?.note && <Text color="yellow">   - Note: {data.note}</Text>}
                        </Box>
                    </Box>
                    
                    {/* 2. Instructions (if provided) */}
                    {data?.instructions && (
                        <Box flexDirection="column" paddingLeft={2} marginTop={1}>
                            <Text bold>2. Instructions Applied:</Text>
                            <Box paddingLeft={3}>
                                <Text color="gray">   - {data.instructions}</Text>
                            </Box>
                        </Box>
                    )}
                    
                    {/* 3. Summary Content */}
                    <Box flexDirection="column" paddingLeft={2} marginTop={1}>
                        <Text bold>{data?.instructions ? '3' : '2'}. Summary Content:</Text>
                        <Box paddingLeft={3} flexDirection="column">
                            {/* Parse and format the summary content */}
                            {summary.split('\n').map((line, i) => {
                                if (line.trim() === '') return <Text key={i}> </Text>;
                                
                                // Handle bold text
                                const boldPattern = /\*\*(.*?)\*\*/g;
                                const parts = line.split(boldPattern);
                                
                                return (
                                    <Text key={i}>
                                        {'   '}
                                        {parts.map((part, j) => 
                                            j % 2 === 1 ? <Text key={j} bold>{part}</Text> : <Text key={j}>{part}</Text>
                                        )}
                                    </Text>
                                );
                            })}
                        </Box>
                    </Box>
                    
                    {/* 4. Features Used */}
                    <Box flexDirection="column" paddingLeft={2} marginTop={1}>
                        <Text bold>{data?.instructions ? '4' : '3'}. Features Used:</Text>
                        <Box paddingLeft={3} flexDirection="column">
                            {isAIGenerated ? (
                                <>
                                    <Text color="gray">   - AI language model processing</Text>
                                    <Text color="gray">   - Context-aware summarization</Text>
                                    <Text color="gray">   - Instruction-guided generation</Text>
                                </>
                            ) : (
                                <>
                                    {summaryType === 'action_items' && (
                                        <>
                                            <Text color="gray">   - Action item extraction</Text>
                                            <Text color="gray">   - Pattern matching for tasks</Text>
                                        </>
                                    )}
                                    {summaryType === 'sections' && (
                                        <>
                                            <Text color="gray">   - Section detection</Text>
                                            <Text color="gray">   - Hierarchical organization</Text>
                                        </>
                                    )}
                                    {summaryType === 'brief' && (
                                        <>
                                            <Text color="gray">   - Concise extraction</Text>
                                            <Text color="gray">   - First impression focus</Text>
                                        </>
                                    )}
                                    {summaryType === 'structured' && (
                                        <>
                                            <Text color="gray">   - Multi-level analysis</Text>
                                            <Text color="gray">   - Key point extraction</Text>
                                            <Text color="gray">   - Section identification</Text>
                                        </>
                                    )}
                                </>
                            )}
                        </Box>
                    </Box>
                    
                    <Box marginTop={1}>
                        <Text color="green" dimColor>✓ Summary ready for use!</Text>
                    </Box>
                </Box>
            </ToolOutput>
        );
    })
    
    .build();

// Helper function for basic summarization when no API is available
function performBasicSummarization(text: string, instructions: string | undefined, context: any) {
    const lines = text.split('\n').filter(line => line.trim());
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    
    // Extract different types of content
    const extractKeyPoints = () => {
        return sentences
            .filter((s: string) => s.trim().length > 30)
            .slice(0, 5)
            .map((s: string) => s.trim());
    };
    
    const extractActionItems = () => {
        const actionPatterns = [
            /(?:will|should|must|need(?:s)? to|have to|going to)\s+\w+/gi,
            /\b(?:TODO|FIXME|ACTION|TASK):\s*.+/gi,
            /\b(?:next steps?|action items?):\s*.+/gi
        ];
        return sentences.filter((s: string) => 
            actionPatterns.some(pattern => pattern.test(s))
        ).map((s: string) => s.trim());
    };
    
    const extractSections = () => {
        const sections: Record<string, string[]> = {};
        let currentSection = 'Overview';
        
        lines.forEach(line => {
            // Check if line is a header
            if (line.match(/^#+\s+/) || line.match(/^[A-Z][^.!?]*:$/)) {
                currentSection = line.replace(/^#+\s+/, '').replace(/:$/, '').trim();
                sections[currentSection] = [];
            } else if (line.trim()) {
                if (!sections[currentSection]) sections[currentSection] = [];
                sections[currentSection].push(line.trim());
            }
        });
        
        return sections;
    };
    
    // Build structured summary based on instructions
    let summaryData: any = {};
    
    if (instructions?.toLowerCase().includes('action')) {
        const actions = extractActionItems();
        summaryData = {
            type: 'action_items',
            title: 'Action Items Extracted',
            items: actions.slice(0, 10),
            count: actions.length
        };
    } else if (instructions?.toLowerCase().includes('section')) {
        const sections = extractSections();
        summaryData = {
            type: 'sections',
            title: 'Document Structure',
            sections: Object.entries(sections).slice(0, 5).map(([title, content]) => ({
                title,
                summary: content.slice(0, 2).join(' ')
            }))
        };
    } else if (instructions?.toLowerCase().includes('brief') || instructions?.toLowerCase().includes('short')) {
        summaryData = {
            type: 'brief',
            title: 'Brief Summary',
            content: sentences.slice(0, 2).join(' ').trim()
        };
    } else {
        // Default structured summary
        const keyPoints = extractKeyPoints();
        const hasActions = extractActionItems().length > 0;
        
        summaryData = {
            type: 'structured',
            title: 'Summary',
            overview: paragraphs[0]?.substring(0, 200) + (paragraphs[0]?.length > 200 ? '...' : ''),
            keyPoints: keyPoints.slice(0, 3),
            sections: Object.keys(extractSections()).slice(0, 3),
            hasActionItems: hasActions
        };
    }
    
    // Convert to markdown format
    let summary = '';
    
    switch (summaryData.type) {
        case 'action_items':
            summary = summaryData.items.map((item: string, i: number) => `${i + 1}. ${item}`).join('\n');
            break;
            
        case 'sections':
            summary = summaryData.sections.map((s: any, i: number) => 
                `${i + 1}. **${s.title}**: ${s.summary}`
            ).join('\n');
            break;
            
        case 'brief':
            summary = summaryData.content;
            break;
            
        case 'structured':
            const parts = [];
            if (summaryData.overview) {
                parts.push(`**Overview**: ${summaryData.overview}`);
            }
            if (summaryData.keyPoints?.length > 0) {
                parts.push('\n**Key Points**:');
                summaryData.keyPoints.forEach((point: string, i: number) => {
                    parts.push(`${i + 1}. ${point}`);
                });
            }
            if (summaryData.sections?.length > 0) {
                parts.push('\n**Sections Found**:');
                summaryData.sections.forEach((section: string, i: number) => {
                    parts.push(`- ${section}`);
                });
            }
            summary = parts.join('\n');
            break;
    }

    // Calculate compression ratio
    const originalWords = text.split(/\s+/).length;
    const summaryWords = summary.split(/\s+/).length;
    const compressionRatio = Math.round((1 - summaryWords / originalWords) * 100);

    context.logger?.info(`Basic summary generated (${compressionRatio}% compression)`);

    return {
        success: true,
        output: summary,
        data: {
            originalLength: text.length,
            summaryLength: summary.length,
            originalWords,
            summaryWords,
            compressionRatio,
            instructions,
            summaryType: summaryData.type,
            summaryData,
            note: 'Basic text processing (no AI)'
        }
    };
}

export default summarizeTool;

// Type for the summarize tool arguments
export type SummarizeToolArgs = ExtractToolArgs<typeof summarizeTool>;