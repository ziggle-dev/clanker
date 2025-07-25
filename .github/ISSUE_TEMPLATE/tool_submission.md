---
name: Tool Submission
about: Submit a new tool for inclusion in Clanker
title: '[TOOL] '
labels: tool, community
assignees: ''

---

## Tool Information
**Name**: Your Tool Name  
**ID**: `your_tool_id`  
**Category**: [File Operations / System / Search / AI / Other]

## Description
A clear description of what your tool does and why it's useful.

## Use Cases
Specific scenarios where this tool would be valuable:
1. 
2. 
3. 

## Tool Code
<details>
<summary>Complete tool implementation</summary>

```typescript
// Paste your complete tool code here
import { createDynamicTool } from '../../registry';

export default createDynamicTool({
  id: 'your_tool_id',
  name: 'Your Tool Name',
  description: 'What your tool does',
  // ... rest of implementation
});
```
</details>

## Example Usage
Show how the AI agent would use this tool:
```
User: [example prompt]
Clanker: [uses your_tool with these arguments]
Result: [expected output]
```

## Testing
- [ ] Tool has been tested locally
- [ ] Error cases are handled properly
- [ ] Confirmation prompts work (if applicable)
- [ ] Tool follows Clanker conventions

## Dependencies
List any new dependencies this tool requires:
- npm packages
- System commands
- External services

## Security Considerations
- Does this tool access sensitive data?
- Does it perform destructive operations?
- Are there any security implications?

## Documentation
- [ ] Tool has clear description
- [ ] All parameters are documented
- [ ] Examples are provided
- [ ] Error messages are helpful

## License
- [ ] I agree to contribute this tool under the MIT license
- [ ] This is my original work or I have permission to contribute it