import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Globe,
  Search,
  MousePointerClick,
  ArrowDown,
  ArrowUp,
} from "lucide-react";

// The browser tool wraps every page payload in these markers so the model treats
// the page as untrusted data. They are noise in the UI, so strip them for display.
const UNTRUSTED_MARKERS = /<<<\/?(?:END_)?UNTRUSTED_WEB_CONTENT>>>\n?/g;

const clean = (value) => (typeof value === "string" ? value.replace(UNTRUSTED_MARKERS, "").trim() : "");

export const isBrowserTool = (name) => /browser/i.test(name || "");

const getHost = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "";
  }
};

const absoluteUrl = (href, base) => {
  if (!href || href.startsWith("javascript:") || href.startsWith("#")) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
};

/* Turn the tool args into a one-line human description of what the agent is doing. */
const describeAction = (args = {}) => {
  const { action, url, text, ref, direction, key } = args;
  switch (action) {
    case "navigate":
      return { icon: Globe, label: `Opening ${getHost(url) || url}` };
    case "type":
      return {
        icon: Search,
        label: key === "Enter" ? `Searching for “${text}”` : `Typing “${text}”`,
      };
    case "click":
      return { icon: MousePointerClick, label: `Clicking ${text || ref || "element"}` };
    case "scroll":
      return { icon: direction === "up" ? ArrowUp : ArrowDown, label: `Scrolling ${direction || "down"}` };
    default:
      return { icon: Globe, label: action ? `Browser: ${action}` : "Browsing" };
  }
};

/*
 * The snapshot is an accessibility tree, not HTML. Pull out the links that carry a
 * heading (search results, articles) so the card can show something readable instead
 * of a wall of YAML.
 */
const extractLinks = (snapshot, baseUrl) => {
  if (!snapshot) return [];
  const lines = snapshot.split("\n");
  const results = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const linkMatch = lines[i].match(/^\s*-\s+link\s+"([^"]+)"\s*(?:\[e\d+\])?:?\s*$/);
    if (!linkMatch) continue;
    const title = linkMatch[1].trim();
    // The /url: line follows the link node, indented one level deeper.
    const urlLine = lines[i + 1]?.match(/^\s*-\s+\/url:\s*(.+)$/);
    const href = absoluteUrl(urlLine?.[1]?.trim(), baseUrl);
    if (!href) continue;
    // Skip chrome: nav links, shortcuts and other boilerplate are short and repetitive.
    if (title.length < 12) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    results.push({ title, href });
  }
  return results;
};

function FaviconOrLetter({ url }) {
  const [failed, setFailed] = useState(false);
  const host = getHost(url);
  if (!host) return <Globe className="h-3.5 w-3.5 text-base-content/50 shrink-0" />;
  if (failed) {
    return (
      <span className="h-3.5 w-3.5 shrink-0 rounded-sm bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center uppercase">
        {host[0]}
      </span>
    );
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
      alt=""
      className="h-3.5 w-3.5 shrink-0 rounded-sm"
      onError={() => setFailed(true)}
    />
  );
}

