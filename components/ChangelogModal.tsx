"use client";
import { useEffect, useState } from "react";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

const SEEN_KEY = "changelog_seen_version";

export function ChangelogModal() {
  const [visible, setVisible] = useState(false);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [latest, setLatest] = useState<ChangelogEntry | null>(null);

  useEffect(() => {
    fetch("/changelog.json")
      .then((r) => r.json())
      .then((data: ChangelogEntry[]) => {
        setChangelog(data);
        if (data.length > 0) {
          const seen = localStorage.getItem(SEEN_KEY);
          if (seen !== data[0].version) {
            setLatest(data[0]);
            setVisible(true);
          }
        }
      })
      .catch(() => { /* changelog.json not available */ });
  }, []);

  function dismiss() {
    setVisible(false);
    if (latest) {
      localStorage.setItem(SEEN_KEY, latest.version);
    }
  }

  if (!visible || !latest) return null;

  return (
    <div className="modal-overlay" onClick={dismiss}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>🎉 {latest.title}</h2>
        <p style={{ color: "var(--muted)", fontSize: 12 }}>版本 {latest.version} · {latest.date}</p>

        <div className="changelog-list">
          {changelog.map((entry) => (
            <div key={entry.version} className="cl-item">
              <div className="cl-version">{entry.version}</div>
              <div className="cl-text">{entry.title}</div>
              <ul style={{ fontSize: 12, color: "var(--muted)", paddingLeft: 18, margin: "4px 0" }}>
                {entry.changes.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <button className="btn btn-primary btn-full" onClick={dismiss} style={{ marginTop: 12 }}>
          知道了
        </button>
      </div>
    </div>
  );
}
