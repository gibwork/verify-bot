"use client"

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Coins, Zap, Users, Bot, BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const features = [
  {
    icon: Shield,
    title: "Token-Based Verification",
    description: "Automatically grant Discord roles based on users' token holdings",
  },
  {
    icon: Coins,
    title: "Integrated Token Purchase",
    description: "Users can buy required tokens directly if they don't have enough",
  },
  {
    icon: Zap,
    title: "Instant Verification",
    description: "Real-time balance checking and immediate role assignment",
  },
  {
    icon: Users,
    title: "Community Management",
    description: "Streamline your Discord server with automated role management",
  },
]

const steps = [
  {
    step: "1",
    title: "Use /verify Command",
    description: "Type /verify command in your Discord server to start the process",
  },
  {
    step: "2",
    title: "Visit Link & Connect Wallet",
    description: "Click the provided link and connect your Solana wallet",
  },
  {
    step: "3",
    title: "Check Balance & Sign",
    description: "Bot checks your token balance and you sign a verification message",
  },
  {
    step: "4",
    title: "Get Role or Buy Tokens",
    description: "Role granted if you have enough tokens, or buy instantly if needed",
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            className="flex items-center space-x-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Image src="/verify-bot-profile.svg" alt="Discord Verification Bot" width={40} height={40} className="rounded-lg" />
            <div>
              <h1 className="text-xl font-bold text-foreground">VerifyBot</h1>
              <p className="text-sm text-muted-foreground">
                by{" "}
                <a
                  href="https://gib.work"
                  className="text-violet-500 font-bold hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  gibwork
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <Image
              src="/verify-bot-profile.svg"
              alt="Discord Verification Bot Logo"
              width={120}
              height={120}
              className="mx-auto mb-8 rounded-2xl shadow-lg"
            />
          </motion.div>

          <motion.div variants={fadeInUp} initial="initial" animate="animate" className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              Discord Token
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                {" "}
                Verification Bot
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Automatically grant Discord roles based on token holdings. Seamlessly integrate token-gated access with
              built-in purchase functionality for your community.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="text-lg px-8 py-3" asChild>
                <Link
                  href="https://discord.com/oauth2/authorize?client_id=1360056347319861315"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Bot className="mr-2 h-5 w-5" />
                  Install Bot
                </Link>
              </Button>

              <Button variant="outline" size="lg" className="text-lg px-8 py-3" asChild>
                <Link href="/docs">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Docs
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.div
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-foreground mb-4">Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage token-based Discord roles efficiently
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full hover:shadow-lg transition-shadow duration-300 ">
                  <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simple 4-step process to verify token holdings and get Discord roles
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {steps.map((step, index) => (
              <motion.div key={index} variants={fadeInUp} className="text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto text-white text-xl font-bold">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 bg-primary">
        <div className="container mx-auto text-center">
          <motion.div
        variants={fadeInUp}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="max-w-3xl mx-auto"
          >
        <h2 className="text-4xl font-bold text-primary-foreground mb-6">Ready to Strengthen your community?</h2>
        <p className="text-xl text-primary-foreground/80 mb-8">
          Connect your wallet and get your Discord role in minutes. Don't have enough tokens? Purchase them directly
          through our interface.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="secondary" className="text-lg px-8 py-3" asChild>
            <Link
          href="https://discord.com/oauth2/authorize?client_id=1360056347319861315"
          target="_blank"
          rel="noopener noreferrer"
            >
          <Bot className="mr-2 h-5 w-5" />
          Install Bot
            </Link>
          </Button>

          <Button size="lg" variant="secondary" className="text-lg px-8 py-3 border-primary-foreground/20 text-primary" asChild>
            <Link
          href="https://discord.gg/fsANhbNhX2"
          target="_blank"
          rel="noopener noreferrer"
            >
          <Users className="mr-2 h-5 w-5" />
          Join gibwork Discord
            </Link>
          </Button>
        </div>

        <div className="mt-8 p-4 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
          <p className="text-primary-foreground/80 text-sm">
            <strong>Discord Command:</strong> Use <code className="bg-primary-foreground/20 px-2 py-1 rounded">/verify</code> in
            your Discord channel to begin the verification process
          </p>
        </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
