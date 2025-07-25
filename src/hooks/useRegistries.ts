import { createRegistry as createMessageRegistry } from '../registry/messages';
import { createExecutionRegistry } from '../registry/execution';

/**
 * Hook to get global registries
 * Since registries are now just facades over Valtio store,
 * we don't need state or lifecycle management
 */
export function useRegistries() {
  // These are just global singletons now
  const messageRegistry = createMessageRegistry();
  const executionRegistry = createExecutionRegistry();
  
  return {
    messageRegistry,
    executionRegistry,
  };
}