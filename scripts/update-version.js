#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Update version.json with new timestamp
const versionFilePath = path.join(__dirname, '..', 'public', 'version.json');

try {
  // Read current version
  let versionData = {
    version: '1.0.0',
    timestamp: new Date().toISOString()
  };

  if (fs.existsSync(versionFilePath)) {
    try {
      const current = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'));
      // Increment patch version
      const [major, minor, patch] = current.version.split('.').map(Number);
      versionData.version = `${major}.${minor}.${patch + 1}`;
    } catch (e) {
      console.log('Could not parse existing version.json, starting fresh');
    }
  }

  versionData.timestamp = new Date().toISOString();

  // Write updated version
  fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
  
  console.log(`✅ Version updated: ${versionData.version} (${versionData.timestamp})`);
  process.exit(0);
} catch (err) {
  console.error('❌ Failed to update version.json:', err);
  process.exit(1);
}
