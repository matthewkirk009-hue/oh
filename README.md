# Companion Chat (English)

A clean, ChatGPT-style, local-first companion app inspired by `bb_chat`.

## What’s included

- Login + register + **offline no-account mode**
- Welcome setup with custom user name, AI name, and avatar
- ChatGPT-like layout:
  - left sidebar with chat history
  - central chat view
  - right settings drawer
- OpenRouter integration:
  - API key input
  - system prompt field
  - model dropdown + add custom models
- Full sampling controls:
  - temperature, top_p, top_k, frequency_penalty, presence_penalty,
    repetition_penalty, min_p, max_tokens
- Memory system:
  - pinned memory (always injected)
  - keyword memories (`keyword: memory`)
- Automatic summarization of older context
- Import/export:
  - full app/chat state as JSON
  - active conversation as Markdown
  - robust import for multiple JSON formats (legacy + array + full export)

## Run

Open `index.html` in your browser. No backend required.
