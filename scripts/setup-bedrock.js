/**
 * AWS Bedrock Setup Script
 * 
 * This script helps set up the necessary dependencies for AWS Bedrock integration.
 * It installs the AWS SDK and sets up environment variables for AWS credentials.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Setting up AWS Bedrock integration for PickleGlass\n');

// Install AWS SDK
console.log('📦 Installing AWS SDK...');
try {
  execSync('npm install aws-sdk --save', { stdio: 'inherit' });
  console.log('✅ AWS SDK installed successfully\n');
} catch (error) {
  console.error('❌ Failed to install AWS SDK:', error.message);
  process.exit(1);
}

// Prompt for AWS credentials
const promptForCredentials = () => {
  console.log('🔑 AWS Credentials Setup\n');
  console.log('These credentials will be saved in your .env file and used for AWS Bedrock API calls.');
  console.log('You can find your AWS credentials in the AWS Console under IAM > Users > Security credentials.\n');
  
  rl.question('Enter your AWS Access Key ID: ', (accessKeyId) => {
    rl.question('Enter your AWS Secret Access Key: ', (secretAccessKey) => {
      rl.question('Enter your AWS Region (default: us-east-1): ', (region) => {
        rl.question('Enter your AWS Knowledge Base ID (optional): ', (kbId) => {
          const envRegion = region || 'us-east-1';
          
          // Create or update .env file
          const envPath = path.join(process.cwd(), '.env');
          let envContent = '';
          
          // Read existing .env file if it exists
          if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
          }
          
          // Update AWS environment variables
          const envVars = envContent.split('\n');
          const updatedEnvVars = [];
          
          const envMap = {
            'AWS_ACCESS_KEY_ID': accessKeyId,
            'AWS_SECRET_ACCESS_KEY': secretAccessKey,
            'AWS_REGION': envRegion
          };
          
          if (kbId) {
            envMap['AWS_KNOWLEDGE_BASE_ID'] = kbId;
          }
          
          // Process existing env vars
          const processedKeys = new Set();
          for (const line of envVars) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#')) {
              updatedEnvVars.push(line);
              continue;
            }
            
            const match = trimmedLine.match(/^([^=]+)=(.*)$/);
            if (!match) {
              updatedEnvVars.push(line);
              continue;
            }
            
            const key = match[1];
            if (envMap[key] !== undefined) {
              updatedEnvVars.push(`${key}=${envMap[key]}`);
              processedKeys.add(key);
            } else {
              updatedEnvVars.push(line);
            }
          }
          
          // Add missing env vars
          for (const [key, value] of Object.entries(envMap)) {
            if (!processedKeys.has(key)) {
              updatedEnvVars.push(`${key}=${value}`);
            }
          }
          
          // Write updated env file
          fs.writeFileSync(envPath, updatedEnvVars.join('\n') + '\n');
          
          console.log('\n✅ AWS credentials saved to .env file');
          console.log('\n🎉 AWS Bedrock setup complete!');
          console.log('\nTo use AWS Bedrock in the app:');
          console.log('1. Open the settings panel in PickleGlass');
          console.log('2. Select "AWS Bedrock" from the provider dropdown');
          console.log('3. Enter your AWS Access Key ID in the key field');
          console.log('4. Click "Save Key"');
          
          rl.close();
        });
      });
    });
  });
};

promptForCredentials();
