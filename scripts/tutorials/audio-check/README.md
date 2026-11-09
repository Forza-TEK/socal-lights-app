# Audio check for the tutorial videos (2026-11-09)

Checks that what is said in a video matches its captions, using the `faster-whisper` speech recognizer (`small.en` model, runs on the CPU).

1. `python3 scripts/tutorials/audio-check/transcribe.py public/tutorials/<id>.mp4 ...` writes `/tmp/asr/<id>.json` (every word with its time). Set `ASR_DIR` to use another folder. Pass the numpy array, not a file path, to the model (the installed PyAV is too new for `faster-whisper`; `transcribe.py` already does this).
2. `python3 scripts/tutorials/audio-check/analyze.py [id ...]` compares the words heard with the caption text and lists videos with a low match.
3. `python3 scripts/tutorials/audio-check/onsets.py` checks that each line's voice starts where its caption does (silence detection with ffmpeg, no recognizer needed). All 62 recordings passed on 2026-11-09.

How to read the results:
- Long videos make the recognizer repeat itself, so a flagged video is only a lead. Transcribe just the flagged stretch on its own (`ffmpeg -ss <from> -t <length>`) before deciding it needs re-recording. On 2026-11-09 two of five flags were real (Find lights near me and Edit your contest, computer versions), three were not.
- Word times from a whole long video drift; do not use them to retime captions. Use `onsets.py` for timing.
