"use client";

import { createTimeline, stagger, utils } from "animejs";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import { StaggerLoadingAnimationProps } from "./StaggerLoadingAnimation.types";

const GRID_SIZE = 17;
const TOTAL_ELEMENTS = GRID_SIZE * GRID_SIZE;
const GRID = [GRID_SIZE, GRID_SIZE];

export const StaggerLoadingAnimation: React.FC<
  StaggerLoadingAnimationProps
> = ({ children, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const visualizerRef = useRef<HTMLDivElement>(null);

  // Initialize grid and animation
  useEffect(() => {
    if (!visualizerRef.current || !containerRef.current) return;

    // Create grid elements
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < TOTAL_ELEMENTS; i++) {
      const div = document.createElement("div");
      div.className = clsx(
        "w-[1rem]",
        "h-[1rem]",
        "border",
        "border-white",
        "bg-white",
      );
      fragment.appendChild(div);
    }
    visualizerRef.current.appendChild(fragment);

    // Create the animation timeline
    const staggersAnimation = createTimeline({
      delay: stagger(50),
      loop: true,
      autoplay: false,
    });

    staggersAnimation
      .add("#stagger-visualizer div", {
        ease: "easeInOutSine",
        translateX: [
          {
            value: stagger("-.1rem", {
              grid: GRID,
              from: "center",
              axis: "x",
            }),
          },
          {
            value: stagger(".1rem", {
              grid: GRID,
              from: "center",
              axis: "x",
            }),
          },
        ],
        translateY: [
          {
            value: stagger("-.1rem", {
              grid: GRID,
              from: "center",
              axis: "y",
            }),
          },
          {
            value: stagger(".1rem", {
              grid: GRID,
              from: "center",
              axis: "y",
            }),
          },
        ],
        duration: 1000,
        scale: 0.5,
        delay: stagger(100, { grid: GRID, from: "center" }),
      })
      .add("#stagger-visualizer div", {
        translateX: () => utils.random(-10, 10),
        translateY: () => utils.random(-10, 10),
        delay: stagger(8, { from: "last" }),
      })
      .add("#stagger-visualizer div", {
        translateX: stagger(".25rem", {
          grid: GRID,
          from: "center",
          axis: "x",
        }),
        translateY: stagger(".25rem", {
          grid: GRID,
          from: "center",
          axis: "y",
        }),
        rotate: 0,
        scaleX: 2.5,
        scaleY: 0.25,
        delay: stagger(4, { from: "center" }),
      })
      .add("#stagger-visualizer div", {
        rotate: stagger([90, 0], { grid: GRID, from: "center" }),
        delay: stagger(50, { grid: GRID, from: "center" }),
      })
      .add("#stagger-visualizer div", {
        translateX: 0,
        translateY: 0,
        scale: 0.5,
        scaleX: 1,
        rotate: 180,
        duration: 1000,
        delay: stagger(100, { grid: GRID, from: "center" }),
      })
      .add("#stagger-visualizer div", {
        scaleY: 1,
        scale: 1,
        delay: stagger(20, { grid: GRID, from: "center" }),
      });

    staggersAnimation.play();

    return () => {
      staggersAnimation.pause();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={clsx(
        "flex h-full w-full flex-wrap items-center justify-center",
        className,
      )}
    >
      <div
        ref={visualizerRef}
        id="stagger-visualizer"
        className="flex h-[17rem] w-[17rem] flex-wrap items-center justify-center"
      />
    </div>
  );
};
