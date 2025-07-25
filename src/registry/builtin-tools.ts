/**
 * Built-in tools registry
 * This file imports all built-in tools statically so they work in bundled environments
 */

import bashTool from '../tools/dynamic/bash';
import createTodoListTool from '../tools/dynamic/create-todo-list';
import inputTool from '../tools/dynamic/input';
import listTodosTool from '../tools/dynamic/list-todos';
import listTool from '../tools/dynamic/list';
import multiEditTool from '../tools/dynamic/multi-edit';
import pwdTool from '../tools/dynamic/pwd';
import readFileTool from '../tools/dynamic/read-file';
import removeTool from '../tools/dynamic/remove';
import searchTool from '../tools/dynamic/search';
import summarizeTool from '../tools/dynamic/summarize';
import updateTodoListTool from '../tools/dynamic/update-todo-list';
import viewFileTool from '../tools/dynamic/view-file';
import writeToFileTool from '../tools/dynamic/write-to-file';

import { ToolDefinition } from './types';

// Array of all built-in tools
export const builtInTools: ToolDefinition[] = [
    bashTool,
    createTodoListTool,
    inputTool,
    listTodosTool,
    listTool,
    multiEditTool,
    pwdTool,
    readFileTool,
    removeTool,
    searchTool,
    summarizeTool,
    updateTodoListTool,
    viewFileTool,
    writeToFileTool
];

// Map for quick lookup
export const builtInToolsMap = new Map<string, ToolDefinition>(
    builtInTools.map(tool => [tool.id, tool])
);