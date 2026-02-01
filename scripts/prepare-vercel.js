#!/usr/bin/env node

/**
 * Vercel Deployment Preparation Script
 * Prepares project for deployment to Vercel
 * Usage: node scripts/prepare-vercel.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.cwd();
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function fileExists(filePath) {
  return fs.existsSync(path.join(projectRoot, filePath));
}

function createFileIfNotExists(filePath, content) {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    log(`✓ Created ${filePath}`, 'green');
    return true;
  }
  log(`✓ ${filePath} already exists`, 'yellow');
  return false;
}

async function runCommand(command, description) {
  try {
    log(`\n→ ${description}...`, 'blue');
    execSync(command, { stdio: 'inherit', cwd: projectRoot });
    log(`✓ ${description} completed`, 'green');
    return true;
  } catch (error) {
    log(`✗ ${description} failed: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('\n🚀 Preparing project for Vercel deployment...\n', 'blue');

  // Step 1: Check prerequisites
  log('\n📋 Step 1: Checking prerequisites...', 'blue');
  
  const checks = [
    { file: 'vercel.json', name: 'Vercel config' },
    { file: '.vercelignore', name: 'Vercel ignore' },
    { file: '.env.example', name: 'Environment template' },
    { file: 'apps/web/next.config.js', name: 'Next.js config' },
  ];

  let allGood = true;
  for (const check of checks) {
    if (fileExists(check.file)) {
      log(`✓ ${check.name} exists`, 'green');
    } else {
      log(`✗ ${check.name} missing (${check.file})`, 'red');
      allGood = false;
    }
  }

  if (!allGood) {
    log('\n⚠️  Some files are missing. Please run the setup manually.', 'yellow');
    return;
  }

  // Step 2: Clean dependencies
  log('\n📋 Step 2: Cleaning dependencies...', 'blue');
  await runCommand('pnpm install', 'Installing dependencies');

  // Step 3: Run linting
  log('\n📋 Step 3: Running linting...', 'blue');
  await runCommand('pnpm lint', 'Linting code');

  // Step 4: Run tests
  log('\n📋 Step 4: Running tests...', 'blue');
  await runCommand('pnpm test', 'Running tests');

  // Step 5: Build project
  log('\n📋 Step 5: Building project...', 'blue');
  await runCommand('pnpm build', 'Building Next.js');

  // Step 6: Check for env variables
  log('\n📋 Step 6: Checking environment variables...', 'blue');
  log('Remember to set these in Vercel Dashboard:', 'yellow');
  log('  - NEXT_PUBLIC_API_URL', 'yellow');
  log('  - NEXT_PUBLIC_MAPBOX_TOKEN', 'yellow');
  log('  - NEXT_PUBLIC_SENTRY_DSN', 'yellow');
  log('  - DATABASE_URL (if using backend)', 'yellow');
  log('  - REDIS_URL (if using cache)', 'yellow');
  log('  - JWT_SECRET (if using auth)', 'yellow');

  // Step 7: Git status
  log('\n📋 Step 7: Git status...', 'blue');
  try {
    const status = execSync('git status --porcelain', { 
      encoding: 'utf-8',
      cwd: projectRoot 
    });
    
    if (status) {
      log('\nUncommitted changes:', 'yellow');
      log(status);
      log('\nRun: git add . && git commit -m "chore: prepare for Vercel deployment"', 'blue');
    } else {
      log('✓ Git repository is clean', 'green');
    }
  } catch (error) {
    log('Note: Not a git repository', 'yellow');
  }

  // Final instructions
  log('\n✅ Preparation complete!\n', 'green');
  log('Next steps:', 'blue');
  log('1. Set environment variables in Vercel Dashboard', 'yellow');
  log('2. Deploy: npx vercel --prod', 'yellow');
  log('3. Or push to GitHub and enable auto-deploy in Vercel', 'yellow');
  log('\nDocumentation: .env.vercel.example', 'blue');
  log('Deployment guide: VERCEL_DEPLOYMENT_GUIDE.md\n', 'blue');
}

main().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
