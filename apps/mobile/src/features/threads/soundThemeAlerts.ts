import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { attentionSoundEvent, playSound } from "@t3tools/client-runtime/sound-themes";
import {
  createThreadNotificationGate,
  type ThreadNotificationObservation,
} from "@t3tools/client-runtime/state/thread-notification-gate";
import { isShownUnderParent } from "@t3tools/client-runtime/state/threads";

import { scopedThreadKey } from "../../lib/scopedEntities";
import { isSoundThemeOn } from "../../lib/soundThemes";
import { appAtomRegistry } from "../../state/atom-registry";
import { mobilePreferencesAtom } from "../../state/preferences";
import { environmentThreadShells } from "../../state/threads";
import { resolveThreadListV2Status, type ThreadListV2Status } from "./threadListV2";

interface AlertState extends ThreadNotificationObservation {
  readonly shell: EnvironmentThreadShell;
  readonly status: ThreadListV2Status;
}

function observation(shell: EnvironmentThreadShell): AlertState {
  const status = resolveThreadListV2Status(shell);
  const attention =
    status === "approval" ||
    status === "input" ||
    status === "request" ||
    status === "failed" ||
    status === "limited"
      ? `${shell.latestRun?.runId ?? ""}:${status}`
      : null;
  const settled = status === "ready" && shell.latestRun?.status === "completed";
  const completedAt = Date.parse(shell.latestRun?.completedAt ?? "");
  return {
    shell,
    status,
    attention,
    settled,
    completedAt: settled && Number.isFinite(completedAt) ? completedAt : null,
  };
}

/** Plays the sound theme's alerts for threads that finish or need attention while the app is open. */
export function installSoundThemeAlerts(): () => void {
  let previous = new Map<string, AlertState>();
  const gate = createThreadNotificationGate<string>((key, kind) => {
    const state = previous.get(key);
    if (state) playSound(kind === "completion" ? "complete" : attentionSoundEvent(state.status));
  });

  const observe = (shells: ReadonlyArray<EnvironmentThreadShell>) => {
    const underParent = appAtomRegistry.get(environmentThreadShells.delegatedUnderParentAtom);
    const next = new Map<string, AlertState>();
    const changed: Array<[AlertState | undefined, AlertState]> = [];
    for (const shell of shells) {
      const ref = { environmentId: shell.environmentId, threadId: shell.id };
      if (isShownUnderParent(ref, shell.lineage, underParent)) continue;
      const key = scopedThreadKey(shell.environmentId, shell.id);
      const prior = previous.get(key);
      if (prior?.shell === shell) {
        next.set(key, prior);
        continue;
      }
      const state = observation(shell);
      next.set(key, state);
      changed.push([prior, state]);
    }
    previous = next;
    gate.retain(new Set(next.keys()));
    for (const [prior, state] of changed) {
      gate.observe(scopedThreadKey(state.shell.environmentId, state.shell.id), prior, state, {
        archived: state.shell.archivedAt !== null,
        quiet: state.shell.source.latestRunStopRequested === true,
      });
    }
  };

  let stopObserving: (() => void) | null = null;
  const sync = () => {
    if (isSoundThemeOn() === (stopObserving !== null)) return;
    if (stopObserving) {
      stopObserving();
      stopObserving = null;
      previous = new Map();
      gate.clear();
      return;
    }
    stopObserving = appAtomRegistry.subscribe(
      environmentThreadShells.quietThreadShellsAtom,
      observe,
      {
        immediate: true,
      },
    );
  };
  const stopPreferences = appAtomRegistry.subscribe(mobilePreferencesAtom, sync, {
    immediate: true,
  });
  return () => {
    stopPreferences();
    stopObserving?.();
    gate.clear();
  };
}
