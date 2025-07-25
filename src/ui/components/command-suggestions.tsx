import React from "react";
import { Box, Text } from "ink";
import { useSnapshot } from "valtio";
import { store } from "../../store";

/**
 * CommandSuggestions component - shows command autocomplete suggestions
 * Uses Zustand store directly - no props needed
 */
export function CommandSuggestions() {
  // Get state directly from store
  const snap = useSnapshot(store);
  const inputValue = snap.inputValue;
  const showCommandSuggestions = snap.showCommandSuggestions;
  const selectedCommandIndex = snap.selectedCommandIndex;
  const commandSuggestions = snap.commandSuggestions;
  
  if (!showCommandSuggestions) return null;

  // Parse suggestions (they come as "command - description" strings)
  const parsedSuggestions = commandSuggestions.map(s => {
    const [command, ...descParts] = s.split(" - ");
    return { command, description: descParts.join(" - ") };
  });

  const filteredSuggestions = parsedSuggestions
    .filter((suggestion) =>
      inputValue.startsWith("/")
        ? suggestion.command.startsWith("/")
        : suggestion.command.toLowerCase().startsWith(inputValue.toLowerCase())
    )
    .slice(0, 8);

  return (
    <Box marginTop={1} flexDirection="column">
      {filteredSuggestions.map((suggestion, index) => (
        <Box key={index} paddingLeft={1}>
          <Text
            color={index === selectedCommandIndex ? "black" : "white"}
            backgroundColor={index === selectedCommandIndex ? "cyan" : undefined}
          >
            {suggestion.command}
          </Text>
          <Box marginLeft={1}>
            <Text color="gray">{suggestion.description}</Text>
          </Box>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          ↑↓ navigate • Enter/Tab select • Esc cancel
        </Text>
      </Box>
    </Box>
  );
}