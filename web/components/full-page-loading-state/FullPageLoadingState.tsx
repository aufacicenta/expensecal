import { StaggerLoadingAnimation } from "../stagger-loading-animation/StaggerLoadingAnimation";

export const FullPageLoadingState = () => (
  <section className="bg-background/70 fixed top-0 right-0 bottom-0 left-0 z-[1000] h-screen w-screen">
    <nav className="absolute top-0 right-0 left-0 flex w-full justify-between [&>div]:p-4">
      <div>
        <span className="font-mono">ExpenseCal</span>
      </div>
      <div>
        <span className="font-mono">Loading...</span>
      </div>
    </nav>
    <StaggerLoadingAnimation />
  </section>
);
