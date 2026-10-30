# Prompt: make a SoCal Lights tutorial video

Paste this into Claude Code (or any agent with a browser, ffmpeg and a text-to-speech voice) to make a new tutorial video in the same tone as the existing ones.

---

Make a short tutorial video for **[FEATURE]** on SoCalLights.app. The four video types are:
1. **Add** (a lighting display, an event, and a home decorating contest)
2. **Route these** (find homes to visit and drive to them in order)
3. **My night, then Shop** (plan the evening, then browse the shop back home)
4. **Run a city contest** (create, enter, review, judge, vote, announce, archives)
Make each type as its own video unless told otherwise.

**Who it is for:** families and everyday visitors, not technical people. They should understand it the first time, on a phone or on a computer, without reading anything else.

**What to show**
1. Record the real site (local `npm run dev` with sample data, never the live database). Do every step a visitor would do, with a visible cursor and a ripple on each tap.
2. Show the feature **twice, back to back**: first on a phone-sized screen (about 390 x 760), then on a desktop-sized screen (about 1280 x 720). Say "on your phone" and "on a computer" in the chapter titles.
3. Keep each video to one idea, under about 3 minutes in total. If a second idea is needed (for example "My night", then "Shop"), put it in the same video as the next part, in the order a family would use it.
4. Use only real features. Never invent events, prices, winners or screens. If something cannot be shown truthfully (for example live map tiles), say so in your report.

**Pacing (important)**
- Give the viewer time to see everything. After every tap, hold the result on screen for at least 1.5 seconds before the next move. After every scroll or page change, hold for at least 2 seconds.
- Move the cursor slowly and in a smooth line so the eye can follow it. Scroll slowly, never jump.
- Do not narrate and click at the same instant: say what is about to happen, then do it, then pause.
- If narration needs more time than the recording gives, slow the recording down rather than cut the narration.
- Whole recordings are slowed to about 70 percent speed by default, so no action feels rushed.

**Structure**
- A title card with the logo and the topic.
- One chapter card per part ("Part 1 · Route these, on your phone"), each with one plain sentence.
- The recording, with a short caption along the bottom for every action.
- A closing card with `socallights.app` and `info@socallights.app`.

**Words**
- Short sentences, everyday words, present tense: "Tap the heart." "Zoom in until the number circles are gone."
- Say what the viewer will see before they see it. Name each button exactly as it is written on screen.
- No jargon: say "maps app", not "deep link".

**Voice**
- A calm, warm, unhurried voice at about 85 percent of normal speed.
- Soften it: roll off the highs, add a little warmth in the low mids, and a touch of room echo.
- Stretch each recorded moment just enough that the narration finishes before the screen moves on. Never talk over a transition.
- Spell numbers and plurals so the voice does not skip them. Check the generator's log for skipped words and fix every one.

**Music**
- Gentle holiday music under the whole video, from a public-domain carol (for example Silent Night), played softly on a music box with a warm pad.
- The music must never drown the voice: duck it automatically whenever the voice speaks (sidechain compression), keep it about 20 dB below the voice, fade it in at the start and out at the end.
- Use only music you made yourself or that is public domain. No copyrighted recordings.

**Check before you hand it over**
- Play the video's frames at the start, middle and end of every part. The right screen must be showing when each caption appears.
- Confirm the audio track exists and is not clipped.
- Report the duration, the voice used and anything you could not verify (such as how the voice sounds), so the owner can ask for changes.

**Deliver** the MP4 files, plus the script text for each so the owner can edit the narration.
