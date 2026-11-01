import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { setTarget, setTimeZone, type Data } from "../days";
import { exportFilename, parseImport, serialize } from "../storage";
import { browserTimeZone, type DataApi } from "../useData";

const MIN = 1, MAX = 2000;

function useFlash(): [string, (msg: string) => void] {
  const [msg, setMsg] = useState("");
  const timer = useRef<number>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [
    msg,
    (m: string) => {
      setMsg(m);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setMsg(""), 2500);
    },
  ];
}

function timeZones(current: string): string[] {
  let zones: string[] = [];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    // Older browsers: only offer the current zone and UTC.
  }
  for (const z of ["UTC", current]) if (!zones.includes(z)) zones.unshift(z);
  return zones;
}

type Props = { api: DataApi; install: (() => Promise<void>) | null; scrollToInstall: boolean; onScrolled: () => void };

export default function Settings({ api, install, scrollToInstall, onScrolled }: Props) {
  const { data, update, replace, reset } = api;
  const [targetText, setTargetText] = useState(String(data.settings.target));
  const [targetMsg, flashTarget] = useFlash();
  const [tzMsg, flashTz] = useFlash();
  const [dataMsg, flashData] = useFlash();
  const [importError, setImportError] = useState("");
  const [pendingImport, setPendingImport] = useState<{ name: string; data: Data } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const installRef = useRef<HTMLDivElement>(null);
  const detected = browserTimeZone();

  useEffect(() => setTargetText(String(data.settings.target)), [data.settings.target]);

  useEffect(() => {
    if (scrollToInstall) {
      installRef.current?.scrollIntoView?.({ block: "start" });
      onScrolled();
    }
  }, [scrollToInstall, onScrolled]);

  const commitTarget = (value: number) => {
    const v = Math.max(MIN, Math.min(MAX, Math.round(value)));
    if (Number.isNaN(v)) {
      setTargetText(String(data.settings.target));
      return;
    }
    setTargetText(String(v));
    if (v !== data.settings.target) {
      update((d, n) => setTarget(d, v, n));
      flashTarget(`Saved. Today's target is now ${v}.`);
    }
  };

  const doExport = () => {
    const blob = new Blob([serialize(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename(data, new Date());
    a.click();
    URL.revokeObjectURL(url);
    flashData(`Exported ${a.download}.`);
  };

  const pickImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setConfirmReset(false);
    const result = parseImport(await file.text());
    if (result.ok) {
      setImportError("");
      setPendingImport({ name: file.name, data: result.data });
    } else {
      setPendingImport(null);
      setImportError(`Couldn't import ${file.name}. ${result.error}`);
    }
  };

  return (
    <section className="screen" aria-label="Settings">
      <header className="topbar">
        <div><h1>Settings</h1></div>
      </header>

      <div className="field">
        <label htmlFor="targetInput">Daily target</label>
        <div className="stepper">
          <button type="button" aria-label="Decrease target by 5" onClick={() => commitTarget(data.settings.target - 5)}>−</button>
          <input
            id="targetInput"
            type="number"
            inputMode="numeric"
            min={MIN}
            max={MAX}
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            onBlur={() => commitTarget(parseInt(targetText, 10))}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
          <button type="button" aria-label="Increase target by 5" onClick={() => commitTarget(data.settings.target + 5)}>+</button>
        </div>
        <p className="hint">Applies to today right away and to future days. Past days keep the target they had.</p>
        <div className="saved" role="status">{targetMsg}</div>
      </div>

      <div className="field">
        <label htmlFor="tzSelect">Timezone</label>
        <select
          id="tzSelect"
          value={data.settings.timeZone}
          onChange={(e) => {
            const tz = e.target.value;
            update((d) => setTimeZone(d, tz));
            flashTz("Saved. Sets you've already logged stay on their day.");
          }}
        >
          {timeZones(data.settings.timeZone).map((z) => (
            <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
          ))}
        </select>
        <p className="hint">Your day resets at midnight in this timezone. Detected from your browser: {detected}.</p>
        <div className="saved" role="status">{tzMsg}</div>
      </div>

      <div className="field" ref={installRef}>
        <label>Install on your phone</label>
        <p className="hint">Dunnit works offline once installed and opens like a normal app.</p>
        <p className="hint strong">iPhone (Safari)</p>
        <ol className="steps"><li>Tap the <b>Share</b> button.</li><li>Choose <b>Add to Home Screen</b>.</li></ol>
        <p className="hint strong">Android (Chrome)</p>
        <ol className="steps"><li>Tap the <b>⋮</b> menu.</li><li>Choose <b>Install app</b>.</li></ol>
        {install && (
          <div className="btn-row"><button className="btn" onClick={install}>Install now</button></div>
        )}
      </div>

      <div className="field">
        <label>Your data</label>
        <p className="hint">All data is stored on this device only. Export a backup to move it to another device.</p>
        <div className="btn-row">
          <button className="btn" onClick={doExport}>Export</button>
          <label className="btn" htmlFor="importFile">Import</label>
          <input type="file" id="importFile" accept="application/json,.json" hidden onChange={pickImport} />
          <button className="btn danger" onClick={() => { setConfirmReset(true); setPendingImport(null); setImportError(""); }}>Reset</button>
        </div>
        {importError && <p className="error" role="alert">{importError}</p>}
        {pendingImport && (
          <div className="confirm">
            <span>Replace all data on this device with the contents of {pendingImport.name}?</span>
            <div className="btn-row">
              <button
                className="btn solid-danger"
                onClick={() => {
                  replace(pendingImport.data);
                  setPendingImport(null);
                  flashData("Imported.");
                }}
              >
                Replace my data
              </button>
              <button className="btn" onClick={() => setPendingImport(null)}>Cancel</button>
            </div>
          </div>
        )}
        {confirmReset && (
          <div className="confirm">
            <span>Delete all sets, history and settings on this device? This can't be undone.</span>
            <div className="btn-row">
              <button
                className="btn solid-danger"
                onClick={() => {
                  reset();
                  setConfirmReset(false);
                  flashData("All data deleted.");
                }}
              >
                Delete everything
              </button>
              <button className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
            </div>
          </div>
        )}
        <div className="saved" role="status">{dataMsg}</div>
      </div>
    </section>
  );
}
