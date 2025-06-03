"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarHeader,
} from "@/components/ui/sidebar"
import {
  Shield,
  Settings,
  CheckCircle,
  Gift,
  ExternalLink,
  Crown,
  Users,
  Home,
  Download,
  Terminal,
  Vault,
  Sparkles,
  ArrowRight,
  Bot,
  Plus,
} from "lucide-react"
import Image from "next/image"

type Section =
  | "introduction"
  | "installation"
  | "server-setup"
  | "edit-config"
  | "verify"
  | "tip"
  | "vault"
  | "getting-started"

const navigationItems = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", icon: Home, id: "introduction" as Section },
      { title: "Installation", icon: Download, id: "installation" as Section },
    ],
  },
  {
    title: "Commands",
    items: [
      { title: "Server Setup", icon: Settings, id: "server-setup" as Section },
      { title: "Edit Config", icon: Terminal, id: "edit-config" as Section },
      { title: "Verify", icon: CheckCircle, id: "verify" as Section },
      { title: "Tip", icon: Gift, id: "tip" as Section },
    ],
  },
  {
    title: "Features",
    items: [{ title: "Tip Vault", icon: Vault, id: "vault" as Section }],
  },
]

function AppSidebar({
  activeSection,
  setActiveSection,
}: {
  activeSection: Section
  setActiveSection: (section: Section) => void
}) {
  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">VerifyBot</h2>
            <p className="text-xs text-muted-foreground">Documentation</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navigationItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => setActiveSection(item.id)}
                      isActive={activeSection === item.id}
                      className="w-full justify-start"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}

