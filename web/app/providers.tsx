"use client";

import type { ThemeProviderProps } from "next-themes";

import { CalendarContextController } from "@/context/Calendar/CalendarContextController";
import { CurrencyContextController } from "@/context/Currency/CurrencyContextController";
import { EventEditModalContextController } from "@/context/EventEditModal/EventEditModalContext";
import { EventsContextController } from "@/context/Events/EventsContextController";
import { HeroUIProvider } from "@heroui/system";
import { ToastProvider } from "@heroui/toast";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/navigation";
import * as React from "react";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <ToastProvider />
      <NextThemesProvider {...themeProps}>
        <CalendarContextController>
          <EventEditModalContextController>
            <EventsContextController>
              <CurrencyContextController>{children}</CurrencyContextController>
            </EventsContextController>
          </EventEditModalContextController>
        </CalendarContextController>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
