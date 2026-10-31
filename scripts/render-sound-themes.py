"""Render the client sound themes from the earshot sound bank (https://github.com/Leonxlnx/earshot, MIT).

Every sound is synthesized in code by earshot's forge, so a theme is just a list of bank ids and knobs.

    git clone https://github.com/Leonxlnx/earshot && cd earshot
    python -m venv .venv && .venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
    .venv/bin/pip install -e .
    .venv/bin/python <t3code>/scripts/render-sound-themes.py

Needs ffmpeg with libmp3lame. Writes the same files into the web and mobile asset folders.
"""

import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile
import soxr
from earshot.forge import bank

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUTS = [
    os.path.join(ROOT, "apps/web/src/assets/sounds"),
    os.path.join(ROOT, "apps/mobile/assets/sounds"),
]
SR = 48000
MAX_S = 1.2
FADE_S = 0.012

# Loudest 50 ms window, in dB below full scale: alerts sit forward, typing and interface far back.
LEVEL_DB = {"alert": -14.0, "action": -18.0, "interface": -22.0, "typing": -24.0}
ALERTS = {"complete", "input", "approval", "error"}
INTERFACE = {"copy", "toast", "palette", "panelOpen", "panelClose", "switchOn", "switchOff",
             "modelChange", "modeChange", "dragStart", "terminal"}
TYPING = {"typing-key", "typing-space", "typing-enter", "typing-delete"}


def level_for(event):
    if event in ALERTS:
        return "alert"
    if event in TYPING:
        return "typing"
    return "interface" if event in INTERFACE else "action"


# Crispy: bright, short, dry ticks and dings. Gooey: soft, round, wet pops and drops.
# Knobs: pitch (a note, through the recipe), dur (s, through the recipe), max (s, a trim),
# rate (a resample: 0.85 is lower and longer, for "un-" variants of a sound).
THEMES = {
    "crispy": {
        "send": {"id": "swish/flick", "dur": 0.3},
        "queue": {"id": "pro_pop/chirp"},
        "interrupt": {"id": "pro_zip/down"},
        "complete": {"id": "pro_notify/ding_2167"},
        "input": {"id": "mallet/glock", "pitch": "A5"},
        "approval": {"id": "knock/snap"},
        "error": {"id": "glitch/mid"},
        "approve": {"id": "mallet/celesta", "pitch": "C6"},
        "decline": {"id": "knock/plastic"},
        "answer": {"id": "pro_click/tink"},
        "newThread": {"id": "pro_pop/tink"},
        "archive": {"id": "swipe/paper", "max": 0.35},
        "unarchive": {"id": "swipe/paper", "max": 0.35, "rate": 1.2},
        "delete": {"id": "shutter/snap"},
        "pin": {"id": "toggle/latch"},
        "unpin": {"id": "toggle/latch", "rate": 0.82},
        "snooze": {"id": "pro_zip/down_warm"},
        "unsnooze": {"id": "pro_notify/ding_1822"},
        "settle": {"id": "click/double"},
        "unsettle": {"id": "click/double", "rate": 0.85},
        "rename": {"id": "pro_click/soft"},
        "fork": {"id": "swish/zing", "max": 0.4},
        "revert": {"id": "whoosh_fast/reverse", "max": 0.45},
        "undo": {"id": "whoosh_fast/tight", "max": 0.35},
        "attach": {"id": "click/snap"},
        "modelChange": {"id": "hover_tick/ping"},
        "modeChange": {"id": "hover_tick/mid"},
        "dragStart": {"id": "tap/glass"},
        "drop": {"id": "tap/table"},
        "commit": {"id": "shutter/dslr"},
        "push": {"id": "whoosh_fast/whip", "max": 0.4},
        "pullRequest": {"id": "mallet/up4"},
        "branchSwitch": {"id": "swish/bright"},
        "copy": {"id": "pro_click/glass"},
        "toast": {"id": "pro_hover_tick/ping"},
        "palette": {"id": "pro_hover_tick/detent"},
        "panelOpen": {"id": "swipe/flick", "max": 0.28},
        "panelClose": {"id": "swipe/flick", "max": 0.28, "rate": 0.85},
        "switchOn": {"id": "toggle/on"},
        "switchOff": {"id": "toggle/off"},
        "terminal": {"id": "hover_tick/high"},
        "typing-key": {"id": "typing_key/clicky", "dur": 0.12},
        "typing-space": {"id": "typing_key/laptop", "dur": 0.14},
        "typing-enter": {"id": "typing_key/crisp", "dur": 0.16},
        "typing-delete": {"id": "pro_click/snap"},
    },
    "gooey": {
        "send": {"id": "drip/bloop"},
        "queue": {"id": "drip/plink"},
        "interrupt": {"id": "fit/pop/lip_pop"},
        "complete": {"id": "pluck/kalimba_soft", "pitch": "E5", "dur": 0.9},
        "input": {"id": "drip/drop"},
        "approval": {"id": "ui_pop/wide"},
        "error": {"id": "ui_pop/fall"},
        "approve": {"id": "pluck/kalimba_soft", "pitch": "G5", "dur": 0.5},
        "decline": {"id": "pro_pop_in/deep"},
        "answer": {"id": "ui_pop/soft"},
        "newThread": {"id": "ui_pop/blip"},
        "archive": {"id": "swipe/velvet", "max": 0.45},
        "unarchive": {"id": "swipe/velvet", "max": 0.4, "rate": 1.2},
        "delete": {"id": "cut_hit/sub", "max": 0.3},
        "pin": {"id": "ui_pop/step"},
        "unpin": {"id": "ui_pop/step", "rate": 0.85},
        "snooze": {"id": "reverse_swell/dark", "max": 0.5},
        "unsnooze": {"id": "mallet/marimba"},
        "settle": {"id": "tap/soft"},
        "unsettle": {"id": "tap/finger"},
        "rename": {"id": "knock/wood"},
        "fork": {"id": "fit/pop/mouth_plop"},
        "revert": {"id": "whoosh_fast/sleeve", "max": 0.5},
        "undo": {"id": "swish/soft", "max": 0.4},
        "attach": {"id": "pro_pop_in/round"},
        "modelChange": {"id": "pro_pop/double"},
        "modeChange": {"id": "ui_pop/boop"},
        "dragStart": {"id": "pro_tap/soft"},
        "drop": {"id": "pro_pop_in/double"},
        "commit": {"id": "mallet/pluck"},
        "push": {"id": "swish/cane", "max": 0.45},
        "pullRequest": {"id": "mallet/flourish"},
        "branchSwitch": {"id": "pro_zip/down_warm"},
        "copy": {"id": "pro_tap/glass"},
        "toast": {"id": "pro_pop_in/airy"},
        "palette": {"id": "knock/desk"},
        "panelOpen": {"id": "swipe/cloth", "max": 0.3},
        "panelClose": {"id": "swipe/cloth", "max": 0.3, "rate": 0.85},
        "switchOn": {"id": "pro_tap/knock"},
        "switchOff": {"id": "pro_tap/knock", "rate": 0.8},
        "terminal": {"id": "pro_tap/double"},
        "typing-key": {"id": "pro_pop/thup"},
        "typing-space": {"id": "pro_pop/boop"},
        "typing-enter": {"id": "drip/bubble"},
        "typing-delete": {"id": "drip/tiny"},
    },
}


