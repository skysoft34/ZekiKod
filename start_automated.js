const { spawn } = require('child_process');
const fs = require('fs');

// Define the ports
const UI_PORT = 7007;
const BACKEND_PORT = 7008;

console.log(`Starting Automaker with:`);
console.log(`- UI (Interface) on port ${UI_PORT}`);
console.log(`- Backend on port ${BACKEND_PORT}`);
console.log('');

// Create a temporary script to handle the interactive prompts
const scriptContent = `
setTimeout(() => {
  console.log('u');
  process.stdout.write('u\\n');
}, 3000);

setTimeout(() => {
  console.log('1');
  process.stdout.write('1\\n');
}, 4000);

setTimeout(() => {
  console.log('${UI_PORT}');
  process.stdout.write('${UI_PORT}\\n');
}, 5000);

setTimeout(() => {
  console.log('${BACKEND_PORT}');
  process.stdout.write('${BACKEND_PORT}\\n');
}, 6000);
`;

fs.writeFileSync('./temp_input_helper.js', scriptContent);

// Spawn the dev script with the helper
const devProcess = spawn('node', ['dev.mjs'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});

// Handle output from the dev script
devProcess.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  // Detect when we need to send inputs
  if (output.includes('What would you like to do?')) {
    console.log('\\nu');
    devProcess.stdin.write('u\\n');
  } else if (output.includes('Enter your choice')) {
    console.log('\\n1');
    devProcess.stdin.write('1\\n');
  } else if (output.includes('Enter web port')) {
    console.log('\\n' + UI_PORT);
    devProcess.stdin.write(UI_PORT + '\\n');
  } else if (output.includes('Enter server port')) {
    console.log('\\n' + BACKEND_PORT);
    devProcess.stdin.write(BACKEND_PORT + '\\n');
  }
});

// Handle errors
devProcess.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

// Handle process exit
devProcess.on('close', (code) => {
  console.log('\\nDev process exited with code ' + code);
  // Clean up temp file
  if (fs.existsSync('./temp_input_helper.js')) {
    fs.unlinkSync('./temp_input_helper.js');
  }
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  devProcess.kill();
  if (fs.existsSync('./temp_input_helper.js')) {
    fs.unlinkSync('./temp_input_helper.js');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  devProcess.kill();
  if (fs.existsSync('./temp_input_helper.js')) {
    fs.unlinkSync('./temp_input_helper.js');
  }
  process.exit(0);
});