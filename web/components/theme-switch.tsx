"use client";

import { SwitchProps, useSwitch } from "@heroui/switch";
import { useIsSSR } from "@react-aria/ssr";
import { VisuallyHidden } from "@react-aria/visually-hidden";
import clsx from "clsx";
import { useTheme } from "next-themes";
import { FC } from "react";
import {
  Moon,
  Sun,
  Sparkles,
  Waves,
  TreePine,
  Sunset,
  Flower2,
  Zap,
  Coffee,
  Snowflake,
  Heart,
} from "lucide-react";

import { THEMES, ThemeName } from "@/config/themes";

// Icons for each theme
const THEME_ICONS: Record<ThemeName, React.ReactNode> = {
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
  purple: <Sparkles size={16} />,
  ocean: <Waves size={16} />,
  forest: <TreePine size={16} />,
  sunset: <Sunset size={16} />,
  lavender: <Flower2 size={16} />,
  cyberpunk: <Zap size={16} />,
  mocha: <Coffee size={16} />,
  nord: <Snowflake size={16} />,
  rose: <Heart size={16} />,
};

// Labels for each theme
const THEME_LABELS: Record<ThemeName, string> = {
  light: "Light",
  dark: "Dark",
  purple: "Purple Dream",
  ocean: "Ocean",
  forest: "Forest",
  sunset: "Sunset",
  lavender: "Lavender",
  cyberpunk: "Cyberpunk",
  mocha: "Mocha",
  nord: "Nord",
  rose: "Rose",
};

export interface ThemeSwitchProps {
  className?: string;
  classNames?: SwitchProps["classNames"];
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({
  className,
  classNames,
}) => {
  const { theme, setTheme } = useTheme();
  const isSSR = useIsSSR();

  // Get current theme index, default to 0 (light) if not found
  const currentTheme = (theme as ThemeName) || "light";
  const currentIndex = THEMES.indexOf(currentTheme);
  const validIndex = currentIndex === -1 ? 0 : currentIndex;

  // Get next theme in cycle
  const nextIndex = (validIndex + 1) % THEMES.length;
  const nextTheme = THEMES[nextIndex];

  const onChange = () => {
    setTheme(nextTheme);
  };

  const { Component, slots, getBaseProps, getInputProps, getWrapperProps } =
    useSwitch({
      isSelected: !isSSR,
      "aria-label": `Current theme: ${THEME_LABELS[currentTheme]}. Switch to ${THEME_LABELS[nextTheme]}`,
      onChange,
    });

  // Get the icon for current theme
  const currentIcon = isSSR ? THEME_ICONS.light : THEME_ICONS[currentTheme];

  return (
    <Component
      {...getBaseProps({
        className: clsx(
          "px-px transition-opacity hover:opacity-80 cursor-pointer",
          className,
          classNames?.base,
        ),
      })}
      title={`${THEME_LABELS[currentTheme]} - Click to switch to ${THEME_LABELS[nextTheme]}`}
    >
      <VisuallyHidden>
        <input {...getInputProps()} />
      </VisuallyHidden>
      <div
        {...getWrapperProps()}
        className={slots.wrapper({
          class: clsx(
            [
              "h-auto w-auto",
              "bg-transparent",
              "rounded-lg",
              "flex items-center justify-center",
              "group-data-[selected=true]:bg-transparent",
              "!text-default-500",
              "pt-px",
              "px-0",
              "mx-0",
            ],
            classNames?.wrapper,
          ),
        })}
      >
        {currentIcon}
      </div>
    </Component>
  );
};
