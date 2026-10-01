#!/usr/bin/env node
/**
 * Writes public/version.json with an id unique to this build: the git commit
 * Amplify is building (AWS_COMMIT_ID), or a timestamp locally. The app shows
 * "a new version is ready" when this changes; it never auto-reloads on it.
 */
const fs = require('fs');
const path = require('path');

const commit = (process.env.AWS_COMMIT_ID || '').slice(0, 12);
const version = commit && commit !== 'HEAD' ? commit : `local-${Date.now()}`;
const file = path.join(__dirname, '..', 'public', 'version.json');

fs.writeFileSync(file, JSON.stringify({ version, timestamp: new Date().toISOString() }, null, 2) + '\n');
console.log(`[version] ${version}`);
