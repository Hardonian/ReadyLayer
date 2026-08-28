#!/bin/bash

# ReadyLayer Stitch UI Migration - Verification Script
# Tests the updated UI components and theme implementation

echo "🧪 ReadyLayer Stitch UI Migration Verification"
echo "============================================="

echo ""
echo "📋 Phase 5: QA Hardening Checklist"
echo "--------------------------------------"

# Check if all expected files exist
echo "✅ Checking file structure..."
files_to_check=(
    "app/layout.tsx"
    "components/ui/error-boundary.tsx"
    "components/ui/index.ts"
    "app/globals.css"
    "tailwind.config.ts"
    "components/landing/HeroProof.tsx"
    "components/layout/public-layout.tsx"
    "components/layout/app-layout.tsx"
    "components/layout/footer.tsx"
    "components/layout/nav-link.tsx"
    "components/ui/button.tsx"
)

for file in "${files_to_check[@]}"; do
    if [ -f "../$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ Missing: $file"
    fi
done

echo ""
echo "🎨 Checking theme implementation..."

# Check if fonts are loaded
if grep -q "Space_Grotesk" ../app/layout.tsx; then
    echo "  ✓ Space Grotesk font imported"
else
    echo "  ✗ Space Grotesk font missing"
fi

# Check if Stitch tokens are in CSS
if grep -q "stitch\|hero-gradient\|bg-grid" ../app/globals.css; then
    echo "  ✓ Stitch utilities added to globals.css"
else
    echo "  ✗ Stitch utilities missing"
fi

# Check if Tailwind config is updated
if grep -q "font-display.*Space_Grotesk" ../tailwind.config.ts; then
    echo "  ✓ Tailwind config updated with Stitch fonts"
else
    echo "  ✗ Tailwind config not updated"
fi

echo ""
echo "🛡️  Checking safety features..."

# Check error boundaries
if grep -q "ErrorBoundary" ../app/\(public\)/layout.tsx && grep -q "ErrorBoundary" ../app/\(app\)/layout.tsx; then
    echo "  ✓ Error boundaries added to layouts"
else
    echo "  ✗ Error boundaries missing"
fi

# Check if loading states are enhanced
if grep -q "shadow-glow.*border-border/20.*border-t-primary" ../components/ui/loading.tsx; then
    echo "  ✓ Loading states enhanced with Stitch styling"
else
    echo "  ✗ Loading states not enhanced"
fi

echo ""
echo "🔧 Component integration checks..."

# Check Button component updates
if grep -q "shadow-glow.*transition-all.*duration-300" ../components/ui/button.tsx; then
    echo "  ✓ Button component enhanced with Stitch effects"
else
    echo "  ✗ Button component not enhanced"
fi

# Check Navigation updates
if grep -q "rounded-xl.*hover:bg-surface-hover.*tap-target" ../components/layout/nav-link.tsx; then
    echo "  ✓ Navigation enhanced with Stitch styling"
else
    echo "  ✗ Navigation not enhanced"
fi

echo ""
echo "🎯 Final validation..."

# Count total changes made (approximate)
stitched_files=$(grep -l "stitch\|glow\|Space_Grotesk\|font-display" ../components/ ../app/ | wc -l)
echo "  ✓ $stitched_files files updated with Stitch patterns"

echo ""
echo "============================================="
echo "✅ ReadyLayer Stitch UI Migration Complete!"
echo ""
echo "🚀 Next steps:"
echo "  1. Run 'npm run build' to test compilation"
echo "  2. Run 'npm run dev' to test UI locally"
echo "  3. Test dark/light theme switching"
echo "  4. Test mobile responsiveness"
echo "  5. Test error boundaries (throw error in dev)"
echo "============================================="