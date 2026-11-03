# Tutorial video standard

How every SoCal Lights tutorial video is made. Written after the first set was rejected (voice started after seven silent seconds, long, unclear directions). Read this before recording or changing a video. The recording tools are described in `docs/tutorials.md`.

## What the research says (and what we do about it)
| Finding | Source | What we do |
|---|---|---|
| Shorter videos hold people. Segment into chunks under 6 minutes; viewers of tutorials engage for only 2 to 3 minutes whatever the length. | Guo, Kim and Rubin, 2014 (6.9 million watch sessions) | **Target 1:30 to 2:00. Hard limit 2:30.** A topic that needs more becomes two videos. |
| Energetic, fairly fast speakers hold people better. Slowing down on purpose does not help. Many MOOC producers use about 160 words a minute; faster still did better online. | Same paper | Narrate at a natural pace, about 150 to 170 words a minute, not slowed down. |
| A hook in the first few seconds. Show the outcome early. A silent or vague opening loses people. | Practitioner guides (vendor blogs, so heuristics, not studies) | **Voice starts in the first second. The opening says what you will have at the end, in one sentence.** No agenda card, no "welcome to". |
| Frame each video as one problem or outcome ("Create a contest in two minutes"), not a feature tour. End by telling the viewer what to do next. | UBC Library screencasting guide | Titles state the outcome. The last sentence points to the next video. |
| Audio matters more than visuals. Clear narration first; a script, rehearsed. | UBC guide; practitioner guides | Full script written first. Voice quality and levels are checked on the finished file. |
| Highlight with the cursor, pause before clicking, put a callout on the click. Do not wave the mouse. | UBC guide | Slow glide, orange ring on the target, ripple on the click, no idle movement. |
| Say the command as the cursor arrives. Narrate what a step achieves, not a play-by-play of your own mouse. | Practitioner guides | "Tap the three dots, top right." The glide ends as the sentence ends, the click follows within a second. |
| Signaling (highlights, cues), segmenting, and coherence (cut what is not needed) improve learning. Narration plus graphics beats narration plus graphics plus long on-screen text. A human-sounding voice beats a robotic one; a friendly conversational tone beats a formal one. | Mayer's multimedia principles | Short step captions only ("Step 2: Tap Add"), no music, no decoration. Conversational script. Best available voice. |
| Captions are required for prerecorded video with sound (WCAG 1.2.2). A text transcript or audio description covers the visuals (1.2.3 and 1.2.5). | W3C WCAG 2.2 | Every video ships with a WebVTT captions file (`.vtt`) and the Tutorials page shows it as closed captions. The narration describes every tap, so it doubles as the audio description. |

Sources: [Guo, Kim and Rubin, "How video production affects student engagement" (L@S 2014)](https://www.cs.rochester.edu/hci/pubs/pdfs/edX-MOOC-video-production-and-engagement_LAS-2014.pdf), [UBC Screencasting Best Practices](https://wiki.ubc.ca/images/b/b5/Screencasting_Best_Practices.pdf), [Mayer's multimedia principles (summary)](https://u.osu.edu/multimedialearning/?p=11), [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## The shape of every video
1. **0:00 to 0:10, hook.** Title card with the outcome in one line. The voice is already speaking: what you will have at the end, in one sentence ("In two minutes you will have a live contest with its own link and QR code. We start on the map.").
2. **Navigate, aloud.** Every video starts on the map, or on an example email. Each tap is a numbered step: the voice says where to look and what to tap; the mouse glides there with an orange ring; the voice ends on the command; the click follows. Captions: "Step 1: Tap the three dots".
3. **Do the task.** One idea per screen, one short sentence per screen, the command last ("Type a name, then tap Next").
4. **Show the result.** Hold on the finished state for two seconds.
5. **Close (about 8 seconds).** One sentence recap, then "Next: ..." with what that video covers.

## Rules
- No silence at the start. The first frame is the title card; speech starts within one second.
- One tap per instruction. Never click before the voice has named it.
- Captions never cover the pointer or the thing being clicked; they clear the moment the screen changes.
- Day mode, 1920 x 1080, steady window, no stray windows, demo data only.
- Numbers and names are written the way they are spoken.
- A video over 2:30 is split, not sped up.

## Checks before a video is called finished
Automatic (the recorder refuses to save a video that fails): title card is the first frame; voice is audible in the first three seconds; the video is within the length limit.
By hand, on the finished file: look at 0:00, 0:01, 0:03; read the speech-recognizer transcript of the first 30 seconds and of every navigation step; check each click happens after its instruction and that no caption covers the pointer; open the end card.
