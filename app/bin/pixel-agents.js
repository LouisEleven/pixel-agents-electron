#!/usr/bin/env node

console.log('Pixel Agents CLI');

const args = process.argv.slice(2);
const command = args[0] || 'start';

switch (command) {
  case 'start':
  case 'open':
    console.log('Launching Pixel Agents...');
    // Launch the Electron app
    require('../dist/main/index.js');
    break;

  case 'new':
    console.log('Starting new agent...');
    // TODO: Send IPC to running app
    break;

  case 'help':
    console.log(`
Pixel Agents CLI

Usage:
  pixel-agents [command]

Commands:
  start     Launch Pixel Agents app (default)
  open      Open running Pixel Agents window
  new       Start a new agent
  help      Show this help message

Options:
  --cwd     Set working directory for new agent
  --bypass  Skip permission prompts
`);
    break;

  default:
    console.log(`Unknown command: ${command}`);
    console.log('Run "pixel-agents help" for usage information.');
    process.exit(1);
}
