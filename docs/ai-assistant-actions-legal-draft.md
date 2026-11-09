# Draft wording for the AI assistant actions (for the owner and the attorney to review)

Nothing here is live. `public/privacy.html` and `public/terms.html` still describe the assistant as read-only; they need these sentences before Phase 1 is merged, because the assistant can now offer cards that send things.

## Privacy, section "AI assistant" (add)
"The assistant can offer buttons that do things for you, such as sending a message to our team, signing you up for the weekly email, asking us to remove a home, or opening a form with details filled in. Nothing is sent until you fill in the card and tap its button, and only what is in the card's boxes is sent. If you choose Send to the team, the text you wrote, your email address if you gave one, and the page you were on are emailed to us and saved with our other reports so we can reply. We do not save the rest of your chat. For each kind of button we keep only a daily count of how many were shown and used, never what anyone wrote."

## Terms, section "AI assistant" (add)
"Buttons the assistant shows you act only when you tap them, using the same rules and limits as the matching page on the site. You are responsible for what you send. The assistant cannot make payments, change contest results, vote, or act on anyone else's account."

## Widget note (public/chat.js)
The note under the chat title says the chat stays in this tab. The cards already say, in their own text, exactly what will be sent. No change is needed there, but the sentence "Please don't enter personal information" conflicts with the weekly-email and removal cards that ask for an email address. Suggested replacement: "Please don't enter personal information in your questions. Buttons below an answer ask only for what they need."
