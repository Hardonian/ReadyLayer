import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const writeLine = (line: string): void => {
  process.stdout.write(`${line}\n`)
}

const writeError = (line: string): void => {
  process.stderr.write(`${line}\n`)
}

async function convertImages(): Promise<void> {
  const rootDir = process.cwd()
  
  // Source files
  const logoHeader = join(rootDir, 'ReadyLayer_logo-header.png')
  const logoSEO = join(rootDir, 'ReadyLayer_seo.png')
  const faviconPNG = join(rootDir, 'ReadyLayer_favicon.png')
  
  // Output directory
  const publicDir = join(rootDir, 'public')
  
  writeLine('Converting images to WebP...')
  
  try {
    // Convert header logo to WebP
    const headerBuffer = readFileSync(logoHeader)
    const headerWebP = await sharp(headerBuffer)
      .webp({ quality: 90, effort: 6 })
      .toBuffer()
    writeFileSync(join(publicDir, 'logo-header.webp'), headerWebP)
    writeLine('✓ Created logo-header.webp')
    
    // Also copy PNG version for fallback
    writeFileSync(join(publicDir, 'logo-header.png'), headerBuffer)
    writeLine('✓ Copied logo-header.png')
    
    // Convert SEO logo to WebP
    const seoBuffer = readFileSync(logoSEO)
    const seoWebP = await sharp(seoBuffer)
      .webp({ quality: 90, effort: 6 })
      .toBuffer()
    writeFileSync(join(publicDir, 'logo-seo.webp'), seoWebP)
    writeLine('✓ Created logo-seo.webp')
    
    // Also copy PNG version for fallback
    writeFileSync(join(publicDir, 'logo-seo.png'), seoBuffer)
    writeLine('✓ Copied logo-seo.png')
    
    // Create favicon.ico (32x32 size)
    const faviconBuffer = readFileSync(faviconPNG)
    
    // Create 32x32 favicon
    const favicon32 = await sharp(faviconBuffer)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    
    // For now, use PNG as favicon (Next.js will handle .ico conversion)
    writeFileSync(join(publicDir, 'favicon.png'), favicon32)
    writeFileSync(join(publicDir, 'favicon.ico'), favicon32) // Using PNG as fallback
    writeLine('✓ Created favicon.ico')
    
    // Create apple-touch-icon.png (180x180)
    const appleTouchIcon = await sharp(faviconBuffer)
      .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer()
    writeFileSync(join(publicDir, 'apple-touch-icon.png'), appleTouchIcon)
    writeLine('✓ Created apple-touch-icon.png')
    
    // Create WebP version of favicon
    const faviconWebP = await sharp(faviconBuffer)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90 })
      .toBuffer()
    writeFileSync(join(publicDir, 'favicon.webp'), faviconWebP)
    writeLine('✓ Created favicon.webp')
    
    // Create various sizes for different use cases
    // 192x192 for Android
    const icon192 = await sharp(faviconBuffer)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer()
    writeFileSync(join(publicDir, 'icon-192x192.png'), icon192)
    writeLine('✓ Created icon-192x192.png')
    
    // 512x512 for PWA
    const icon512 = await sharp(faviconBuffer)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer()
    writeFileSync(join(publicDir, 'icon-512x512.png'), icon512)
    writeLine('✓ Created icon-512x512.png')
    
    writeLine('\n✅ All images converted successfully!')
  } catch (error) {
    writeError(`Error converting images: ${String(error)}`)
    process.exit(1)
  }
}

convertImages()
