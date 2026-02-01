#!/usr/bin/env python3
"""
Generate all 12 visual assets for ReadyLayer using DALL-E via BlockRun.
"""

import os
import sys
import time

# Install blockrun if needed
try:
    from blockrun_llm import ImageClient, setup_agent_wallet
except ImportError:
    print("Installing blockrun-llm...")
    os.system("pip install blockrun-llm")
    from blockrun_llm import ImageClient, setup_agent_wallet

# Output directory
OUTPUT_DIR = "public/assets/visuals"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Image generation recipes from README.md
ASSETS = [
    {
        "filename": "hero-governance.webp",
        "prompt": """Modern flat illustration showing AI-powered code governance concept. 
Central composition: code editor window with syntax-highlighted code 
on left, flowing through a shield/badge icon in center, emerging as 
checked/approved code on right. Floating elements: git branch icons, 
PR symbols, checkmarks. Color palette: primary blue (#135bec), white 
background, subtle gray accents. Clean 2px line art style, minimal 
shadows, rounded corners (12px radius feel). Professional, trustworthy, 
developer-focused aesthetic. No text. Transparent or white background.""",
        "size": "1024x1024"  # DALL-E 3 supports 1024x1024, 1024x1792, 1792x1024
    },
    {
        "filename": "empty-repo.webp",
        "prompt": """Minimal flat illustration of empty repository state. Single floating 
Git branch icon with dotted connection lines extending to empty space. 
Subtle question mark or "?" floating nearby. Soft gray tones with 
primary blue (#135bec) accent on the branch icon. Clean background 
white. Friendly, inviting, not alarming. Decorative only - no text elements.""",
        "size": "1024x1024"
    },
    {
        "filename": "empty-reviews.webp",
        "prompt": """Minimal flat illustration of empty document review state. Document 
icon with magnifying glass floating above it, both with soft gray 
tones. Primary blue (#135bec) accent on magnifying glass handle. 
Subtle dashed lines suggesting "searching." Clean, minimal, white background. Decorative illustration.""",
        "size": "1024x1024"
    },
    {
        "filename": "empty-policies.webp",
        "prompt": """Minimal flat illustration of empty policy state. Shield icon with 
dotted outline (suggesting incomplete/unfilled) floating center. 
Small gear icons floating nearby. Soft gray tones with primary blue 
(#135bec) accent on shield border. Clean, minimal style. White background. Decorative only.""",
        "size": "1024x1024"
    },
    {
        "filename": "empty-runs.webp",
        "prompt": """Minimal flat illustration of empty pipeline state. Pipeline/workflow 
icon (horizontal line with circles) with dotted/disconnected segments. 
Soft gray tones with primary blue (#135bec) accent on connected 
segments. Suggests "waiting to start." Clean, minimal. White background. Decorative illustration.""",
        "size": "1024x1024"
    },
    {
        "filename": "error-general.webp",
        "prompt": """Friendly flat illustration for error state. Robot or computer mascot 
with puzzled/confused expression, looking at a broken gear or warning 
triangle. Use warning amber (#f59e0b) and danger red (#ef4444) accents 
sparingly. Keep it friendly, not scary. Soft gray and white tones 
dominant. Clean line art style. Background white. 
Conveys "something went wrong but we're on it" feeling.""",
        "size": "1024x1024"
    },
    {
        "filename": "error-404.webp",
        "prompt": """Friendly flat illustration for 404 page. Mascot character looking 
around confused, searching for something. Magnifying glass nearby, 
empty page/document floating. Use primary blue (#135bec) and muted 
gray tones. Keep playful but professional. Clean line art. White 
background. Conveys "we couldn't find that page" feeling.""",
        "size": "1024x1024"
    },
    {
        "filename": "error-auth.webp",
        "prompt": """Friendly flat illustration for auth error. Shield icon with subtle 
X mark or lock with keyhole. Mascot character shrugging or showing 
key that's too big/small. Use danger red (#ef4444) sparingly for 
X mark only. Soft grays and primary blue dominant. Clean, minimal. 
White background. Conveys "can't authenticate" without being scary.""",
        "size": "1024x1024"
    },
    {
        "filename": "value-policy.webp",
        "prompt": """Small flat illustration: Shield icon protecting a code document. 
Shield has checkmark. Clean, minimal. Primary blue (#135bec) shield, 
gray document. 2px line weight. Decorative icon illustration. White background.""",
        "size": "1024x1024"
    },
    {
        "filename": "value-composable.webp",
        "prompt": """Small flat illustration: Three puzzle pieces or modular blocks 
connecting together to form complete solution. Primary blue 
(#135bec) and gray tones. Clean line art. Decorative icon. White background.""",
        "size": "1024x1024"
    },
    {
        "filename": "value-docs.webp",
        "prompt": """Small flat illustration: Two documents with arrows/sync icon between 
them showing alignment. Primary blue (#135bec) arrows, gray documents. 
Clean, minimal line art. Decorative icon. White background.""",
        "size": "1024x1024"
    },
    {
        "filename": "value-git.webp",
        "prompt": """Small flat illustration: Git branch diagram with merge flow. Branch 
lines connecting to central hub. Primary blue (#135bec) flow, gray 
branch points. Clean line art. Decorative icon. White background.""",
        "size": "1024x1024"
    },
]

