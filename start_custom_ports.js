#!/usr/bin/env node

/**
 * Script to start Automaker with custom ports: UI on 7007, Backend on 7008
 * This script handles the interactive prompts automatically.
 */

import { spawn } from 'child_process';

// Define the ports
const UI_PORT = 7007;
const BACKEND_PORT = 7008;

console.log(`Starting Automaker with:`);
console.log(`- UI (Interface) on port ${UI_PORT}`);
console.log(`- Backend on port ${BACKEND_PORT}`);
console.log('');

// Spawn the dev script
const devProcess = spawn('node', ['dev.mjs'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});

// Track if we've responded to prompts
let respondedToPortChoice = false;
let respondedToModeChoice = false;
let respondedToWebPort = false;
let respondedToServerPort = false;

// Handle output from the dev script
devProcess.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);

  // Look for port selection prompt (when ports are in use or when choosing to use different ports)
  if (!respondedToPortChoice && (output.includes('What would you like to do?') ||
                                output.includes('different ports') ||
                                output.includes('or (c)ancel'))) {
    console.log('Choosing to use different ports...');
    devProcess.stdin.write('u\n'); // Choose "use different ports"
    respondedToPortChoice = true;
  }

  // Look for mode selection prompt and respond immediately
  if ((output.includes('Enter your choice') || output.includes('(1, 2, 3, or 4)')) && !respondedToModeChoice) {
    console.log('Selecting Web Application mode (option 1)...');
    devProcess.stdin.write('1\n'); // Choose "Web Application (Browser)"
    respondedToModeChoice = true;
  }

  // Look for web port prompt
  if (output.includes('Enter web port') && !respondedToWebPort) {
    console.log(`Setting UI port to ${UI_PORT}...`);
    devProcess.stdin.write(`${UI_PORT}\n`);
    respondedToWebPort = true;
  }

  // Look for server port prompt
  if (output.includes('Enter server port') && !respondedToServerPort) {
    console.log(`Setting backend port to ${BACKEND_PORT}...`);
    devProcess.stdin.write(`${BACKEND_PORT}\n`);
    respondedToServerPort = true;
  }
});

// Handle errors
devProcess.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

// Handle process exit
devProcess.on('close', (code) => {
  console.log(`Dev process exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  devProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  devProcess.kill();
  process.exit(0);
});