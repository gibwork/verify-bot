"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/sidebar";
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
} from "lucide-react";
import Image from "next/image";

type Section =
  | "introduction"
  | "installation"
  | "server-setup"
  | "edit-config"
  | "verify"
  | "tip"
  | "vault"
  | "getting-started";

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
];

function AppSidebar({
  activeSection,
  setActiveSection,
}: {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
}) {
  return (
    <Sidebar className="border-r z-[999]">
      <SidebarHeader className="border-b p-4">
        <Link href="/">
          <div className="flex items-center gap-3">
            <Image
              src="/verify-bot-profile.svg"
              alt="VerifyBot Logo"
              width={32}
              height={32}
              className="rounded-sm"
            />
            <div>
              <h2 className="font-semibold text-lg">VerifyBot</h2>
              <p className="text-xs text-muted-foreground">Documentation</p>
            </div>
          </div>
        </Link>
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
  );
}

function IntroductionSection() {
  return (
    <div className="space-y-8 mt-12">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Image
            src="/verify-bot-profile.svg"
            alt="VerifyBot Logo"
            width={80}
            height={80}
            className="rounded-xl"
          />
        </div>
        <h1 className="text-4xl font-bold mb-4">Welcome to VerifyBot</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A Discord bot for token-based verification and USDC tipping
          functionality
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">What is VerifyBot?</h3>
          <p className="text-muted-foreground mb-6">
            VerifyBot enhances your Discord server's community engagement
            through token verification and USDC tipping functionality.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Token Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    Verify users based on their token holdings with customizable
                    balance requirements
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Gift className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold">USDC Tipping</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable community members to tip each other with USDC
                    seamlessly
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Settings className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Easy Configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    Simple setup and management with admin-only configuration
                    commands
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InstallationSection() {
  return (
    <div className="space-y-8 mt-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Installation Guide</h1>
        <p className="text-muted-foreground">
          Get VerifyBot on your Discord server
        </p>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Image
              src="/verify-bot-profile.svg"
              alt="VerifyBot"
              width={30}
              height={30}
              className="rounded-sm"
            />
            Add VerifyBot to Your Server
          </CardTitle>
          <CardDescription className="text-lg">
            Click the button below to invite VerifyBot to your Discord server
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4">
            <Button
              asChild
              size="lg"
              className="font-semibold px-8 py-3 text-lg"
            >
              <a
                href="https://discord.com/oauth2/authorize?client_id=1360056347319861315"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Install VerifyBot
              </a>
            </Button>
            <p className="text-sm text-muted-foreground">
              You'll be redirected to Discord to authorize the bot for your
              server
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Installation Steps
          </CardTitle>
          <CardDescription>
            Follow these simple steps after clicking the invite link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[
              {
                step: 1,
                title: "Click the Invite Link",
                description:
                  "Use the button above to open the Discord authorization page",
              },
              {
                step: 2,
                title: "Select Your Server",
                description:
                  "Choose which Discord server you want to add VerifyBot to",
              },
              {
                step: 3,
                title: "Grant Permissions",
                description:
                  "Ensure the bot has the necessary permissions to manage roles and send messages",
              },
              {
                step: 4,
                title: "Configure Settings",
                description:
                  "Use the /server-setup command to configure your verification requirements",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-sm font-bold">
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

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5" />
            <h3 className="font-semibold">Required Permissions</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            VerifyBot needs these permissions to function properly:
          </p>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Manage Roles</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Send Messages</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Use Slash Commands</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Embed Links</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-muted p-4 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-semibold">Next Steps</span>
        </div>
        <p className="text-sm text-muted-foreground">
          After installation, head to the <strong>Server Setup</strong> section
          to configure your token verification settings and start using
          VerifyBot!
        </p>
      </div>
    </div>
  );
}

function ServerSetupSection() {
  return (
    <div className="space-y-8 mt-12">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">/server-setup</h1>
          <Badge variant="destructive" className="text-xs">
            <Crown className="w-3 h-3 mr-1" />
            Admin Only
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Initial setup command to configure token verification for your server
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration Parameters
          </CardTitle>
          <CardDescription>
            Configure all the essential parameters for token-based verification
          </CardDescription>
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
              <div key={param.field} className="p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="font-mono text-sm bg-background px-2 py-1 rounded font-semibold">
                        {param.field}
                      </code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {param.description}
                    </p>
                    <div className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
                      Example:{" "}
                      <span className="font-mono">{param.example}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EditConfigSection() {
  return (
    <div className="space-y-8 mt-12">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">/edit-config</h1>
          <Badge variant="destructive" className="text-xs">
            <Crown className="w-3 h-3 mr-1" />
            Admin Only
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Modify existing server configuration settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Update Configuration
          </CardTitle>
          <CardDescription>
            Fine-tune your server's verification requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Update any of the previously configured settings including RPC
              URL, token amounts, role assignments, and more. This command
              allows you to fine-tune your server's verification requirements
              without starting from scratch.
            </p>

            <div className="bg-muted p-4 rounded-lg border">
              <h4 className="font-semibold mb-2">What you can modify:</h4>
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                  <span>Token address</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                  <span>Required balance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                  <span>Role assignments</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                  <span>RPC endpoint</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                  <span>Token symbol & decimals</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                  <span>Tip notification channel</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VerifySection() {
  return (
    <div className="space-y-8 mt-12">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">/verify</h1>
          <Badge variant="secondary" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            Anyone
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Verify your token holdings to gain access to exclusive roles
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Verification Process
          </CardTitle>
          <CardDescription>How the verification system works</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              This command initiates a secure verification process that confirms
              your token holdings:
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
                  description:
                    "Automatically grants the configured role if verified",
                },
              ].map((step) => (
                <div
                  key={step.step}
                  className="flex items-center gap-4 p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TipSection() {
  return (
    <div className="space-y-8 mt-12">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">/tip</h1>
          <Badge variant="secondary" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            Anyone
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Send USDC tips to other community members
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            USDC Tipping System
          </CardTitle>
          <CardDescription>
            Enable community appreciation through seamless USDC tipping
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div>
                    <code className="font-mono text-sm bg-background px-2 py-1 rounded font-semibold">
                      user_to_tip
                    </code>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select the Discord user to tip
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div>
                    <code className="font-mono text-sm bg-background px-2 py-1 rounded font-semibold">
                      amount_in_usdc
                    </code>
                    <p className="text-sm text-muted-foreground mt-1">
                      Amount of USDC to send
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg border">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                How it works:
              </h4>
              <p className="text-sm text-muted-foreground">
                After using this command, you'll be redirected to a secure web
                interface to complete the USDC transfer. The recipient will be
                notified and can claim their tip from the vault.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl mb-2">⚡</div>
                <h4 className="font-semibold text-sm">Instant</h4>
                <p className="text-xs text-muted-foreground">
                  Quick and easy tipping
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl mb-2">🔒</div>
                <h4 className="font-semibold text-sm">Secure</h4>
                <p className="text-xs text-muted-foreground">
                  Protected transactions
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl mb-2">🎉</div>
                <h4 className="font-semibold text-sm">Social</h4>
                <p className="text-xs text-muted-foreground">Build community</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VaultSection() {
  return (
    <div className="space-y-8 mt-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Tip Vault</h1>
        <p className="text-muted-foreground">
          Manage and claim your received tips
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vault className="w-5 h-5" />
            Your Personal Vault
          </CardTitle>
          <CardDescription>
            Access your tip vault to view and claim received tips
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-center p-6 bg-muted rounded-lg border">
              <Vault className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">Visit Your Vault</h3>
              <a
                href="https://verify-bot.gib.work/vault"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                https://verify-bot.gib.work/vault
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="font-semibold">Vault Features</h4>
                <div className="space-y-3">
                  {[
                    { icon: "💰", text: "Claim pending tips to your wallet" },
                    { icon: "🔐", text: "Secure Discord authentication" },
                  ].map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="text-lg">{feature.icon}</span>
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg border">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium mb-1">
                        Discord Login Required
                      </p>
                      <p className="text-xs text-muted-foreground">
                        You must be logged into Discord to access your vault and
                        claim tips
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/70 border-b shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-19"></div>
      </div>
    </nav>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<Section>("introduction");

  const renderContent = () => {
    switch (activeSection) {
      case "introduction":
        return <IntroductionSection />;
      case "installation":
        return <InstallationSection />;
      case "server-setup":
        return <ServerSetupSection />;
      case "edit-config":
        return <EditConfigSection />;
      case "verify":
        return <VerifySection />;
      case "tip":
        return <TipSection />;
      case "vault":
        return <VaultSection />;
      default:
        return <IntroductionSection />;
    }
  };

  return (
    <SidebarProvider defaultOpen>
      <NavBar />
      <div className="flex min-h-screen w-full">
        <AppSidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />
        <SidebarInset className="flex-1">
          {/* Add top padding to prevent collision with header buttons */}
          <main className="flex-1 p-8 pt-20 overflow-auto">
            <div className="max-w-4xl mx-auto">{renderContent()}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
