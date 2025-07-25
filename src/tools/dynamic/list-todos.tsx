/**
 * List todos tool
 */

import React from 'react';
import {Box, Text} from 'ink';
import {createTool, ToolCategory, ExtractToolArgs} from '../../registry';
import {ToolResult} from '../../types';
import {ToolOutput, CompactOutput} from '../../ui/components/tool-output';
import {todoList} from './create-todo-list';

// Todo item interface
interface TodoItem {
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'high' | 'medium' | 'low';
}

/**
 * Generate todo summary
 */
function generateTodoSummary(): string {
    if (todoList.length === 0) {
        return 'No todos';
    }

    // Group by status
    const byStatus = {
        pending: todoList.filter(t => t.status === 'pending'),
        in_progress: todoList.filter(t => t.status === 'in_progress'),
        completed: todoList.filter(t => t.status === 'completed')
    };

    const lines: string[] = [];

    // High priority pending/in-progress items first
    const urgent = [...byStatus.pending, ...byStatus.in_progress]
        .filter(t => t.priority === 'high')
        .sort((a, b) => {
            if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
            if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
            return 0;
        });

    if (urgent.length > 0) {
        lines.push('🔴 High Priority:');
        urgent.forEach(todo => {
            const statusIcon = todo.status === 'in_progress' ? '🔄' : '⏳';
            lines.push(`  ${statusIcon} [${todo.id}] ${todo.content}`);
        });
        lines.push('');
    }

    // Other pending/in-progress items
    const other = [...byStatus.pending, ...byStatus.in_progress]
        .filter(t => t.priority !== 'high')
        .sort((a, b) => {
            if (a.priority === 'medium' && b.priority === 'low') return -1;
            if (a.priority === 'low' && b.priority === 'medium') return 1;
            if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
            if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
            return 0;
        });

    if (other.length > 0) {
        lines.push('📋 Other Tasks:');
        other.forEach(todo => {
            const statusIcon = todo.status === 'in_progress' ? '🔄' : '⏳';
            const priorityIcon = todo.priority === 'medium' ? '🟡' : '🟢';
            lines.push(`  ${statusIcon} ${priorityIcon} [${todo.id}] ${todo.content}`);
        });
        lines.push('');
    }

    // Completed items
    if (byStatus.completed.length > 0) {
        lines.push(`✅ Completed (${byStatus.completed.length}):`)
        byStatus.completed.slice(0, 5).forEach(todo => {
            lines.push(`  ✓ [${todo.id}] ${todo.content}`);
        });
        if (byStatus.completed.length > 5) {
            lines.push(`  ... and ${byStatus.completed.length - 5} more`);
        }
    }

    // Summary stats
    lines.push('');
    lines.push(`Total: ${todoList.length} | Pending: ${byStatus.pending.length} | In Progress: ${byStatus.in_progress.length} | Completed: ${byStatus.completed.length}`);

    return lines.join('\n');
}

/**
 * Custom renderer for todo list display
 */
const renderTodoList = ({
    toolName,
    arguments: args,
    result,
    isExecuting
}: {
    toolName: string;
    arguments: Record<string, unknown>;
    result?: ToolResult;
    isExecuting: boolean;
}) => {
    if (isExecuting) {
        return (
            <CompactOutput>
                <Text color="cyan"> Loading todo list...</Text>
            </CompactOutput>
        );
    }

    if (!result || !result.success) {
        return (
            <CompactOutput>
                <Text color="red"> Error: {result?.error || 'Unknown error'}</Text>
            </CompactOutput>
        );
    }

    const todos = (result.data as { todos: TodoItem[] })?.todos || [];
    if (todos.length === 0) {
        return (
            <CompactOutput>
                <Text color="gray"> No todos</Text>
            </CompactOutput>
        );
    }

    const elements: React.ReactElement[] = [];
    
    // Group by status
    const byStatus = {
        pending: todos.filter(t => t.status === 'pending'),
        in_progress: todos.filter(t => t.status === 'in_progress'),
        completed: todos.filter(t => t.status === 'completed')
    };

    // Show high priority items
    const urgent = [...byStatus.pending, ...byStatus.in_progress]
        .filter(t => t.priority === 'high')
        .sort((a, b) => {
            if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
            if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
            return 0;
        });

    if (urgent.length > 0) {
        urgent.forEach(todo => {
            elements.push(
                <Box key={`todo-${todo.id}`}>
                    <Text color={todo.status === 'in_progress' ? 'cyan' : 'yellow'}>
                        {todo.status === 'in_progress' ? '  ◐ ' : '  ○ '}
                    </Text>
                    <Text color="white">{todo.content}</Text>
                    <Text color="red"> ●</Text>
                </Box>
            );
        });
    }

    // Show other pending/in-progress items
    const other = [...byStatus.pending, ...byStatus.in_progress]
        .filter(t => t.priority !== 'high')
        .sort((a, b) => {
            if (a.priority === 'medium' && b.priority === 'low') return -1;
            if (a.priority === 'low' && b.priority === 'medium') return 1;
            if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
            if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
            return 0;
        });

    if (other.length > 0) {
        other.forEach(todo => {
            const priorityColor = todo.priority === 'medium' ? 'yellow' : 'green';
            elements.push(
                <Box key={`todo-${todo.id}`}>
                    <Text color={todo.status === 'in_progress' ? 'cyan' : 'gray'}>
                        {todo.status === 'in_progress' ? '  ◐ ' : '  ○ '}
                    </Text>
                    <Text color="white">{todo.content}</Text>
                    <Text color={priorityColor}> ●</Text>
                </Box>
            );
        });
    }

    // Show completed items (dimmed out)
    if (byStatus.completed.length > 0) {
        byStatus.completed.slice(0, 3).forEach(todo => {
            elements.push(
                <Box key={`todo-${todo.id}`}>
                    <Text color="green">  ● </Text>
                    <Text color="gray" dimColor>{todo.content}</Text>
                </Box>
            );
        });
        
        if (byStatus.completed.length > 3) {
            elements.push(
                <Box key="more-completed">
                    <Text color="gray">  ... and {byStatus.completed.length - 3} more completed</Text>
                </Box>
            );
        }
    }

    return (
        <ToolOutput>
            <Box flexDirection="column">
                {elements}
            </Box>
        </ToolOutput>
    );
};

/**
 * List todos tool
 */
const listTodosTools = createTool()
    .id('list_todos')
    .name('List Todos')
    .description('List all current todos in the todo list')
    .category(ToolCategory.Task)
    .tags('todo', 'task', 'list', 'view')
    
    // Add custom renderer
    .renderResult(renderTodoList)
    
    // Add examples
    .examples([
        {
            description: "List all todos",
            arguments: {},
            result: "Current todo list with all items displayed"
        }
    ])
    
    // Execute
    .execute(async (args, context) => {
        context.logger?.debug(`Listing ${todoList.length} todo items`);
        
        if (todoList.length === 0) {
            return {
                success: true,
                output: "No todos in the list",
                data: {todos: []}
            };
        }
        
        // Generate summary
        const summary = generateTodoSummary();
        
        context.logger?.info(`Listed ${todoList.length} todo items`);
        return {
            success: true,
            output: summary,
            data: {todos: todoList}
        };
    })
    .build();

export default listTodosTools;

// Export type
export type ListTodosArgs = ExtractToolArgs<typeof listTodosTools>;