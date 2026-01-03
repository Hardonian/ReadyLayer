'use client'

import React from 'react'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import { Mail, MessageCircle, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SupportPage() {
  return (
    <Container className="py-8">
      <motion.div className="space-y-8" variants={fadeIn} initial="hidden" animate="visible">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Contact Support</h1>
          <p className="text-lg text-muted-foreground">
            We&apos;re here to help. Choose the best way to reach us.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <MessageCircle className="h-6 w-6 text-primary" />
                <CardTitle>Chat Support</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Get instant help from our AI assistant or connect with a human agent.
              </p>
              <Button className="w-full">
                Start Chat
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Mail className="h-6 w-6 text-primary" />
                <CardTitle>Email Support</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Send us an email and we&apos;ll get back to you within 24 hours.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <a href="mailto:support@readylayer.dev">
                  support@readylayer.dev
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary" />
              <CardTitle>Response Times</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-surface-muted rounded-lg">
                <span className="font-medium">Free Plan</span>
                <span className="text-muted-foreground">Community support</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface-muted rounded-lg">
                <span className="font-medium">Starter Plan</span>
                <span className="text-muted-foreground">24-48 hours</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface-muted rounded-lg">
                <span className="font-medium">Growth Plan</span>
                <span className="text-muted-foreground">12-24 hours</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface-muted rounded-lg">
                <span className="font-medium">Scale Plan</span>
                <span className="text-muted-foreground">4-8 hours (Priority)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}
