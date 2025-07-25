import { generateToolManifest } from './generate-tool-manifest.js';

export const manifestPlugin = {
  name: 'tool-manifest',
  async buildEnd() {
    await generateToolManifest();
  }
};