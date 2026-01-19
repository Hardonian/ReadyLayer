'use client'

import * as React from 'react'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { LogoWord } from '@/components/ui/logo'
import { Github, Twitter, Mail, Shield, FileText, BarChart3 } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-surface-muted/50">
      <Container size="lg">
        <div className="py-12 grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand & Legal */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <LogoWord size="sm" />
            </div>
            <p className="text-sm text-text-muted mb-4 leading-relaxed">
              The default authority for AI-generated code safety.
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/Hardonian/ReadyLayer"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="p-2 rounded-lg bg-surface-raised hover:bg-surface-hover transition-colors"
              >
                <Github className="h-4 w-4 text-text-muted hover:text-text" />
              </a>
              <a
                href="https://twitter.com/readylayer"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="p-2 rounded-lg bg-surface-raised hover:bg-surface-hover transition-colors"
              >
                <Twitter className="h-4 w-4 text-text-muted hover:text-text" />
              </a>
              <a
                href="mailto:support@readylayer.io"
                aria-label="Email"
                className="p-2 rounded-lg bg-surface-raised hover:bg-surface-hover transition-colors"
              >
                <Mail className="h-4 w-4 text-text-muted hover:text-text" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/how-it-works" className="text-text-muted hover:text-text transition-colors">
                  How it Works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-text-muted hover:text-text transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="text-text-muted hover:text-text transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/features/oss-maintainers" className="text-text-muted hover:text-text transition-colors">
                  For OSS Maintainers
                </Link>
              </li>
              <li>
                <Link href="/features/startup-ctos" className="text-text-muted hover:text-text transition-colors">
                  For Startup CTOs
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Security */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Trust & Security</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/security" className="text-text-muted hover:text-text transition-colors flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Security & Compliance
                </Link>
              </li>
              <li>
                <Link href="/audit-example" className="text-text-muted hover:text-text transition-colors flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Audit Example
                </Link>
              </li>
              <li>
                <a
                  href="https://status.readylayer.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-text transition-colors flex items-center gap-1"
                >
                  <BarChart3 className="h-3 w-3" />
                  Status Page
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Hardonian/ReadyLayer/blob/main/SECURITY.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-text transition-colors"
                >
                  Report Vulnerability
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/docs/api-reference" className="text-text-muted hover:text-text transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-text-muted hover:text-text transition-colors">
                  Help & Support
                </Link>
              </li>
              <li>
                <Link href="/help/getting-started" className="text-text-muted hover:text-text transition-colors">
                  Getting Started
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/Hardonian/ReadyLayer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-text transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-text-muted hover:text-text transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-text-muted hover:text-text transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/dpa" className="text-text-muted hover:text-text transition-colors">
                  Data Processing
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-text-muted hover:text-text transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border-subtle py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-text-muted">
          <p>© {new Date().getFullYear()} ReadyLayer. All rights reserved.</p>
          <p>Made with care for AI-generated code safety.</p>
        </div>
      </Container>
    </footer>
  )
}
