'use client'

import Image from 'next/image'
import { Button } from '@/shared/components/ui/button'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

export default function OnboardingOrganizationPage() {
  const router = useRouter()
  const { t } = useTranslation('organization')

  const handleGetStarted = () => {
    router.replace('/org/create')
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large Background Logo Watermark */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center opacity-[0.04]"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.04, 0.06, 0.04],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Image
            src="/images/li2-logo-withtext.svg"
            alt="Li2.ai"
            width={1200}
            height={1200}
            className="object-contain"
          />
        </motion.div>

        {/* Floating Gradient Orbs - More Visible */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl"
          animate={{
            y: [-30, 30, -30],
            x: [-20, 20, -20],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl"
          animate={{
            y: [30, -30, 30],
            x: [20, -20, 20],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
        <motion.div
          className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            y: [-25, 25, -25],
            x: [-25, 25, -25],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-16 px-4">
        {/* Logo - Larger and More Prominent */}
        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            duration: 1,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {/* <Image
            src="/images/logo.png"
            alt="Li2.ai"
            width={120}
            height={120}
            className="object-contain drop-shadow-2xl"
            priority
          /> */}
          <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Li2.ai
          </h2>
        </motion.div>

        {/* Welcome Text - Better Spacing */}
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.3,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('onboarding.welcome_title')}
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            {t('onboarding.welcome_description')}
          </p>
        </motion.div>

        {/* Getting Started Button - More Prominent */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="group relative px-12 py-7 text-xl font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 bg-primary hover:bg-primary/90"
          >
            {t('setup.getting_started')}
            <motion.div
              className="inline-block ml-3"
              animate={{ x: [0, 6, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <ArrowRight className="h-6 w-6" />
            </motion.div>
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
