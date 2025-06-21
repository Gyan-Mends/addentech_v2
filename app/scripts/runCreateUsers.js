const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting user creation script...\n');

try {
  // Run the TypeScript script
  execSync('npm run create-users', { 
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../..')
  });
} catch (error) {
  console.error('❌ Script execution failed:', error.message);
  process.exit(1);
} 