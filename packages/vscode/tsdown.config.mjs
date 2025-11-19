import extension from '@repo/tsdown-config/extension.js';
import { defineConfig } from 'tsdown';

export default defineConfig({ ...extension() });
