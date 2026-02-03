export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "ExpenseCal",
  description:
    "AI-powered financial tracking with natural language. Track expenses, income, installments, and inventory with simple sentences.",
  navItems: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Calendar",
      href: "/calendar",
    },
    {
      label: "Table",
      href: "/table",
    },
  ],
  navMenuItems: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Calendar",
      href: "/calendar",
    },
    {
      label: "Table",
      href: "/table",
    },
    {
      label: "Sign Out",
      href: "/handler/sign-out",
    },
  ],
  links: {
    github: "https://github.com/aufacicenta/expensecal",
    twitter: "https://twitter.com/expensecal",
    docs: "https://expensecal.com/docs",
    discord: "https://discord.gg/expensecal",
    sponsor: "https://github.com/sponsors/aufacicenta",
  },
};
