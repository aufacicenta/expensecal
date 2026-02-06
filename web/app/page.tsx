"use client";

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { useUser } from "@stackframe/stack";
import {
  ArrowRight,
  Bot,
  Calculator,
  Calendar,
  ChevronRight,
  Coins,
  CreditCard,
  DollarSign,
  FileText,
  Gem,
  Guitar,
  Home,
  Image as ImageIcon,
  LineChart,
  MessageSquare,
  Package,
  Palette,
  PiggyBank,
  Repeat,
  ScanText,
  Sparkles,
  TrendingUp,
  Wallet,
  Watch,
} from "lucide-react";
import NextLink from "next/link";

import { useRoutes } from "@/hooks/useRoutes/useRoutes";

export default function LandingPage() {
  const user = useUser();
  const routes = useRoutes();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <nav className="border-divider bg-background/80 sticky top-0 z-50 border-b backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">ExpenseCal</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              className="hidden sm:flex"
              size="sm"
              variant="light"
              onPress={() => scrollToSection("features")}
            >
              Features
            </Button>
            <Button
              className="hidden sm:flex"
              size="sm"
              variant="light"
              onPress={() => scrollToSection("inventory")}
            >
              Inventory
            </Button>
            <Button
              className="hidden sm:flex"
              size="sm"
              variant="light"
              onPress={() => scrollToSection("scheduling")}
            >
              Scheduling
            </Button>
            <Divider className="hidden h-6 sm:block" orientation="vertical" />
            {user ? (
              <>
                <Button
                  as={NextLink}
                  href={routes.table.index()}
                  size="sm"
                  variant="light"
                >
                  Go to App
                </Button>
                <Button
                  as={NextLink}
                  color="danger"
                  href={routes.handler.signOut()}
                  size="sm"
                  variant="flat"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  as={NextLink}
                  href={routes.handler.signIn()}
                  size="sm"
                  variant="light"
                >
                  Sign In
                </Button>
                <Button
                  as={NextLink}
                  color="primary"
                  href={routes.handler.signUp()}
                  size="sm"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 lg:px-8 lg:pt-24 lg:pb-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 blur-3xl">
            <div
              className="from-primary/20 to-secondary/20 aspect-[1155/678] w-[72rem] bg-gradient-to-tr opacity-30"
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
            />
          </div>
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <Chip
            className="mb-6"
            color="primary"
            startContent={<Sparkles className="h-3 w-3" />}
            variant="flat"
          >
            Powered by Gemini 3 AI from Google
          </Chip>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            The future of
            <span className="from-primary to-secondary bg-gradient-to-r bg-clip-text text-transparent">
              {" "}
              expense tracking, inventory valuation & financial forecasting
            </span>
          </h1>
          <p className="text-default-600 mx-auto mt-6 max-w-2xl text-lg">
            Know your wealth across time to make better decisions. Process
            expenses from natural language, images, PDFs, and bank statements —
            in any of the major FIAT and crypto currencies.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              as={NextLink}
              className="w-full sm:w-auto"
              color="primary"
              endContent={<ArrowRight className="h-4 w-4" />}
              href={user ? routes.table.index() : routes.handler.signUp()}
              size="lg"
            >
              {user ? "Go to App" : "Start Free"}
            </Button>
            <Button
              className="w-full sm:w-auto"
              endContent={<ChevronRight className="h-4 w-4" />}
              size="lg"
              variant="bordered"
              onPress={() => scrollToSection("features")}
            >
              See How It Works
            </Button>
          </div>

          {/* Example Input */}
          <div className="mx-auto mt-16 max-w-2xl">
            <div className="border-divider bg-content1 rounded-2xl border p-6 shadow-lg">
              <div className="flex items-center gap-3 text-left">
                <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  <MessageSquare className="text-primary h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-default-500 text-sm">Try typing...</p>
                  <p className="font-mono text-lg">
                    &quot;100 USD for yesterday&apos;s dinner with friends&quot;
                  </p>
                </div>
              </div>
              <Divider className="my-4" />
              <div className="flex flex-wrap gap-2">
                <Chip color="success" size="sm" variant="flat">
                  <DollarSign className="mr-1 inline h-3 w-3" />
                  100 USD
                </Chip>
                <Chip color="warning" size="sm" variant="flat">
                  <Calendar className="mr-1 inline h-3 w-3" />
                  Yesterday
                </Chip>
                <Chip color="secondary" size="sm" variant="flat">
                  Dinner with friends
                </Chip>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section
        className="bg-content2/50 px-4 py-20 sm:px-6 lg:px-8"
        id="features"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Intelligent Financial Tracking
            </h2>
            <p className="text-default-600 mx-auto mt-4 max-w-2xl">
              Not another spreadsheet. ExpenseCal is a powerful financial
              forecasting tool that understands your money — powered by Gemini 3
              AI from Google.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-divider bg-content1 border">
              <CardHeader className="flex gap-3">
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Bot className="text-primary h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <p className="text-lg font-semibold">Gemini 3 AI Parsing</p>
                  <p className="text-small text-default-500">
                    Text, images, PDFs & CSV
                  </p>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-default-600">
                  Powered by Google&apos;s Gemini 3 AI. Type naturally, upload
                  bank statements, snap photos of receipts, or import CSV files
                  — it extracts everything automatically.
                </p>
              </CardBody>
            </Card>

            <Card className="border-divider bg-content1 border">
              <CardHeader className="flex gap-3">
                <div className="bg-success/10 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Coins className="text-success h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <p className="text-lg font-semibold">Multi-Currency</p>
                  <p className="text-small text-default-500">
                    Global finance support
                  </p>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-default-600">
                  All major FIAT and crypto currencies — USD, EUR, MXN, BTC,
                  ETH, and more. Exchange rates calculated for each of your
                  assets automatically.
                </p>
              </CardBody>
            </Card>

            <Card className="border-divider bg-content1 border">
              <CardHeader className="flex gap-3">
                <div className="bg-warning/10 flex h-12 w-12 items-center justify-center rounded-xl">
                  <CreditCard className="text-warning h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <p className="text-lg font-semibold">Installments</p>
                  <p className="text-small text-default-500">
                    Split payments automatically
                  </p>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-default-600">
                  &quot;12000 euros in 10 monthly installments&quot; creates 10
                  calendar events linked to a parent purchase.
                </p>
              </CardBody>
            </Card>

            <Card className="border-divider bg-content1 border">
              <CardHeader className="flex gap-3">
                <div className="bg-secondary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Repeat className="text-secondary h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <p className="text-lg font-semibold">Recurring Payments</p>
                  <p className="text-small text-default-500">
                    Weekly, monthly, quarterly
                  </p>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-default-600">
                  Set up recurring expenses like rent, subscriptions, or gym
                  memberships with simple language.
                </p>
              </CardBody>
            </Card>

            <Card className="border-divider bg-content1 border">
              <CardHeader className="flex gap-3">
                <div className="bg-danger/10 flex h-12 w-12 items-center justify-center rounded-xl">
                  <LineChart className="text-danger h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <p className="text-lg font-semibold">Financial Forecasting</p>
                  <p className="text-small text-default-500">
                    See your future balance
                  </p>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-default-600">
                  Know your wealth across time to make better decisions. See
                  exactly where your money will be weeks or months from now.
                </p>
              </CardBody>
            </Card>

            <Card className="border-divider bg-content1 border">
              <CardHeader className="flex gap-3">
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Palette className="text-primary h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <p className="text-lg font-semibold">Make It Your Own</p>
                  <p className="text-small text-default-500">11 color themes</p>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-default-600">
                  Choose from 11 stunning themes — Lavender, Cyberpunk, Ocean,
                  Sunset, and more. Financial tools should match your
                  personality.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      {/* Examples Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Just Type Naturally
            </h2>
            <p className="text-default-600 mx-auto mt-4 max-w-2xl">
              ExpenseCal understands how you naturally describe finances
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                input: "5 coffees at 3 EUR each this morning",
                parsed: "3 EUR × 5 • Today",
                icon: <PiggyBank className="h-4 w-4" />,
              },
              {
                input: "Received 5000 dollars salary today",
                parsed: "5000 USD income • Today",
                icon: <Wallet className="h-4 w-4" />,
              },
              {
                input: "Monthly rent of 1500 USD starting today",
                parsed: "1500 USD • Monthly recurring",
                icon: <Home className="h-4 w-4" />,
              },
              {
                input: "500 GBP for groceries last week",
                parsed: "500 GBP • 7 days ago",
                icon: <Package className="h-4 w-4" />,
              },
              {
                input: "Weekly gym membership 25 CHF",
                parsed: "25 CHF • Weekly recurring",
                icon: <Repeat className="h-4 w-4" />,
              },
              {
                input: "50 USD quarterly insurance for 3 years",
                parsed: "50 USD • Quarterly × 12",
                icon: <Calendar className="h-4 w-4" />,
              },
            ].map((example, index) => (
              <div
                key={index}
                className="border-divider bg-content1 rounded-xl border p-4"
              >
                <p className="text-default-700 font-mono text-sm">
                  &quot;{example.input}&quot;
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="bg-success/10 text-success flex h-6 w-6 items-center justify-center rounded-full">
                    {example.icon}
                  </div>
                  <span className="text-success text-sm">{example.parsed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gemini 3 AI Showcase Section */}
      <section className="from-primary/5 via-background to-secondary/5 bg-gradient-to-r px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Chip
                className="mb-4"
                color="primary"
                startContent={<Sparkles className="h-3 w-3" />}
                variant="flat"
              >
                Powered by Google
              </Chip>
              <h2 className="text-3xl font-bold sm:text-4xl">
                Gemini 3 AI Does the Heavy Lifting
              </h2>
              <p className="text-default-600 mt-4 text-lg">
                Intelligently and seamlessly parse all kinds of content. Gemini
                3 AI from Google processes your financial data with unmatched
                accuracy — no forms, no dropdowns, no manual entry.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <MessageSquare className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Natural Language</p>
                    <p className="text-default-600 text-sm">
                      &quot;100 USD for yesterday&apos;s dinner&quot; — amounts,
                      dates, currencies, installments, and recurrence parsed
                      instantly.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-success/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <ImageIcon className="text-success h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Images & Photos</p>
                    <p className="text-default-600 text-sm">
                      Snap a photo of a receipt or screenshot a transaction.
                      Gemini 3 reads and extracts every line item.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-warning/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <FileText className="text-warning h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">PDFs & Bank Statements</p>
                    <p className="text-default-600 text-sm">
                      Upload a bank statement PDF and watch dozens of
                      transactions appear in your calendar — categorized and
                      dated.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-secondary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <ScanText className="text-secondary h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">CSV & Spreadsheets</p>
                    <p className="text-default-600 text-sm">
                      Import CSV exports from any bank or financial app.
                      Automatic column mapping and bulk event creation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-divider bg-content1 rounded-2xl border p-6 shadow-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="from-primary to-secondary flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Gemini 3 AI</p>
                  <p className="text-default-500 text-sm">
                    Google&apos;s most capable model
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="border-divider rounded-xl border border-dashed p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="text-primary h-4 w-4" />
                    <p className="text-default-500 text-xs font-medium uppercase">
                      Text Input
                    </p>
                  </div>
                  <p className="mt-2 font-mono text-sm">
                    &quot;12000 euros in 10 monthly installments for a new
                    guitar&quot;
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Chip color="success" size="sm" variant="flat">
                      1200 EUR × 10
                    </Chip>
                    <Chip color="warning" size="sm" variant="flat">
                      Monthly
                    </Chip>
                  </div>
                </div>
                <div className="border-divider rounded-xl border border-dashed p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="text-warning h-4 w-4" />
                    <p className="text-default-500 text-xs font-medium uppercase">
                      PDF Upload
                    </p>
                  </div>
                  <p className="mt-2 font-mono text-sm">
                    bank_statement_jan.pdf
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Chip color="success" size="sm" variant="flat">
                      47 transactions found
                    </Chip>
                    <Chip color="secondary" size="sm" variant="flat">
                      Auto-categorized
                    </Chip>
                  </div>
                </div>
                <div className="border-divider rounded-xl border border-dashed p-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="text-success h-4 w-4" />
                    <p className="text-default-500 text-xs font-medium uppercase">
                      Image Scan
                    </p>
                  </div>
                  <p className="mt-2 font-mono text-sm">receipt_photo.jpg</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Chip color="success" size="sm" variant="flat">
                      $43.50
                    </Chip>
                    <Chip color="warning" size="sm" variant="flat">
                      Feb 5, 2026
                    </Chip>
                    <Chip color="secondary" size="sm" variant="flat">
                      Restaurant
                    </Chip>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Inventory Feature Section */}
      <section
        className="from-content2/50 to-background bg-gradient-to-b px-4 py-20 sm:px-6 lg:px-8"
        id="inventory"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl">
                Know Your True Net Worth
              </h2>
              <p className="text-default-600 mt-4 text-lg">
                ExpenseCal tracks cash flow. The Inventory module tracks what
                you <em>own</em>. Combined, you get the complete picture.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-secondary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <Sparkles className="text-secondary h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">AI-Powered Valuation</p>
                    <p className="text-default-600 text-sm">
                      Just describe your items. Our AI searches marketplaces to
                      estimate current values.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-success/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <TrendingUp className="text-success h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Track Appreciation</p>
                    <p className="text-default-600 text-sm">
                      See which assets are gaining value. Get alerts when
                      it&apos;s a good time to sell.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-warning/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <Package className="text-warning h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Insurance Ready</p>
                    <p className="text-default-600 text-sm">
                      Generate inventory reports for insurance claims with
                      photos and valuations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-divider bg-content1 rounded-2xl border p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Your Net Worth</h3>
                <Chip color="success" size="sm" variant="flat">
                  +1.9% this month
                </Chip>
              </div>
              <p className="text-4xl font-bold">$127,450</p>
              <Divider className="my-4" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="text-primary h-4 w-4" />
                    <span className="text-sm">Cash Flow Balance</span>
                  </div>
                  <span className="font-medium">$12,450</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Guitar className="text-secondary h-4 w-4" />
                    <span className="text-sm">Music Gear</span>
                  </div>
                  <span className="font-medium">$45,000</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Watch className="text-warning h-4 w-4" />
                    <span className="text-sm">Watches</span>
                  </div>
                  <span className="font-medium">$35,000</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gem className="text-danger h-4 w-4" />
                    <span className="text-sm">Art & Antiques</span>
                  </div>
                  <span className="font-medium">$27,000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Examples */}
          <div className="mt-16">
            <h3 className="mb-8 text-center text-xl font-semibold">
              Describe Your Assets Naturally
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                "1965 Fender Stratocaster sunburst, bought in 2018 for $12,000",
                "Vintage Rolex Submariner from grandfather",
                "MacBook Pro M3 Max, purchased last month",
                "Eames lounge chair, original Herman Miller",
              ].map((example, index) => (
                <div
                  key={index}
                  className="border-divider bg-content2/50 rounded-xl border border-dashed p-4"
                >
                  <p className="text-default-600 text-sm">
                    &quot;{example}&quot;
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recurring & Installments Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8" id="scheduling">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Recurring Payments & Installments
            </h2>
            <p className="text-default-600 mx-auto mt-4 max-w-2xl">
              Real finances aren&apos;t one-off transactions. ExpenseCal handles
              the schedules that shape your budget.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="border-divider bg-content1 rounded-2xl border p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="bg-secondary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Repeat className="text-secondary h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Recurring Instances</p>
                  <p className="text-default-500 text-sm">
                    Weekly, monthly, quarterly, yearly
                  </p>
                </div>
              </div>
              <p className="text-default-600 mb-6">
                Say it once and it repeats. Rent, subscriptions, salary,
                insurance — set the frequency and let ExpenseCal project them
                into the future.
              </p>
              <div className="space-y-3">
                {[
                  {
                    input: "Monthly rent of 1500 USD starting today",
                    result: "1500 USD • Every month",
                  },
                  {
                    input: "Weekly gym membership 25 CHF",
                    result: "25 CHF • Every week",
                  },
                  {
                    input: "50 USD quarterly insurance for 3 years",
                    result: "50 USD • Every 3 months × 12",
                  },
                ].map((example, index) => (
                  <div
                    key={index}
                    className="border-divider rounded-lg border border-dashed p-3"
                  >
                    <p className="text-default-700 font-mono text-sm">
                      &quot;{example.input}&quot;
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Chip color="success" size="sm" variant="flat">
                        {example.result}
                      </Chip>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-divider bg-content1 rounded-2xl border p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="bg-warning/10 flex h-12 w-12 items-center justify-center rounded-xl">
                  <CreditCard className="text-warning h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Installment Plans</p>
                  <p className="text-default-500 text-sm">
                    Split purchases across months
                  </p>
                </div>
              </div>
              <p className="text-default-600 mb-6">
                Big purchase? Just describe the installment plan. ExpenseCal
                creates linked events for each payment, all tied to a parent
                purchase so you never lose track.
              </p>
              <div className="space-y-3">
                {[
                  {
                    input:
                      "12000 euros in 10 monthly installments for a new guitar",
                    result: "1200 EUR × 10 months",
                  },
                  {
                    input: "iPhone 1200 USD in 24 installments",
                    result: "50 USD × 24 months",
                  },
                  {
                    input: "Furniture 3000 GBP in 6 payments",
                    result: "500 GBP × 6 months",
                  },
                ].map((example, index) => (
                  <div
                    key={index}
                    className="border-divider rounded-lg border border-dashed p-3"
                  >
                    <p className="text-default-700 font-mono text-sm">
                      &quot;{example.input}&quot;
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Chip color="warning" size="sm" variant="flat">
                        {example.result}
                      </Chip>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Themes Section */}
      <section className="bg-content2/50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="bg-primary/10 mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full">
            <Palette className="text-primary h-7 w-7" />
          </div>
          <h2 className="text-3xl font-bold sm:text-4xl">Make It Your Own</h2>
          <p className="text-default-600 mx-auto mt-4 max-w-2xl text-lg">
            Choose from 11 stunning color themes to match your personality.
            Financial tools are cool — they should look the part.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {[
              { name: "Lavender", color: "bg-purple-400" },
              { name: "Cyberpunk", color: "bg-fuchsia-500" },
              { name: "Ocean", color: "bg-cyan-500" },
              { name: "Sunset", color: "bg-orange-500" },
              { name: "Forest", color: "bg-emerald-600" },
              { name: "Rose", color: "bg-rose-500" },
              { name: "Mocha", color: "bg-amber-700" },
              { name: "Nord", color: "bg-sky-400" },
              { name: "Purple", color: "bg-violet-600" },
              { name: "Light", color: "bg-gray-200" },
              { name: "Dark", color: "bg-gray-800" },
            ].map((theme) => (
              <div
                key={theme.name}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className={`${theme.color} h-10 w-10 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110`}
                />
                <span className="text-default-500 text-xs">{theme.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="from-primary to-secondary mx-auto max-w-4xl rounded-3xl bg-gradient-to-r p-8 text-center text-white sm:p-12">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The Future of Financial Intelligence
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Expense tracking, inventory valuation, and financial forecasting —
            all powered by Gemini 3 AI. Know your wealth across time.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              as={NextLink}
              className="text-primary w-full bg-white hover:bg-white/90 sm:w-auto"
              endContent={<ArrowRight className="h-4 w-4" />}
              href={user ? routes.table.index() : routes.handler.signUp()}
              size="lg"
            >
              {user ? "Go to App" : "Get Started Free"}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-divider border-t px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
                <Calculator className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold">ExpenseCal</span>
            </div>
            <p className="text-default-500 text-sm">
              The future of expense tracking, inventory valuation & financial
              forecasting — powered by Gemini 3 AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
