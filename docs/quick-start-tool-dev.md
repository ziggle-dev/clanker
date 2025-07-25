# Quick Start: Tool Development

This guide will walk you through creating your first Clanker tool in 5 minutes.

## 1. Create Your Tool Project

```bash
npx create-clanker-tool
```

Answer the prompts:
- Tool name: `hello-world`
- Organization: `myorg` (or your username)
- Description: `A simple hello world tool`
- Author: Your name
- TypeScript: Yes (recommended)

## 2. Navigate to Your Project

```bash
cd hello-world
npm install
```

## 3. Edit Your Tool

Open `src/index.ts` and modify it:

```typescript
const hello_world = {
  id: 'hello_world',
  name: 'hello-world',
  description: 'A simple hello world tool',
  
  arguments: [
    {
      name: 'name',
      type: 'string',
      description: 'Name to greet',
      required: false,
      default: 'World'
    }
  ],
  
  execute: async (args) => {
    const { name } = args;
    const greeting = `Hello, ${name}! 👋`;
    
    return {
      success: true,
      output: greeting,
      data: {
        name,
        timestamp: new Date().toISOString()
      }
    };
  }
};

export default hello_world;
```

## 4. Build and Test Locally

```bash
# Build TypeScript
npm run build

# Bundle for distribution
npm run bundle

# Install locally for testing
npm run install:local
```

## 5. Test with Clanker

```bash
# List tools to verify it's loaded
clanker --list-tools | grep hello_world

# Test the tool
clanker --prompt "Use hello_world to greet Alice"
```

Expected output:
```
Hello, Alice! 👋
```

## 6. Development with Hot Reload

For rapid development:

```bash
# Terminal 1: Watch and rebuild
npm run dev:watch

# Terminal 2: Test your changes
clanker --prompt "Use hello_world tool"
```

## 7. Publish Your Tool

When ready to share:

```bash
npm run publish:tool
```

This will:
1. Bundle your tool
2. Generate a manifest
3. Create a PR template
4. Guide you through submission

## What's Next?

- Read the full [Tool Development Guide](tools.md)
- Explore the [Package Manager](package-manager.md)
- Browse [existing tools](https://github.com/ziggle-dev/clanker-tools)
- Join the [community](https://github.com/ziggle-dev/clanker/discussions)

## Example: Weather Tool

Here's a slightly more complex example:

```typescript
const weather_tool = {
  id: 'weather',
  name: 'Weather Checker',
  description: 'Check weather for any location',
  
  arguments: [
    {
      name: 'location',
      type: 'string',
      description: 'City name',
      required: true
    },
    {
      name: 'units',
      type: 'string',
      description: 'Temperature units',
      required: false,
      default: 'celsius',
      enum: ['celsius', 'fahrenheit']
    }
  ],
  
  execute: async (args) => {
    const { location, units } = args;
    
    // In a real tool, you'd call a weather API
    const temp = Math.floor(Math.random() * 30) + 10;
    const conditions = ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)];
    
    const unitSymbol = units === 'celsius' ? '°C' : '°F';
    
    return {
      success: true,
      output: `Weather in ${location}: ${conditions}, ${temp}${unitSymbol}`,
      data: {
        location,
        temperature: temp,
        units,
        conditions
      }
    };
  }
};

export default weather_tool;
```

## Tips

1. **Start Simple**: Get a basic version working first
2. **Test Locally**: Use `npm run install:local` frequently
3. **Handle Errors**: Always return `{ success: false, error: '...' }` on failure
4. **Document Well**: Clear descriptions help the AI use your tool correctly
5. **Version Properly**: Use semantic versioning (1.0.0, 1.1.0, 2.0.0)

Happy tool building! 🛠️