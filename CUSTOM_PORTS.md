## Running with Custom Ports

To run Automaker with the UI (interface) on port 7007 and the backend on port 7008:

### Method 1: Interactive Setup (Recommended)
Run the following command and follow the prompts:
```bash
npm run dev
```

When prompted:
1. Press `u` then Enter to use different ports
2. Press `1` then Enter for Web Application mode  
3. Type `7007` then Enter for the web port
4. Type `7008` then Enter for the server port

### Method 2: Using the Instructions Batch File
On Windows, run:
```bash
start_with_instructions.bat
```

This will guide you through the same process with helpful prompts.

### Method 3: Manual Environment Variables
You can also set environment variables before running the development servers separately:

For the backend (runs on port 7008):
```bash
PORT=7008 npm run _dev:server
```

For the UI (runs on port 7007, connects to backend at port 7008):
```bash
TEST_PORT=7007 VITE_SERVER_URL=http://localhost:7008 npm run _dev:web
```

Note: The interactive setup (Method 1) is recommended as it properly handles process management and cleanup.