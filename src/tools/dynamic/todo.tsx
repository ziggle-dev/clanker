/**
 * Todo tool implementation using the new dynamic tool system
 * Provides todo list creation and update functionality
 */

import React from 'react';
import {Box, Text} from 'ink';
import {createTool, ToolCategory, ExtractToolArgs} from '../../registry';
import {ToolResult} from '../../types';
import {ToolOutput, ToolOutputList, CompactOutput} from '../../ui/components/tool-output';

// Todo item interface
interface TodoItem {
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'high' | 'medium' | 'low';
}

// Tool state - maintains the current todo list
let todoList: TodoItem[] = [];

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
                <Text color="cyan"> Updating todo list...</Text>
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
 * Create todo list tool
 */
export const createTodoListTool = createTool()
    .id('create_todo_list')
    .name('Create Todo List')
    .description('Create a new todo list for planning and tracking tasks')
    .category(ToolCategory.Task)
    .tags('todo', 'task', 'planning', 'tracking')

    // Arguments
    .arrayArg('todos', 'Array of todo items', {
        required: true,
        validate: (todos) => {
            if (!Array.isArray(todos)) {
                return 'Todos must be an array';
            }

            const ids = new Set<string>();

            for (const todo of todos) {
                if (!todo || typeof todo !== 'object') {
                    return 'Each todo must be an object';
                }

                const typedTodo = todo as TodoItem;

                if (!typedTodo.id || typeof typedTodo.id !== 'string') {
                    return 'Each todo must have a string id';
                }

                if (ids.has(typedTodo.id)) {
                    return `Duplicate todo id: ${typedTodo.id}`;
                }
                ids.add(typedTodo.id);

                if (!typedTodo.content || typeof typedTodo.content !== 'string') {
                    return 'Each todo must have content';
                }

                if (!typedTodo.status || !['pending', 'in_progress', 'completed'].includes(typedTodo.status)) {
                    return 'Each todo status must be pending, in_progress, or completed';
                }

                if (!typedTodo.priority || !['high', 'medium', 'low'].includes(typedTodo.priority)) {
                    return 'Each todo priority must be high, medium, or low';
                }
            }

            return true;
        }
    })

    .onInitialize(async (context) => {
        context.logger?.debug('Todo list initialized');
    })

    // Add custom renderer
    .renderResult(renderTodoList)
    
    // Add examples
    .examples([
        {
            description: "Create a todo list with two tasks",
            arguments: {
                todos: [
                    {
                        id: "1",
                        content: "Read all the files in the project",
                        status: "pending",
                        priority: "high"
                    },
                    {
                        id: "2",
                        content: "Synthesize the important files",
                        status: "pending",
                        priority: "medium"
                    }
                ]
            },
            result: "Created todo list with 2 items"
        },
        {
            description: "Create an empty todo list",
            arguments: {
                todos: []
            },
            result: "Created todo list with 0 items"
        }
    ])

    // Execute
    .execute(async (args, context) => {
        const {todos} = args as { todos: TodoItem[] };

        context.logger?.debug(`Creating todo list with ${todos.length} items`);

        // Replace the entire todo list
        todoList = todos.map((todo) => ({
            id: todo.id,
            content: todo.content,
            status: todo.status,
            priority: todo.priority
        }));

        // Generate summary
        const summary = generateTodoSummary();

        context.logger?.info(`Created todo list with ${todoList.length} items`);
        return {
            success: true,
            output: `Created todo list with ${todoList.length} items:\n\n${summary}`,
            data: {todos: todoList}
        };
    })
    .build();

/**
 * Update todo list tool
 */
