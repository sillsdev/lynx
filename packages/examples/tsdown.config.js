import library from '@repo/tsdown-config/library.js';
import { defineConfig } from 'tsdown';

export default defineConfig({ ...library({ hasLocalizations: true }) });
