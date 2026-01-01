'use client'

import { useState, Suspense } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, LoadingState, ErrorState } from '@/components/ui'
import { fadeIn, slideUp } from '@/lib/design/motion'
import { Github } from 'lucide-react'

// Provider icons as SVG components
const GitLabIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.423-.73-.423-.867 0L16.418 9.45H7.582L4.919 1.263c-.135-.423-.73-.423-.867 0L1.388 9.452.046 13.587c-.121.375.014.789.331 1.023L12 23.054l11.623-8.443c.318-.235.453-.647.332-1.024"/>
  </svg>
)

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const BitbucketIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891L.778 1.213zM14.52 15.53H9.522L8.17 8.466h7.561l-1.211 7.064z"/>
  </svg>
)

type Provider = 'github' | 'gitlab' | 'google' | 'bitbucket'

interface ProviderConfig {
  id: Provider
  name: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

const providers: ProviderConfig[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: <Github className="h-5 w-5" />,
    color: 'text-white',
    bgColor: 'bg-[#24292e] hover:bg-[#24292e]/90',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    icon: <GitLabIcon />,
    color: 'text-white',
    bgColor: 'bg-[#FC6D26] hover:bg-[#FC6D26]/90',
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    icon: <BitbucketIcon />,
    color: 'text-white',
    bgColor: 'bg-[#0052CC] hover:bg-[#0052CC]/90',
  },
  {
    id: 'google',
    name: 'Google',
    icon: <GoogleIcon />,
    color: 'text-gray-700',
    bgColor: 'bg-white hover:bg-gray-50 border border-gray-300',
  },
]

function SignInContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const [loading, setLoading] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (provider: Provider) => {
    try {
      setLoading(provider)
      setError(null)
      const supabase = createSupabaseClient()
      
      // Map provider names to Supabase OAuth provider IDs
      const supabaseProviderMap: Record<Provider, 'github' | 'gitlab' | 'google' | 'bitbucket'> = {
        github: 'github',
        gitlab: 'gitlab',
        bitbucket: 'bitbucket',
        google: 'google',
      }

      const supabaseProvider = supabaseProviderMap[provider]
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(callbackUrl)}`,
        },
      })

      if (error) {
        setError(error.message)
        setLoading(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6">
        <motion.div
          className="w-full"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="text-center mb-8"
            variants={slideUp}
          >
            <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ReadyLayer
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Sign in to continue to your dashboard
            </p>
          </motion.div>

            <motion.div variants={slideUp}>
            <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50 shadow-2xl backdrop-saturate-150">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
                <CardDescription className="text-base">
                  Choose your preferred sign-in method
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {error && (
                  <motion.div
                    variants={slideUp}
                    initial="hidden"
                    animate="visible"
                  >
                    <ErrorState
                      message={error}
                      className="py-3"
                    />
                  </motion.div>
                )}
                
                <div className="space-y-3">
                  {providers.map((provider) => (
                    <motion.div
                      key={provider.id}
                      variants={slideUp}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: providers.indexOf(provider) * 0.1 }}
                    >
                      <Button
                        onClick={() => handleSignIn(provider.id)}
                        disabled={loading !== null}
                        className={`w-full ${provider.bgColor} ${provider.color} h-12 text-base font-medium transition-all duration-200 shadow-md hover:shadow-lg`}
                        size="lg"
                      >
                        {loading === provider.id ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Signing in...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <span className="mr-3">{provider.icon}</span>
                            Continue with {provider.name}
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    By continuing, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading..." />
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}