/* Fake browser chrome so a page visit reads as a page visit at a glance. */
function AddressBar({ url, title }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-base-300/40 border-b border-base-300">
      <span className="flex gap-1 shrink-0">
        <span className="h-2 w-2 rounded-full bg-error/50" />
        <span className="h-2 w-2 rounded-full bg-warning/50" />
        <span className="h-2 w-2 rounded-full bg-success/50" />
      </span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-base-100 rounded-full px-2 py-0.5">
        <FaviconOrLetter url={url} />
        <span className="truncate text-[11px] text-base-content/70">{title || url}</span>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-base-content/50 hover:text-primary"
          title="Open in new tab"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function BrowserHandoffPreview({ handoff }) {
  return (
    <div className="rounded-lg border border-base-300 bg-base-200 text-xs overflow-hidden">
      <AddressBar url={handoff.liveUrl} title="Live browser session" />
      {handoff.message && (
        <div className="px-3 py-2 border-b border-base-300 bg-base-100 text-base-content/80">{handoff.message}</div>
      )}
      <iframe
        src={handoff.liveUrl}
        title="Live browser session"
        className="w-full h-80 border-0"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
      />
      <a
        href={handoff.liveUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] text-primary hover:underline border-t border-base-300"
      >
        <ExternalLink className="h-3 w-3" />
        Open live browser in new tab
      </a>
    </div>
  );
}

export default function BrowserToolPreview({ toolCall, isActiveHandoff }) {
  const [showRaw, setShowRaw] = useState(false);
  const [open, setOpen] = useState(true);
  const isCalling = toolCall.status !== "done";

  // Collapse down to just the address-bar preview once the page result has arrived.
  useEffect(() => {
    if (!isCalling) setOpen(false);
  }, [isCalling]);

  const parsed = useMemo(() => {
    if (!toolCall.result) return null;
    try {
      return typeof toolCall.result === "string" ? JSON.parse(toolCall.result) : toolCall.result;
    } catch {
      return null;
    }
  }, [toolCall.result]);

  const handoff = toolCall.handoff?.liveUrl
    ? toolCall.handoff
    : parsed?.live_url
      ? { liveUrl: parsed.live_url, message: parsed.message }
      : null;

  const pageUrl = parsed?.url || toolCall.args?.url || "";
  const pageTitle = clean(parsed?.title) || getHost(pageUrl);
  const snapshot = clean(parsed?.snapshot);
  const links = useMemo(() => extractLinks(snapshot, pageUrl).slice(0, 6), [snapshot, pageUrl]);

  if (handoff && isActiveHandoff) {
    return <BrowserHandoffPreview handoff={handoff} />;
  }

  const { icon: ActionIcon, label } = describeAction(toolCall.args);

  return (
    <div className="rounded-lg border border-base-300 bg-base-200 text-xs overflow-hidden">
      <AddressBar url={pageUrl} title={isCalling ? toolCall.args?.url || "Loading…" : pageTitle} />

      <div
        className={`flex items-center gap-2 px-3 py-1.5 ${!isCalling ? "cursor-pointer select-none" : ""}`}
        onClick={() => !isCalling && setOpen((v) => !v)}
      >
        {isCalling ? (
          <span className="loading loading-spinner loading-xs text-primary shrink-0" />
        ) : (
          <ActionIcon className="h-3.5 w-3.5 text-success shrink-0" />
        )}
        <span className="truncate flex-1 text-base-content/80">{label}</span>
        {!isCalling &&
          (open ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-base-content/50" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-base-content/50" />
          ))}
      </div>

      {isCalling ? (
        /* Skeleton stands in for the page while the tool is still running. */
        <div className="px-3 pb-3 flex flex-col gap-1.5">
          <div className="skeleton h-2.5 w-3/4" />
          <div className="skeleton h-2.5 w-2/3" />
          <div className="skeleton h-2.5 w-1/2" />
        </div>
      ) : open ? (
        <div className="border-t border-base-300 bg-base-100">
          {links.length > 0 && (
            <ul className="flex flex-col divide-y divide-base-300/60">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 px-3 py-2 hover:bg-base-200/60"
                  >
                    <FaviconOrLetter url={link.href} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base-content/90">{link.title}</span>
                      <span className="block truncate text-[10px] text-base-content/50">{getHost(link.href)}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] text-base-content/50 hover:text-base-content/80"
            onClick={() => setShowRaw((v) => !v)}
          >
            {showRaw ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showRaw ? "Hide page content" : "View page content"}
          </button>

          {showRaw && (
            <pre className="px-3 py-2 border-t border-base-300 max-h-48 overflow-auto whitespace-pre-wrap break-all text-[10px] text-base-content/70">
              {snapshot || (typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : String(toolCall.result))}
            </pre>
          )}
        </div>
      ) : null}
    </div>
  );
}
