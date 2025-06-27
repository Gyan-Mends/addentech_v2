import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

try {
  console.log('Creating sample activity logs...');
  
  // Run the TypeScript script using tsx
  execSync('npx tsx app/scripts/createSampleLogs.ts', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('Sample logs created successfully!');
} catch (error) {
  console.error('Error creating sample logs:', error.message);
  process.exit(1);
} 