def window_peak_db(y):
    frame = int(0.05 * SR)
    padded = np.pad(y, (0, (-len(y)) % frame))
    rms = np.sqrt(np.mean(padded.reshape(-1, frame) ** 2, axis=1))
    return 20 * np.log10(max(rms.max(), 1e-9))


def finish(y, level_db, max_s=MAX_S, rate=1.0):
    y = y.mean(axis=1) if y.ndim == 2 else y
    if rate != 1.0:
        y = soxr.resample(y, SR, SR / rate)
    loud = np.flatnonzero(np.abs(y) > np.abs(y).max() * 10 ** (-54 / 20))
    y = y[: min(loud[-1] + 1, int(max_s * SR))].astype(np.float64)
    fade = min(int(FADE_S * SR), len(y))
    y[-fade:] *= np.linspace(1.0, 0.0, fade)
    y *= 10 ** ((level_db - window_peak_db(y)) / 20)
    peak = np.abs(y).max()
    if peak > 10 ** (-1 / 20):
        y *= 10 ** (-1 / 20) / peak
    return y.astype(np.float32)


def encode(y, path):
    with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
        soundfile.write(wav.name, y, SR, subtype="PCM_24")
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", wav.name, "-ac", "1", "-ar", "44100",
             "-codec:a", "libmp3lame", "-b:a", "96k", "-map_metadata", "-1", path],
            check=True,
        )


def main():
    for theme, events in THEMES.items():
        for event, spec in events.items():
            knobs = {k: v for k, v in spec.items() if k in ("pitch", "dur")}
            y, meta = bank.render(spec["id"], **knobs)
            warnings = [c for c in (meta.get("checks") or {}).get("warnings", [])]
            level = LEVEL_DB[level_for(event)]
            y = finish(y, level, spec.get("max", MAX_S), spec.get("rate", 1.0))
            for out in OUTPUTS:
                os.makedirs(os.path.join(out, theme), exist_ok=True)
                encode(y, os.path.join(out, theme, f"{event}.mp3"))
            note = f"  warnings: {warnings}" if warnings else ""
            print(f"{theme}/{event}: {spec['id']} {len(y) / SR:.2f}s{note}", file=sys.stderr)


if __name__ == "__main__":
    main()
