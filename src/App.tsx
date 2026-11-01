import { useState, type ReactElement } from "react";
import { useData } from "./useData";
import { useInstallPrompt } from "./useInstallPrompt";
import Today from "./screens/Today";
import History from "./screens/History";
import Settings from "./screens/Settings";

type Tab = "today" | "history" | "settings";

const icons: Record<Tab, ReactElement> = {
  today: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v4.5l3 2" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  ),
};
const labels: Record<Tab, string> = { today: "Today", history: "History", settings: "Settings" };

export default function App() {
  const api = useData();
  const install = useInstallPrompt();
  const [tab, setTab] = useState<Tab>("today");
  const [scrollToInstall, setScrollToInstall] = useState(false);

  return (
    <div className="app">
      {tab === "today" && (
        <Today
          api={api}
          onShowInstall={() => {
            setScrollToInstall(true);
            setTab("settings");
          }}
        />
      )}
      {tab === "history" && <History api={api} />}
      {tab === "settings" && (
        <Settings api={api} install={install} scrollToInstall={scrollToInstall} onScrolled={() => setScrollToInstall(false)} />
      )}
      <nav className="tabbar" role="tablist" aria-label="Sections">
        {(Object.keys(labels) as Tab[]).map((t) => (
          <button key={t} className="tab" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {icons[t]}
            {labels[t]}
          </button>
        ))}
      </nav>
    </div>
  );
}
