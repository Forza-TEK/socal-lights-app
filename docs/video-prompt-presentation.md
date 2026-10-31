# Prompt: city contest presentation demo for SoCal Lights

Paste this into Claude Code (or any agent with a browser, ffmpeg and a text-to-speech voice). It makes the **city contest presentation**: one narrated video and a matching PowerPoint deck. The Instagram shorts are a separate prompt: `docs/video-prompt-shorts.md`.

---

Make a presentation demo for **running a city home decorating contest** on SoCalLights.app: create, enter, review, judge, vote, announce, and archives and badges. It is a 16:9 video plus a PowerPoint (.pptx) deck for a live demo to a city.

**Who it is for:** families and everyday visitors, not technical people. They should understand it the first time, on a phone or on a computer, without reading anything else.

**What to record**
1. Record the real site (local `npm run dev` with sample data, never the live database). Do every step a visitor would do, with a visible cursor and a ripple on each tap.
2. Use only real features. Never invent events, prices, winners or screens. If something cannot be shown truthfully (for example live map tiles), say so in the report.

**Pacing (important)**
- Give the viewer time to see everything. After every tap, hold the result on screen for at least 1.5 seconds before the next move. After every scroll or page change, hold for at least 2 seconds.
- Move the cursor slowly and in a smooth line so the eye can follow it. Scroll slowly, never jump.
- Do not narrate and click at the same instant: say what is about to happen, then do it, then pause.
- If narration needs more time than the recording gives, slow the recording down rather than cut the narration.
- Whole recordings are slowed to about 70 percent speed by default, so no action feels rushed.

**Words**
- Short sentences, everyday words, present tense: "Tap the heart." "Zoom in until the number circles are gone."
- Say what the viewer will see before they see it. Name each button exactly as it is written on screen.
- No jargon: say "maps app", not "deep link".

**Voice**
- A calm, warm, unhurried voice at about 85 percent of normal speed.
- Soften it: roll off the highs, add a little warmth in the low mids, and a touch of room echo.
- Stretch each recorded moment just enough that the narration finishes before the screen moves on. Never talk over a transition.
- Spell numbers and plurals so the voice does not skip them. Check the generator's log for skipped words and fix every one.

**What to show**
- One chapter per step, in the order an organizer meets them. Use a computer-sized screen (about 1280 x 720) for organizer steps and a phone-sized screen (about 390 x 640) for what neighbors and voters do. Say "on your phone" or "on a computer" in the chapter titles.
- The video may run longer than three minutes, but keep every chapter to one idea.
- Use a fictional "Demo City" contest and fictional neighbors. Say so on the title card.

**Structure**
- A title card with the logo and the topic.
- An agenda card listing the steps.
- One chapter card per step, each with one plain sentence.
- The recording, with a short caption for every action.
- A closing card with `socallights.app` and `info@socallights.app`.

**No music.** The narration is the only audio, so it stays clear in a room.

**PowerPoint**
- A structured deck (theme, layouts, speaker notes on every slide): title, why a contest, how it works, create, enter, fairness, judges and the public, prizes and sponsors, the organizer dashboard, announcing, archives and badges, getting started, questions.
- Use real screenshots taken from the recording. Check every slide visually for overlap and overflow.

**Check before you hand it over**
- Look at frames from the start, middle and end of every part. The right screen must be showing when each caption appears.
- Confirm the audio track exists and is not clipped.
- Report the duration, the voice used and anything you could not verify (such as how the voice sounds), so the owner can ask for changes.

**Deliver** the MP4 files, plus the script text for each so the owner can edit the narration.
