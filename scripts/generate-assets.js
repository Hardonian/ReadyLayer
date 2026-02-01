#!/usr/bin/env node
/**
 * Asset Generation Script
 * 
 * This script creates placeholder WebP images for development.
 * For production, replace with actual AI-generated images.
 * 
 * Uses Canvas API to generate simple SVG-based illustrations.
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'assets', 'visuals');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Asset definitions with SVG content
const ASSETS = [
  {
    filename: 'hero-governance.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <rect fill="#f8fafc" width="800" height="600"/>
      <!-- Code Editor Window -->
      <rect x="50" y="100" width="200" height="300" fill="#ffffff" stroke="#135bec" stroke-width="2" rx="8"/>
      <rect x="50" y="100" width="200" height="30" fill="#135bec" rx="8"/>
      <circle cx="70" cy="115" r="4" fill="#ef4444"/>
      <circle cx="85" cy="115" r="4" fill="#f59e0b"/>
      <circle cx="100" cy="115" r="4" fill="#22c55e"/>
      <!-- Code lines -->
      <rect x="65" y="150" width="120" height="8" fill="#e2e8f0" rx="2"/>
      <rect x="65" y="170" width="160" height="8" fill="#135bec" rx="2" opacity="0.3"/>
      <rect x="65" y="190" width="100" height="8" fill="#e2e8f0" rx="2"/>
      <rect x="65" y="210" width="140" height="8" fill="#135bec" rx="2" opacity="0.3"/>
      <!-- Shield Icon -->
      <path d="M400 200 L400 350 Q400 380 430 390 Q460 380 460 350 L460 200 Z" fill="none" stroke="#135bec" stroke-width="3"/>
      <path d="M400 200 Q430 220 460 200" fill="#135bec" opacity="0.1"/>
      <path d="M425 290 L435 305 L455 280" fill="none" stroke="#22c55e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Output Window -->
      <rect x="550" y="100" width="200" height="300" fill="#ffffff" stroke="#135bec" stroke-width="2" rx="8"/>
      <rect x="550" y="100" width="200" height="30" fill="#22c55e" rx="8"/>
      <circle cx="570" cy="115" r="4" fill="#ef4444"/>
      <circle cx="585" cy="115" r="4" fill="#f59e0b"/>
      <circle cx="600" cy="115" r="4" fill="#ffffff"/>
      <!-- Checkmarks -->
      <circle cx="580" cy="180" r="15" fill="#22c55e" opacity="0.1"/>
      <path d="M573 180 L578 185 L588 175" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="580" cy="230" r="15" fill="#22c55e" opacity="0.1"/>
      <path d="M573 230 L578 235 L588 225" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="580" cy="280" r="15" fill="#22c55e" opacity="0.1"/>
      <path d="M573 280 L578 285 L588 275" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Connecting arrows -->
      <path d="M250 250 L380 275" fill="none" stroke="#135bec" stroke-width="2" stroke-dasharray="5,5"/>
      <polygon points="375,270 385,275 375,280" fill="#135bec"/>
      <path d="M460 275 L550 275" fill="none" stroke="#135bec" stroke-width="2" stroke-dasharray="5,5"/>
      <polygon points="545,270 555,275 545,280" fill="#135bec"/>
      <!-- Floating elements -->
      <circle cx="150" cy="450" r="25" fill="#135bec" opacity="0.1"/>
      <text x="150" y="458" font-family="monospace" font-size="20" fill="#135bec" text-anchor="middle">&lt;/&gt;</text>
      <circle cx="650" cy="450" r="25" fill="#22c55e" opacity="0.1"/>
      <path d="M640 450 L650 460 L665 445" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  },
  {
    filename: 'empty-repo.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <rect fill="#f8fafc" width="400" height="300"/>
      <!-- Git Branch Icon -->
      <circle cx="120" cy="100" r="20" fill="#135bec" opacity="0.1"/>
      <circle cx="120" cy="100" r="8" fill="#135bec"/>
      <path d="M120 120 L120 160" fill="none" stroke="#135bec" stroke-width="3"/>
      <circle cx="120" cy="180" r="20" fill="#135bec" opacity="0.1"/>
      <circle cx="120" cy="180" r="8" fill="#135bec"/>
      <path d="M128 180 L280 180 L280 120" fill="none" stroke="#135bec" stroke-width="3" stroke-dasharray="5,5"/>
      <circle cx="280" cy="100" r="20" fill="#135bec" opacity="0.1"/>
      <circle cx="280" cy="100" r="8" fill="#6b7280"/>
      <!-- Question mark -->
      <text x="280" y="108" font-family="sans-serif" font-size="16" fill="#ffffff" text-anchor="middle" font-weight="bold">?</text>
      <!-- Dotted lines extending -->
      <path d="M280 100 L350 100" fill="none" stroke="#6b7280" stroke-width="2" stroke-dasharray="3,3"/>
      <circle cx="360" cy="100" r="4" fill="#6b7280" opacity="0.3"/>
    </svg>`
  },
  {
    filename: 'empty-reviews.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <rect fill="#f8fafc" width="400" height="300"/>
      <!-- Document -->
      <rect x="150" y="80" width="100" height="130" fill="#ffffff" stroke="#6b7280" stroke-width="2" rx="4"/>
      <line x1="165" y1="110" x2="235" y2="110" stroke="#e2e8f0" stroke-width="2"/>
      <line x1="165" y1="130" x2="235" y2="130" stroke="#e2e8f0" stroke-width="2"/>
      <line x1="165" y1="150" x2="210" y2="150" stroke="#e2e8f0" stroke-width="2"/>
      <line x1="165" y1="170" x2="220" y2="170" stroke="#e2e8f0" stroke-width="2"/>
      <!-- Magnifying Glass -->
      <circle cx="250" cy="70" r="25" fill="none" stroke="#135bec" stroke-width="3"/>
      <line x1="268" y1="88" x2="290" y2="110" stroke="#135bec" stroke-width="4" stroke-linecap="round"/>
      <!-- Dashed search lines -->
      <path d="M80 150 Q120 150 140 140" fill="none" stroke="#6b7280" stroke-width="2" stroke-dasharray="4,4" opacity="0.5"/>
      <path d="M320 150 Q280 150 260 140" fill="none" stroke="#6b7280" stroke-width="2" stroke-dasharray="4,4" opacity="0.5"/>
    </svg>`
  },
  {
    filename: 'empty-policies.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <rect fill="#f8fafc" width="400" height="300"/>
      <!-- Shield with dotted outline -->
      <path d="M200 80 L200 140 Q200 175 240 190 Q280 175 280 140 L280 80 Z" fill="none" stroke="#135bec" stroke-width="3" stroke-dasharray="6,4"/>
      <path d="M200 80 Q240 100 280 80" fill="#135bec" opacity="0.05"/>
      <!-- Gear icons -->
      <circle cx="120" cy="150" r="25" fill="#6b7280" opacity="0.1"/>
      <circle cx="120" cy="150" r="10" fill="none" stroke="#6b7280" stroke-width="2"/>
      <circle cx="120" cy="150" r="5" fill="#6b7280"/>
      <line x1="120" y1="120" x2="120" y2="130" stroke="#6b7280" stroke-width="2"/>
      <line x1="120" y1="170" x2="120" y2="180" stroke="#6b7280" stroke-width="2"/>
      <line x1="90" y1="150" x2="100" y2="150" stroke="#6b7280" stroke-width="2"/>
      <line x1="140" y1="150" x2="150" y2="150" stroke="#6b7280" stroke-width="2"/>
      <!-- Second gear -->
      <circle cx="340" cy="120" r="20" fill="#6b7280" opacity="0.1"/>
      <circle cx="340" cy="120" r="8" fill="none" stroke="#6b7280" stroke-width="2"/>
      <circle cx="340" cy="120" r="4" fill="#6b7280"/>
    </svg>`
  },
  {
    filename: 'empty-runs.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <rect fill="#f8fafc" width="400" height="300"/>
      <!-- Pipeline -->
      <line x1="80" y1="150" x2="320" y2="150" fill="none" stroke="#e2e8f0" stroke-width="4"/>
      <!-- Connected segments -->
      <circle cx="100" cy="150" r="15" fill="#135bec"/>
      <circle cx="100" cy="150" r="6" fill="#ffffff"/>
      <line x1="115" y1="150" x2="160" y2="150" fill="none" stroke="#135bec" stroke-width="4"/>
      <circle cx="175" cy="150" r="15" fill="#135bec"/>
      <circle cx="175" cy="150" r="6" fill="#ffffff"/>
      <!-- Dotted/disconnected segments -->
      <line x1="190" y1="150" x2="230" y2="150" fill="none" stroke="#6b7280" stroke-width="4" stroke-dasharray="6,6"/>
      <circle cx="245" cy="150" r="15" fill="#6b7280" opacity="0.3"/>
      <circle cx="245" cy="150" r="6" fill="#ffffff"/>
      <line x1="260" y1="150" x2="300" y2="150" fill="none" stroke="#6b7280" stroke-width="4" stroke-dasharray="6,6"/>
      <circle cx="315" cy="150" r="15" fill="#6b7280" opacity="0.3"/>
      <circle cx="315" cy="150" r="6" fill="#ffffff"/>
    </svg>`
  },
  {
    filename: 'error-general.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">
      <rect fill="#ffffff" width="400" height="320"/>
      <!-- Robot/Mascot -->
      <rect x="160" y="80" width="80" height="70" fill="#f1f5f9" stroke="#6b7280" stroke-width="2" rx="8"/>
      <circle cx="180" cy="115" r="8" fill="#135bec"/>
      <circle cx="180" cy="115" r="3" fill="#ffffff"/>
      <circle cx="220" cy="115" r="8" fill="#135bec"/>
      <circle cx="220" cy="115" r="3" fill="#ffffff"/>
      <!-- Confused expression -->
      <path d="M190 135 Q200 140 210 135" fill="none" stroke="#6b7280" stroke-width="2"/>
      <!-- Antenna -->
      <line x1="200" y1="80" x2="200" y2="50" stroke="#6b7280" stroke-width="2"/>
      <circle cx="200" cy="45" r="6" fill="#f59e0b"/>
      <!-- Body -->
      <rect x="170" y="150" width="60" height="50" fill="#f1f5f9" stroke="#6b7280" stroke-width="2" rx="4"/>
      <!-- Arms shrugging -->
      <path d="M160 160 L140 150" fill="none" stroke="#6b7280" stroke-width="3" stroke-linecap="round"/>
      <circle cx="135" cy="148" r="5" fill="#135bec" opacity="0.3"/>
      <path d="M240 160 L260 150" fill="none" stroke="#6b7280" stroke-width="3" stroke-linecap="round"/>
      <circle cx="265" cy="148" r="5" fill="#135bec" opacity="0.3"/>
      <!-- Broken gear -->
      <circle cx="300" cy="200" r="30" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
      <circle cx="300" cy="200" r="12" fill="#f59e0b" opacity="0.3"/>
      <path d="M300 185 L300 170 M300 215 L300 230 M285 200 L270 200 M315 200 L330 200" stroke="#f59e0b" stroke-width="3"/>
      <text x="295" y="205" font-size="16" fill="#ef4444" font-weight="bold">!</text>
    </svg>`
  },
  {
    filename: 'error-404.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">
      <rect fill="#ffffff" width="400" height="320"/>
      <!-- Mascot looking around -->
      <ellipse cx="200" cy="160" rx="50" ry="60" fill="#f1f5f9" stroke="#135bec" stroke-width="2"/>
      <!-- Eyes looking left -->
      <circle cx="180" cy="145" r="12" fill="#ffffff" stroke="#135bec" stroke-width="2"/>
      <circle cx="178" cy="145" r="5" fill="#135bec"/>
      <circle cx="220" cy="145" r="12" fill="#ffffff" stroke="#135bec" stroke-width="2"/>
      <circle cx="218" cy="145" r="5" fill="#135bec"/>
      <!-- Confused mouth -->
      <ellipse cx="200" cy="185" rx="8" ry="5" fill="#135bec" opacity="0.3"/>
      <!-- Search lines -->
      <path d="M120 200 Q140 180 160 190" fill="none" stroke="#6b7280" stroke-width="2" stroke-dasharray="4,4"/>
      <path d="M280 200 Q260 180 240 190" fill="none" stroke="#6b7280" stroke-width="2" stroke-dasharray="4,4"/>
      <!-- Magnifying glass -->
      <circle cx="100" cy="240" r="25" fill="none" stroke="#135bec" stroke-width="3"/>
      <line x1="80" y1="260" x2="60" y2="280" stroke="#135bec" stroke-width="4" stroke-linecap="round"/>
      <!-- Empty page -->
      <rect x="300" y="230" width="60" height="80" fill="#f8fafc" stroke="#6b7280" stroke-width="2" rx="4"/>
      <line x1="310" y1="250" x2="350" y2="250" stroke="#e2e8f0" stroke-width="2"/>
      <line x1="310" y1="270" x2="340" y2="270" stroke="#e2e8f0" stroke-width="2"/>
      <text x="330" y="295" font-size="24" fill="#6b7280" text-anchor="middle">404</text>
    </svg>`
  },
  {
    filename: 'error-auth.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">
      <rect fill="#ffffff" width="400" height="320"/>
      <!-- Shield with X -->
      <path d="M200 80 L200 160 Q200 195 250 210 Q300 195 300 160 L300 80 Z" fill="#fef2f2" stroke="#ef4444" stroke-width="3"/>
      <path d="M200 80 Q250 100 300 80" fill="#ef4444" opacity="0.1"/>
      <line x1="235" y1="125" x2="265" y2="155" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>
      <line x1="265" y1="125" x2="235" y2="155" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>
      <!-- Lock -->
      <rect x="110" y="140" width="50" height="60" fill="#f1f5f9" stroke="#135bec" stroke-width="2" rx="4"/>
      <path d="M120 140 L120 120 Q120 100 135 100 Q150 100 150 120 L150 140" fill="none" stroke="#135bec" stroke-width="3"/>
      <circle cx="135" cy="165" r="6" fill="#135bec"/>
      <!-- Mascot shrugging -->
      <circle cx="200" cy="250" r="30" fill="#f1f5f9" stroke="#6b7280" stroke-width="2"/>
      <circle cx="190" cy="245" r="5" fill="#135bec"/>
      <circle cx="210" cy="245" r="5" fill="#135bec"/>
      <path d="M185 265 Q200 270 215 265" fill="none" stroke="#6b7280" stroke-width="2"/>
      <!-- Arms -->
      <path d="M170 260 L140 250" fill="none" stroke="#6b7280" stroke-width="3" stroke-linecap="round"/>
      <path d="M230 260 L260 250" fill="none" stroke="#6b7280" stroke-width="3" stroke-linecap="round"/>
      <!-- Key nearby -->
      <rect x="340" y="180" width="20" height="40" fill="#f1f5f9" stroke="#6b7280" stroke-width="2" rx="2" transform="rotate(45 350 200)"/>
      <circle cx="350" cy="175" r="10" fill="#f1f5f9" stroke="#6b7280" stroke-width="2"/>
      <circle cx="350" cy="175" r="4" fill="#6b7280" opacity="0.3"/>
    </svg>`
  },
  {
    filename: 'value-policy.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
      <rect fill="#f8fafc" width="240" height="180"/>
      <!-- Shield -->
      <path d="M120 40 L120 100 Q120 125 150 135 Q180 125 180 100 L180 40 Z" fill="#135bec" opacity="0.1"/>
      <path d="M120 40 L120 100 Q120 125 150 135 Q180 125 180 100 L180 40 Z" fill="none" stroke="#135bec" stroke-width="3"/>
      <path d="M120 40 Q150 55 180 40" fill="#135bec" opacity="0.2"/>
      <path d="M135 100 L145 110 L165 90" fill="none" stroke="#22c55e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Document -->
      <rect x="50" y="50" width="50" height="70" fill="#ffffff" stroke="#6b7280" stroke-width="2" rx="4"/>
      <line x1="58" y1="65" x2="92" y2="65" stroke="#e2e8f0" stroke-width="2"/>
      <line x1="58" y1="75" x2="92" y2="75" stroke="#e2e8f0" stroke-width="2"/>
      <line x1="58" y1="85" x2="82" y2="85" stroke="#e2e8f0" stroke-width="2"/>
    </svg>`
  },
  {
    filename: 'value-composable.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
      <rect fill="#f8fafc" width="240" height="180"/>
      <!-- Puzzle pieces -->
      <path d="M50 70 L90 70 L90 80 Q95 80 95 75 L95 65 Q95 60 90 60 L90 50 L50 50 Z" fill="#135bec" opacity="0.2"/>
      <path d="M50 70 L90 70 L90 80 Q95 80 95 75 L95 65 Q95 60 90 60 L90 50 L50 50 Z" fill="none" stroke="#135bec" stroke-width="2"/>
      <path d="M110 70 L150 70 L150 60 Q155 60 155 65 L155 75 Q155 80 150 80 L150 90 L110 90 Z" fill="#6b7280" opacity="0.1"/>
      <path d="M110 70 L150 70 L150 60 Q155 60 155 65 L155 75 Q155 80 150 80 L150 90 L110 90 Z" fill="none" stroke="#6b7280" stroke-width="2"/>
      <path d="M170 70 L210 70 L210 80 Q215 80 215 75 L215 65 Q215 60 210 60 L210 50 L170 50 Q170 55 165 55 Q160 55 160 60 Q160 65 165 65 L170 65 Z" fill="#135bec" opacity="0.2"/>
      <path d="M170 70 L210 70 L210 80 Q215 80 215 75 L215 65 Q215 60 210 60 L210 50 L170 50 Q170 55 165 55 Q160 55 160 60 Q160 65 165 65 L170 65 Z" fill="none" stroke="#135bec" stroke-width="2"/>
      <!-- Connecting lines -->
      <line x1="90" y1="70" x2="110" y2="70" stroke="#135bec" stroke-width="2"/>
      <line x1="150" y1="70" x2="170" y2="70" stroke="#135bec" stroke-width="2"/>
    </svg>`
  },
  {
    filename: 'value-docs.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
      <rect fill="#f8fafc" width="240" height="180"/>
      <!-- Document 1 -->
      <rect x="50" y="50" width="50" height="70" fill="#ffffff" stroke="#6b7280" stroke-width="2" rx="4"/>
      <line x1="58" y1="65" x2="92" y2="65" stroke="#e2e8f0" stroke-width="2"/>
      <line x1="58" y1="75" x2="92" y2="75" stroke="#e2e8f0" stroke-width="2"/>
      <line x1="58" y1="85" x2="82" y2="85" stroke="#e2e8f0" stroke-width="2"/>
      <!-- Document 2 -->
      <rect x="140" y="50" width="50" height="70" fill="#ffffff" stroke="#6b7280" stroke-width="2" rx="4"/>
      <line x1="148" y1="65" x2="182" y2="65" stroke="#e2e8f0" stroke-width="2"/>
      <line x1="148" y1="75" x2="182" y2="75" stroke="#e2e8f0" stroke-width="2"/>
      <line x1="148" y1="85" x2="172" y2="85" stroke="#e2e8f0" stroke-width="2"/>
      <!-- Sync arrows -->
      <path d="M100 85 L130 85" fill="none" stroke="#135bec" stroke-width="2"/>
      <polygon points="125,80 135,85 125,90" fill="#135bec"/>
      <path d="M130 95 L100 95" fill="none" stroke="#135bec" stroke-width="2"/>
      <polygon points="105,90 95,95 105,100" fill="#135bec"/>
      <circle cx="115" cy="90" r="12" fill="#135bec" opacity="0.1"/>
    </svg>`
  },
  {
    filename: 'value-git.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
      <rect fill="#f8fafc" width="240" height="180"/>
      <!-- Git branch diagram -->
      <circle cx="60" cy="130" r="8" fill="#135bec"/>
      <circle cx="120" cy="130" r="8" fill="#135bec"/>
      <circle cx="180" cy="90" r="8" fill="#135bec"/>
      <circle cx="180" cy="130" r="8" fill="#135bec"/>
      <circle cx="180" cy="50" r="8" fill="#135bec"/>
      <!-- Branch lines -->
      <path d="M60 130 L120 130" fill="none" stroke="#135bec" stroke-width="2"/>
      <path d="M120 130 L180 90" fill="none" stroke="#135bec" stroke-width="2"/>
      <path d="M120 130 L180 130" fill="none" stroke="#135bec" stroke-width="2"/>
      <path d="M120 130 L180 50" fill="none" stroke="#6b7280" stroke-width="2" stroke-dasharray="4,4"/>
      <!-- Central hub -->
      <circle cx="120" cy="130" r="15" fill="#135bec" opacity="0.1"/>
    </svg>`
  },
];

function generateAssets() {
  console.log('Generating visual assets...\n');
  
  let created = 0;
  let skipped = 0;
  
  for (const asset of ASSETS) {
    const outputPath = path.join(OUTPUT_DIR, asset.filename);
    
    if (fs.existsSync(outputPath)) {
      console.log(`Skipping: ${asset.filename} (already exists)`);
      skipped++;
      continue;
    }
    
    fs.writeFileSync(outputPath, asset.content);
    console.log(`Created: ${asset.filename}`);
    created++;
  }
  
  console.log(`\nSummary:`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total: ${ASSETS.length}`);
  console.log(`\nOutput directory: ${OUTPUT_DIR}`);
  console.log('\nNote: These are SVG placeholders. For production:');
  console.log('  1. Replace with AI-generated images (DALL-E, Midjourney)');
  console.log('  2. Convert to WebP format for smaller file sizes');
  console.log('  3. Generate 2x versions for retina displays');
}

generateAssets();