def main():
    print("Generating ReadyLayer visual assets via DALL-E...")
    print(f"   Output directory: {OUTPUT_DIR}")
    print()
    
    # Setup wallet
    print("Setting up BlockRun wallet...")
    try:
        wallet_client = setup_agent_wallet()
        balance = wallet_client.get_balance()
        print(f"   Wallet: {wallet_client.get_wallet_address()}")
        print(f"   Balance: ${balance:.2f} USDC")
        
        if balance < 1.0:
            print(f"\n⚠️  Low balance! Need ~$0.50 for 12 images ($0.04 each)")
            print(f"   Fund your wallet to continue.")
            sys.exit(1)
    except Exception as e:
        print(f"   Wallet setup error: {e}")
        sys.exit(1)
    
    # Initialize image client
    image_client = ImageClient()
    
    # Track results
    generated = []
    failed = []
    
    print(f"\n🖼️  Generating {len(ASSETS)} images...\n")
    
    for i, asset in enumerate(ASSETS, 1):
        output_path = os.path.join(OUTPUT_DIR, asset["filename"])
        
        # Skip if already exists
        if os.path.exists(output_path):
            print(f"⏭️  [{i}/{len(ASSETS)}] {asset['filename']} - already exists")
            generated.append(asset["filename"])
            continue
        
        print(f"🎨 [{i}/{len(ASSETS)}] Generating: {asset['filename']}")
        print(f"   Prompt preview: {asset['prompt'][:80]}...")
        
        try:
            # Generate image
            result = image_client.generate(
                prompt=asset["prompt"],
                size=asset["size"],
                quality="standard",  # or "hd" for higher quality (2x cost)
                n=1
            )
            
            # Get image URL
            image_url = result.data[0].url
            
            # Download image
            import urllib.request
            urllib.request.urlretrieve(image_url, output_path)
            
            print(f"   ✅ Saved to {output_path}")
            generated.append(asset["filename"])
            
            # Small delay to avoid rate limits
            time.sleep(0.5)
            
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            failed.append((asset["filename"], str(e)))
    
    # Summary
    print(f"\n📊 Generation Summary:")
    print(f"   ✅ Generated: {len(generated)}/{len(ASSETS)}")
    print(f"   ❌ Failed: {len(failed)}/{len(ASSETS)}")
    
    if failed:
        print(f"\n   Failed assets:")
        for name, error in failed:
            print(f"     - {name}: {error}")
    
    # Show spending
    try:
        spending = wallet_client.get_spending()
        print(f"\n💰 Total spent: ${spending['total_usd']:.4f}")
    except:
        pass
    
    print(f"\n✨ Done! Run validation: node scripts/validate-assets.js")
    
    return len(failed) == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
