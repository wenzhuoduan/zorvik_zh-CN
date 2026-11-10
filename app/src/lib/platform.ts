// Native dialogs and OS integration, with browser fallbacks for the dev bridge.
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { openUrl as tauriOpenUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "./rpc";
import { t } from "../i18n/translate";

export async function pickFolder(title: string): Promise<string | null> {
  const label = t(title) ?? title;
  if (isTauri) {
    const r = await open({ directory: true, multiple: false, title: label });
    return typeof r === "string" ? r : null;
  }
  const hint = t("Enter an absolute folder path:") ?? "Enter an absolute folder path:";
  return window.prompt(`${label}\n${hint}`)?.trim() || null;
}

export async function pickFile(title: string, extensions?: string[]): Promise<string | null> {
  const label = t(title) ?? title;
  if (isTauri) {
    const r = await open({
      multiple: false,
      title: label,
      filters: extensions
        ? [
            { name: t("Supported files") ?? "Supported files", extensions },
            { name: t("All files") ?? "All files", extensions: ["*"] },
          ]
        : undefined,
    });
    return typeof r === "string" ? r : null;
  }
  const hint = t("Enter an absolute file path:") ?? "Enter an absolute file path:";
  return window.prompt(`${label}\n${hint}`)?.trim() || null;
}

export async function pickSavePath(title: string, defaultPath?: string, filters?: { name: string; extensions: string[] }[]): Promise<string | null> {
  const label = t(title) ?? title;
  if (isTauri) {
    const translated = filters?.map((f) => ({ ...f, name: t(f.name) ?? f.name }));
    return (await save({ title: label, defaultPath, filters: translated })) ?? null;
  }
  const hint = t("Enter an absolute file path:") ?? "Enter an absolute file path:";
  return window.prompt(`${label}\n${hint}`, defaultPath)?.trim() || null;
}

export async function openExternal(url: string): Promise<void> {
  if (isTauri) {
    await tauriOpenUrl(url);
  } else {
    window.open(url, "_blank", "noopener");
  }
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const modKey = isMac ? "⌘" : "Ctrl";

/** Quit the desktop app (stops running servers first). */
export async function quitApp(): Promise<void> {
  if (isTauri) await invoke("quit");
}
