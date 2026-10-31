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
from earshot.forge import bank

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUTS = [
    os.path.join(ROOT, "apps/web/src/assets/sounds"),
    os.path.join(ROOT, "apps/mobile/assets/sounds"),
]
SR = 48000
MAX_S = 1.2
FADE_S = 0.012

# Loudest 50 ms window, in dB below full scale: alerts sit forward, typing far back.
LEVEL_DB = {"alert": -14.0, "action": -18.0, "typing": -24.0}
EVENT_LEVEL = {
    "send": "action",
    "interrupt": "action",
    "complete": "alert",
    "input": "alert",
    "approval": "alert",
    "error": "alert",
    "key": "typing",
    "space": "typing",
    "enter": "typing",
    "delete": "typing",
}

# Crispy: bright, short, dry ticks and dings. Gooey: soft, round, wet pops and drops.
THEMES = {
    "crispy": {
        "send": {"id": "swish/flick", "dur": 0.3},
        "interrupt": {"id": "pro_zip/down"},
        "complete": {"id": "pro_notify/ding_2167"},
        "input": {"id": "mallet/glock", "pitch": "A5"},
        "approval": {"id": "knock/snap"},
        "error": {"id": "glitch/mid"},
        "key": {"id": "typing_key/clicky", "dur": 0.12},
        "space": {"id": "typing_key/laptop", "dur": 0.14},
        "enter": {"id": "typing_key/crisp", "dur": 0.16},
        "delete": {"id": "pro_click/snap"},
    },
    "gooey": {
        "send": {"id": "drip/bloop"},
        "interrupt": {"id": "fit/pop/lip_pop"},
        "complete": {"id": "pluck/kalimba_soft", "pitch": "E5", "dur": 0.9},
        "input": {"id": "drip/drop"},
        "approval": {"id": "ui_pop/wide"},
        "error": {"id": "ui_pop/fall"},
        "key": {"id": "pro_pop/thup"},
        "space": {"id": "pro_pop/boop"},
        "enter": {"id": "drip/bubble"},
        "delete": {"id": "drip/tiny"},
    },
}


def window_peak_db(y):
    frame = int(0.05 * SR)
    padded = np.pad(y, (0, (-len(y)) % frame))
    rms = np.sqrt(np.mean(padded.reshape(-1, frame) ** 2, axis=1))
    return 20 * np.log10(max(rms.max(), 1e-9))


def finish(y, level_db):
    y = y.mean(axis=1) if y.ndim == 2 else y
    loud = np.flatnonzero(np.abs(y) > np.abs(y).max() * 10 ** (-54 / 20))
    y = y[: min(loud[-1] + 1, int(MAX_S * SR))].astype(np.float64)
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
            knobs = {k: v for k, v in spec.items() if k != "id"}
            y, meta = bank.render(spec["id"], **knobs)
            warnings = [c for c in (meta.get("checks") or {}).get("warnings", [])]
            y = finish(y, LEVEL_DB[EVENT_LEVEL[event]])
            for out in OUTPUTS:
                os.makedirs(os.path.join(out, theme), exist_ok=True)
                encode(y, os.path.join(out, theme, f"{event}.mp3"))
            note = f"  warnings: {warnings}" if warnings else ""
            print(f"{theme}/{event}: {spec['id']} {len(y) / SR:.2f}s{note}", file=sys.stderr)


if __name__ == "__main__":
    main()