function IntroductionSection() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Image
              src="/verify-bot-profile.svg"
              alt="VerifyBot Logo"
              width={120}
              height={120}
              className="rounded-2xl shadow-lg"
            />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
          Welcome to VerifyBot
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A Discord bot for token-based verification and USDC tipping functionality
        </p>
      </div>

      <Card className="border-2 border-dashed border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold">What is VerifyBot?</h3>
          </div>
          <p className="text-muted-foreground mb-6">
            VerifyBot enhances your Discord server's community engagement through token
            verification and USDC tipping functionality.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold">Token Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    Verify users based on their token holdings with customizable balance requirements
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Gift className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold">USDC Tipping</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable community members to tip each other with USDC seamlessly
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold">Easy Configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    Simple setup and management with admin-only configuration commands
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function InstallationSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">Installation Guide</h1>
        <p className="text-muted-foreground">Get VerifyBot on your Discord server</p>
      </div>

      {/* Invite Bot Card */}
      <Card className="border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Plus className="w-6 h-6 text-blue-600" />
            Add VerifyBot to Your Server
          </CardTitle>
          <CardDescription className="text-lg">
            Click the button below to invite VerifyBot to your Discord server
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Bot className="w-8 h-8 text-white" />
              </div>
            </div>
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <a
                href="https://discord.com/oauth2/authorize?client_id=1360056347319861315"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Install VerifyBot
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
            <p className="text-sm text-muted-foreground">
              You'll be redirected to Discord to authorize the bot for your server
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-violet-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Installation Steps
          </CardTitle>
          <CardDescription>Follow these simple steps after clicking the invite link</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[
              {
                step: 1,
                title: "Click the Invite Link",
                description: "Use the button above to open the Discord authorization page"
              },
              {
                step: 2,
                title: "Select Your Server",
                description: "Choose which Discord server you want to add VerifyBot to"
              },
              {
                step: 3,
                title: "Grant Permissions",
                description: "Ensure the bot has the necessary permissions to manage roles and send messages"
              },
              {
                step: 4,
                title: "Configure Settings",
                description: "Use the /server-setup command to configure your verification requirements"
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg`}
                >
                  {item.step}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1">{item.title}</h4>
                  <p className="text-muted-foreground">{item.description}</p>
                  {item.step === 4 && (
                    <div className="mt-2 p-2 bg-muted rounded-md">
                      <code className="text-sm">/server-setup</code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Required Permissions</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">VerifyBot needs these permissions to function properly:</p>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Manage Roles</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Send Messages</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Use Slash Commands</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Embed Links</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-green-700 dark:text-green-300">Next Steps</span>
        </div>
        <p className="text-sm text-green-700 dark:text-green-300">
          After installation, head to the <strong>Server Setup</strong> section to configure your token verification
          settings and start using VerifyBot!
        </p>
      </div>
    </div>
  )
}

function ServerSetupSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-primary">/server-setup</h1>
          <Badge variant="destructive" className="text-xs">
            <Crown className="w-3 h-3 mr-1" />
            Admin Only
          </Badge>
        </div>
        <p className="text-muted-foreground">Initial setup command to configure token verification for your server</p>
      </div>

      <Card className="border-l-4 border-l-violet-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-600" />
            Configuration Parameters
          </CardTitle>
          <CardDescription>Configure all the essential parameters for token-based verification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {[
              {
                field: "token_address",
                description: "The contract address of the token to verify",
                example: "F7Hwf8ib5DVCoiuyGr618Y3gon429Rnd1r5F9R5upump",
              },
              {
                field: "required_balance",
                description: "Minimum balance (amount x 10^decimals)",
                example: "100000000 (for 100 tokens if decimals 6)",
              },
              {
                field: "role_to_grant",
                description: "Discord role to assign upon verification",
                example: "@Verified Member",
              },
              {
                field: "rpc_url",
                description: "Your custom RPC endpoint URL",
                example: "https://mainnet.helius-rpc.com/?api....",
              },
              {
                field: "token_symbol",
                description: "Symbol of the token (e.g., WORK, USDC)",
                example: "WORK",
              },
              {
                field: "token_decimals",
                description: "Number of decimal places for the token",
                example: "6",
              },
              {
                field: "tip_channel",
                description: "Channel for bot tipping notifications",
                example: "#tips",
              },
            ].map((param) => (
              <div key={param.field} className="p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="font-mono text-sm bg-background px-2 py-1 rounded font-semibold">
                        {param.field}
                      </code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{param.description}</p>
                    <div className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
                      Example: <span className="font-mono">{param.example}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function EditConfigSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-primary">/edit-config</h1>
          <Badge variant="destructive" className="text-xs">
            <Crown className="w-3 h-3 mr-1" />
            Admin Only
          </Badge>
        </div>
        <p className="text-muted-foreground">Modify existing server configuration settings</p>
      </div>

      <Card className="border-l-4 border-l-violet-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-orange-600" />
            Update Configuration
          </CardTitle>
          <CardDescription>Fine-tune your server's verification requirements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Update any of the previously configured settings including RPC URL, token amounts, role assignments, and
              more. This command allows you to fine-tune your server's verification requirements without starting from
              scratch.
            </p>

            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-600" />
                What you can modify:
              </h4>
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-orange-500" />
                  <span>Token address</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-orange-500" />
                  <span>Required balance</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-orange-500" />
                  <span>Role assignments</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-orange-500" />
                  <span>RPC endpoint</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-orange-500" />
                  <span>Token symbol & decimals</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-orange-500" />
                  <span>Tip notification channel</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function VerifySection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-primary">/verify</h1>
          <Badge variant="secondary" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            Anyone
          </Badge>
        </div>
        <p className="text-muted-foreground">Verify your token holdings to gain access to exclusive roles</p>
      </div>

      <Card className="border-l-4 border-l-violet-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Verification Process
          </CardTitle>
          <CardDescription>How the verification system works</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              This command initiates a secure verification process that confirms your token holdings:
            </p>

            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: "Web Interface",
                  description: "Redirects to a secure web interface",
                },
                {
                  step: 2,
                  title: "Wallet Connection",
                  description: "Prompts user to connect their wallet",
                },
                {
                  step: 3,
                  title: "Balance Check",
                  description: "Verifies token balance against requirements",
                },
                {
                  step: 4,
                  title: "Role Assignment",
                  description: "Automatically grants the configured role if verified",
                },
              ].map((step) => (
                <div key={step.step} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                </div>
              ))}
            </div>


          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TipSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-primary">/tip</h1>
          <Badge variant="secondary" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            Anyone
          </Badge>
        </div>
        <p className="text-muted-foreground">Send USDC tips to other community members</p>
      </div>

      <Card className="border-l-4 border-l-violet-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-blue-600" />
            USDC Tipping System
          </CardTitle>
          <CardDescription>Enable community appreciation through seamless USDC tipping</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div>
                    <code className="font-mono text-sm bg-background px-2 py-1 rounded font-semibold">user_to_tip</code>
                    <p className="text-sm text-muted-foreground mt-1">Select the Discord user to tip</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div>
                    <code className="font-mono text-sm bg-background px-2 py-1 rounded font-semibold">
                      amount_in_usdc
                    </code>
                    <p className="text-sm text-muted-foreground mt-1">Amount of USDC to send</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-600" />
                How it works:
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                After using this command, you'll be redirected to a secure web interface to complete the USDC transfer.
                The recipient will be notified and can claim their tip from the vault.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg">
                <div className="text-2xl mb-2">⚡</div>
                <h4 className="font-semibold text-sm">Instant</h4>
                <p className="text-xs text-muted-foreground">Quick and easy tipping</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg">
                <div className="text-2xl mb-2">🔒</div>
                <h4 className="font-semibold text-sm">Secure</h4>
                <p className="text-xs text-muted-foreground">Protected transactions</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-lg">
                <div className="text-2xl mb-2">🎉</div>
                <h4 className="font-semibold text-sm">Social</h4>
                <p className="text-xs text-muted-foreground">Build community</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function VaultSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">Tip Vault</h1>
        <p className="text-muted-foreground">Manage and claim your received tips</p>
      </div>

      <Card className="border-l-4 border-l-violet-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vault className="w-5 h-5 text-purple-600" />
            Your Personal Vault
          </CardTitle>
          <CardDescription>Access your tip vault to view and claim received tips</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <Vault className="w-12 h-12 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">Visit Your Vault</h3>
              <a
                href="https://verify-bot.gib.work/vault"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium hover:underline"
              >
                https://verify-bot.gib.work/vault
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Vault Features
                </h4>
                <div className="space-y-3">
                  {[
                    { icon: "💰", text: "Claim pending tips to your wallet" },
                    { icon: "🔐", text: "Secure Discord authentication" },
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <span className="text-lg">{feature.icon}</span>
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  Security & Access
                </h4>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
                        Discord Login Required
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        You must be logged into Discord to access your vault and claim tips
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-600" />
                How to Claim Tips
              </h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">
                    1
                  </div>
                  <p className="font-medium">Visit Vault</p>
                  <p className="text-muted-foreground text-xs">Login with Discord</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">
                    2
                  </div>
                  <p className="font-medium">View Tips</p>
                  <p className="text-muted-foreground text-xs">See pending amounts</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">
                    3
                  </div>
                  <p className="font-medium">Claim</p>
                  <p className="text-muted-foreground text-xs">Transfer to wallet</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<Section>("introduction")

  const renderContent = () => {
    switch (activeSection) {
      case "introduction":
        return <IntroductionSection />
      case "installation":
        return <InstallationSection />
      case "server-setup":
        return <ServerSetupSection />
      case "edit-config":
        return <EditConfigSection />
      case "verify":
        return <VerifySection />
      case "tip":
        return <TipSection />
      case "vault":
        return <VaultSection />
      default:
        return <IntroductionSection />
    }
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
        <SidebarInset className="flex-1">
          <main className="flex-1 p-8 overflow-auto">
            <div className="max-w-4xl mx-auto">{renderContent()}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
