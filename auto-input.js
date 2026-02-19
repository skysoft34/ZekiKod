const { spawn } = require('child_process');

// Spawn the dev command
const devProcess = spawn('npm', ['run', 'dev'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

// Define the sequence of inputs
const inputs = ['u', '7007', '7008', '1'];
let inputIndex = 0;

// Listen for output and respond with inputs
devProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  
  // Check if a prompt is displayed and respond
  if (output.includes('(k)ill processes, (u)se different ports, or (c)ancel')) {
    if (inputIndex < inputs.length) {
      const input = inputs[inputIndex] + '\n';
      devProcess.stdin.write(input);
      console.log(`Provided input: ${inputs[inputIndex]}`);
      inputIndex++;
    }
  } else if (output.includes('Enter your choice')) {
    if (inputIndex < inputs.length) {
      const input = inputs[inputIndex] + '\n';
      devProcess.stdin.write(input);
      console.log(`Provided input: ${inputs[inputIndex]}`);
      inputIndex++;
    }
  } else if (output.includes('Enter web port')) {
    if (inputIndex < inputs.length) {
      const input = inputs[inputIndex] + '\n';
      devProcess.stdin.write(input);
      console.log(`Provided input: ${inputs[inputIndex]}`);
      inputIndex++;
    }
  } else if (output.includes('Enter server port')) {
    if (inputIndex < inputs.length) {
      const input = inputs[inputIndex] + '\n';
      devProcess.stdin.write(input);
      console.log(`Provided input: ${inputs[inputIndex]}`);
      inputIndex++;
    }
  }
});

devProcess.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

devProcess.on('close', (code) => {
  console.log(`Child process exited with code ${code}`);
});