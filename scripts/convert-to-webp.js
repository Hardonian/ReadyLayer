#!/usr/bin/env node
/**
 * Convert SVG to WebP using sharp
 */

const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(process.cwd(), 'public', 'assets', 'visuals');

async function convertSvgToWebp() {
  console.log('Installing sharp for image conversion...\n');
  
  // Check if sharp is available
  let sharp;
  try {
    sharp = require('sharp');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Installing sharp (reason: ${errorMessage})...`);
    require('child_process').execSync('npm install sharp --save-dev', { stdio: 'inherit' });
    sharp = require('sharp');
  }
  
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.svg'));
  
  console.log(`Converting ${files.length} SVG files to WebP...\n`);
  
  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(INPUT_DIR, file.replace('.svg', '.webp'));
    
    // Skip if webp already exists
    if (fs.existsSync(outputPath)) {
      console.log(`Skipping ${file} (webp exists)`);
      continue;
    }
    
    try {
      // Read SVG and convert
      const svgBuffer = fs.readFileSync(inputPath);
      
      await sharp(svgBuffer)
        .resize(800, 600, { fit: 'inside' })
        .webp({ quality: 80 })
        .toFile(outputPath);
      
      console.log(`Converted: ${file} -> ${path.basename(outputPath)}`);
    } catch (err) {
      console.error(`Failed to convert ${file}: ${err.message}`);
    }
  }
  
  console.log('\nConversion complete!');
}

convertSvgToWebp().catch(console.error);
