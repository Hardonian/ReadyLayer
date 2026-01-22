import { createConsoleAdapter, createLogger } from '../lib/cli/logger';

export const console = createConsoleAdapter(createLogger('script'));
