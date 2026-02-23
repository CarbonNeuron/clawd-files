"use client";

import { useState, useRef, type ReactNode, type KeyboardEvent } from "react";

interface Tab {
  value: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultValue: string;
  className?: string;
}

export function Tabs({ tabs, defaultValue, className }: TabsProps) {
  const [active, setActive] = useState(defaultValue);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent, idx: number) => {
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    setActive(tabs[next].value);
    refs.current[next]?.focus();
  };

  const panel = tabs.find((t) => t.value === active);

  return (
    <div className={className}>
      <div role="tablist" className="flex border-b border-border">
        {tabs.map((tab, i) => (
          <button
            key={tab.value}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            id={`tab-${tab.value}`}
            aria-selected={active === tab.value}
            aria-controls={`panel-${tab.value}`}
            tabIndex={active === tab.value ? 0 : -1}
            className={`px-3 py-2 font-code text-xs transition-colors ${
              active === tab.value
                ? "border-b-2 border-accent text-accent -mb-px"
                : "text-text-muted hover:text-text"
            }`}
            onClick={() => setActive(tab.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {panel && (
        <div
          role="tabpanel"
          id={`panel-${panel.value}`}
          aria-labelledby={`tab-${panel.value}`}
          className="mt-4"
        >
          {panel.content}
        </div>
      )}
    </div>
  );
}