export const updateTodoListTool = createTool()
    .id('update_todo_list')
    .name('Update Todo List')
    .description('Update existing todos in the todo list')
    .category(ToolCategory.Task)
    .tags('todo', 'task', 'update', 'modify')

    // Arguments
    .arrayArg('updates', 'Array of todo updates', {
        required: true,
        validate: (updates) => {
            if (!Array.isArray(updates)) {
                return 'Updates must be an array';
            }

            for (const update of updates) {
                if (!update || typeof update !== 'object') {
                    return 'Each update must be an object';
                }

                const typedUpdate = update as Partial<TodoItem> & { id: string };

                if (!typedUpdate.id || typeof typedUpdate.id !== 'string') {
                    return 'Each update must have a string id';
                }

                if (typedUpdate.status && !['pending', 'in_progress', 'completed'].includes(typedUpdate.status)) {
                    return 'Status must be pending, in_progress, or completed';
                }

                if (typedUpdate.priority && !['high', 'medium', 'low'].includes(typedUpdate.priority)) {
                    return 'Priority must be high, medium, or low';
                }

                if (typedUpdate.content && typeof typedUpdate.content !== 'string') {
                    return 'Content must be a string';
                }
            }

            return true;
        }
    })

    // Add custom renderer
    .renderResult(renderTodoList)
    
    // Add examples
    .examples([
        {
            description: "Mark a todo as completed",
            arguments: {
                updates: [
                    {
                        id: "1",
                        status: "completed"
                    }
                ]
            },
            result: "Updated 1 todo(s): 1"
        },
        {
            description: "Update multiple todos - mark one as in progress and another as completed",
            arguments: {
                updates: [
                    {
                        id: "1",
                        status: "in_progress"
                    },
                    {
                        id: "2",
                        status: "completed",
                        priority: "high"
                    }
                ]
            },
            result: "Updated 2 todo(s): 1, 2"
        },
        {
            description: "Change todo content and priority",
            arguments: {
                updates: [
                    {
                        id: "1",
                        content: "Read and understand all project files",
                        priority: "high"
                    }
                ]
            },
            result: "Updated 1 todo(s): 1"
        }
    ])

    // Execute
    .execute(async (args, context) => {
        const {updates} = args as { updates: Array<Partial<TodoItem> & { id: string }> };

        context.logger?.debug(`Updating ${updates.length} todo items`);

        const updatedIds: string[] = [];
        const notFoundIds: string[] = [];

        for (const update of updates) {
            const todoIndex = todoList.findIndex(todo => todo.id === update.id);

            if (todoIndex === -1) {
                context.logger?.warn(`Todo not found: ${update.id}`);
                notFoundIds.push(update.id);
                continue;
            }

            // Apply updates
            if (update.status) {
                todoList[todoIndex].status = update.status;
            }
            if (update.priority) {
                todoList[todoIndex].priority = update.priority;
            }
            if (update.content) {
                todoList[todoIndex].content = update.content;
            }

            updatedIds.push(update.id);
            context.logger?.debug(`Updated todo ${update.id}`);
        }

        // Generate response
        const messages: string[] = [];

        if (updatedIds.length > 0) {
            messages.push(`Updated ${updatedIds.length} todo(s): ${updatedIds.join(', ')}`);
        }

        if (notFoundIds.length > 0) {
            messages.push(`Todo(s) not found: ${notFoundIds.join(', ')}`);
        }

        if (messages.length === 0) {
            messages.push('No updates performed');
        }

        // Add summary
        messages.push('');
        messages.push('Current todo list:');
        messages.push(generateTodoSummary());

        context.logger?.info(`Todo update completed: ${updatedIds.length} updated, ${notFoundIds.length} not found`);
        return {
            success: notFoundIds.length === 0,
            output: messages.join('\n'),
            data: {todos: todoList, updated: updatedIds, notFound: notFoundIds}
        };
    })
    .build();

/**
 * Generate a formatted summary of the todo list
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
 * List todos tool
 */
export const listTodosTools = createTool()
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

// Export all tools
export default [createTodoListTool, updateTodoListTool, listTodosTools];

// Export types for the todo tools
export type CreateTodoListArgs = ExtractToolArgs<typeof createTodoListTool>;
export type UpdateTodoListArgs = ExtractToolArgs<typeof updateTodoListTool>;
export type ListTodosArgs = ExtractToolArgs<typeof listTodosTools>;
