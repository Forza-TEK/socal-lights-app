# Original music for the ads

All tracks are **original and license-free**: synthesised with numpy (`make_candidates.py`), no samples and no third-party recording. Melodies are public-domain carols (compositions from the 1800s); the arrangements and the recordings are ours. Nothing to license, no Content ID claims expected.

## Candidates (owner picks one)
Files in `candidates/`, MP3 192k, 48 kHz stereo, about -16 LUFS each, true peak below -1 dBTP, clean intro and a fading tail, 25 s, loop-friendly (starts and ends on the tonic).

| File | Name | BPM | Key | Instruments | Melody source | Length |
|---|---|---|---|---|---|---|
| `A-bright-bells-pop.mp3` | Bright bells pop | 112 | C major | glockenspiel/bells lead, warm pad, bouncy bass, kick, soft claps, sleigh-bell shaker | Jingle Bells (1857, public domain) | 25 s |
| `B-swing-along.mp3` | Swing-along | 120 (swung eighths) | C major (I-vi7-ii-V7) | vibraphone and bells, walking bass, brushed snare and ride, light pad | Deck the Halls (Welsh air, public domain) | 25 s |
| `C-cozy-sparkle.mp3` | Cozy sparkle | 100, 3/4 | G major | plucked strings, warm pad, twinkling celesta arpeggios, gentle hand-claps, soft bass | We Wish You a Merry Christmas (English carol, public domain) | 25 s |

Made by `make_candidates.py`, then `encode-candidates.sh` (loudness and MP3). I cannot listen to audio myself: levels, continuity and clipping were measured (see the loudness table in the main README), the musical taste is for the owner to judge.

## Which track the videos use
The videos are rendered with the swappable music bed. Default: candidate A, until the owner chooses. To re-mix all nine ad videos with another track (same ducking, loudness, fades and sync checks): `WORK=<dir> TTS=<dir> sh ../remix-all.sh <track.mp3>`.

## Other files
- `make_music.py`, `festive-jingle-original-110bpm.m4a`: the first placeholder track (Jingle Bells, 110 BPM), superseded by the candidates.
- `narration.py`: narration lines rendered with the Kokoro voice `af_heart` (the voice of the tutorial videos), one clip per sentence.
- `mix.py`: voice and music mixer; music sits 10 dB under the voice when alone and 18 dB under while the voice speaks.
- `check.py`: per-video checks (stream durations, loudness, speech-recognition transcript against the script).
