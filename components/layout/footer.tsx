'use client'

import React from 'react'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { LogoWord } from '@/components/ui/logo'
import { Github, Twitter, Mail, Shield, FileText, BookOpen } from 'lucide-react'

export function Footer(): React.JSX.Element {
  return (
    <footer className="border-t border-border/20 bg-surface-code/50">
      <Container size="lg">
        <div className="py-8 border-b border-border/20">
          <div className="flex flex-col gap-4 max-w-sm">
            <LogoWord size="sm" />
            <p className="text-sm font-body text-text-muted leading-relaxed">
              Open-source governance framework for AI-generated code.
            </p>
            <div className="flex gap-2 w-fit">
              <a
                href="https://github.com/Hardonian/ReadyLayer"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="p-2 rounded-lg bg-surface-raised hover:bg-surface-hover hover:shadow-glow transition-all duration-300 tap-target"
              >
                <Github className="h-4 w-4 text-text-muted hover:text-text" />
              </a>
              <a
                href="https://twitter.com/readylayer"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="p-2 rounded-lg bg-surface-raised hover:bg-surface-hover hover:shadow-glow transition-all duration-300 tap-target"
              >
                <Twitter className="h-4 w-4 text-text-muted hover:text-text" />
              </a>
              <a
                href="mailto:support@readylayer.io"
                aria-label="Email"
                className="p-2 rounded-lg bg-surface-raised hover:bg-surface-hover hover:shadow-glow transition-all duration-300 tap-target"
              >
                <Mail className="h-4 w-4 text-text-muted hover:text-text" />
              </a>
            </div>
          </div>
        </div>

          <div className="py-10 sm:py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            <div>
              <h4 className="font-display font-semibold text-base mb-4">Product</h4>
              <ul className="space-y-2 text-sm font-body">
                <li>
                  <Link href="/how-it-works" className="text-text-muted hover:text-text-primary transition-colors">
                    How it Works
                  </Link>
                </li>
                <li>
                  <Link href="/open-source" className="text-text-muted hover:text-text-primary transition-colors">
                    Open Source
                  </Link>
                </li>
                <li>
                  <Link href="/governance" className="text-text-muted hover:text-text-primary transition-colors">
                    Governance
                  </Link>
                </li>
                <li>
                  <Link href="/enterprise" className="text-text-muted hover:text-text-primary transition-colors">
                    Enterprise (optional)
                  </Link>
                </li>
              </ul>
            </div>

          <div>
            <h4 className="font-display font-semibold text-base mb-4">Trust & Security</h4>
            <ul className="space-y-2 text-sm font-body">
              <li>
                <Link href="/security" className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security
                </Link>
              </li>
              <li>
                <Link href="/audit-example" className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Audit Example
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/Hardonian/ReadyLayer/blob/main/SECURITY.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-text-primary transition-colors"
                >
                  Report Vulnerability
                </a>
              </li>
              <li>
                <Link href="/open-source#oss-boundary" className="text-text-muted hover:text-text-primary transition-colors">
                  OSS Boundary
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/docs" className="text-text-muted hover:text-text transition-colors flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/integrations" className="text-text-muted hover:text-text transition-colors">
                  Integrations
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
              <li>
                <Link href="/changelog" className="text-text-muted hover:text-text transition-colors">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/Hardonian/ReadyLayer/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-text transition-colors"
                >
                  License
                </a>
              </li>
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
                <Link href="/cookies" className="text-text-muted hover:text-text transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/20 py-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm font-body text-text-muted">
          <p>© {new Date().getFullYear()} ReadyLayer. All rights reserved.</p>
          <p>Open-source governance, optional hosted convenience.</p>
        </div>
      </Container>
    </footer>
  )
}
