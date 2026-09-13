# Gemini 3.5 Flash-Lite GitHub Code Studio & IDE

A modern, high-performance web-based AI IDE and repository intelligence platform powered by **Google Gemini 3.5 Flash-Lite**, built with **Vite, React, TypeScript, Tailwind CSS**, and an **Express.js** backend.

---

## 🚀 Key Features

1. **GitHub Repository Explorer (Left Sidebar)**
   - Enter any GitHub username or organization (e.g. `octocat`, `vercel`, `shadcn`, or your own username).
   - Lists repositories with real-time star counts, language badges, default branch, and descriptions.
   - Filter and search through repositories instantly.
   - Optional GitHub Personal Access Token (PAT) support stored safely in `localStorage` to boost rate limits from 60 to 5,000 req/hr.

2. **Smart File Tree with `.gitignore` Awareness (Second Sidebar)**
   - Fetches the recursive Git tree of the selected repository.
   - Detects and parses the repository's `.gitignore` file automatically.
   - Filters out unwanted directories and build artifacts (`node_modules`, `dist`, `.git`, `.next`, `build`, etc.).
   - Toggle button to inspect or show ignored files whenever needed.
   - Interactive hierarchical folder navigation with file-type syntax icons and file sizes.

3. **Center Code Workspace & AI Documentation Generator**
   - **Code Editor**: Inspect, edit, and modify repository files with line numbers, code copy, and local save.
   - **AI Deep Scan & Docs Generator**: One-click scan of the repository with Gemini 3.5 Flash-Lite to auto-generate:
     - `ARCHITECTURE.md`: High-level system design, folder breakdown, and component interactions.
     - `ENDPOINTS.md`: Discovered API endpoints, HTTP methods, headers, and payloads.
     - `SETUP_GUIDE.md`: Step-by-step local clone, dependency install, and run commands.
     - `BUG_AUDIT.md`: Code security, edge cases, vulnerabilities, and recommended fixes.
   - **Export & Copy**: Download or copy generated Markdown documentation files directly.
   - **Live Preview Sandbox**: Direct preview for HTML and Markdown files.

4. **Gemini 3.5 Flash-Lite Assistant & Code Studio (Right Panel)**
   - **Dual Action Modes**:
     - 💬 **Chat AI**: Ask architectural questions, clarify logic, or inquire about endpoints.
     - 🛠️ **AI Code Studio**: Ask Gemini to write new code or fix bugs; click **"Apply to Code"** to apply changes directly to the active file or create new files.
   - **Active File Context**: Attach the active file's code directly into the AI prompt with a single click.
   - **Real-Time Token & Byte Tracker**:
     - Shows live tokens and payload size (B, KB, MB) as you draft your prompt.
     - Turn-by-turn breakdown (User Prompt Tokens, AI Output Tokens, Total).
   - **Session Controls**: New Chat, Export Chat as Markdown, and safe in-app Delete Chat confirmation modal.

---

## 📡 Backend API Endpoints (`server.ts`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Returns server status and indicates if a default `GEMINI_API_KEY` is present. |
| `/api/chat` | `POST` | Server-Sent Events (SSE) streaming endpoint connecting to `@google/genai` using model `gemini-3.5-flash-lite`. Returns token usage analytics. |
| `/api/github/repos` | `GET` | Fetches repositories for a given `?username=...` or authenticated user with optional `x-github-token` header. |
| `/api/github/tree` | `GET` | Recursively fetches the Git tree for `?owner=...&repo=...&branch=...`, retrieves and parses `.gitignore`, and marks ignored items. |
| `/api/github/file` | `GET` | Retrieves and decodes base64 file content for `?owner=...&repo=...&path=...&ref=...`. |

---

## 🏗️ Step-by-Step: How This Site Was Built

1. **Architecture Planning**:
   - Designed a responsive 4-pane layout: GitHub Repositories → File Tree Explorer → Center Code/Docs Workspace → AI Chat & Code Studio.
   - Configured Express server to securely proxy Gemini API requests and GitHub API calls.

2. **GitHub API Proxying & Rate Limit Handling**:
   - Implemented `/api/github/repos`, `/api/github/tree`, and `/api/github/file` in `server.ts`.
   - Added support for user GitHub Personal Access Tokens (PAT) saved in client-side `localStorage`.

3. **`.gitignore` Parsing Engine (`src/utils/gitignore.ts`)**:
   - Built a custom glob and path matching utility that adheres to `.gitignore` rules, ignoring node_modules, build outputs, and lockfiles.

4. **AI Deep Scan & Architecture Generator**:
   - Formats the filtered repository structure and key configuration files (`package.json`, `server.ts`, etc.) and prompts Gemini 3.5 Flash-Lite to stream comprehensive `ARCHITECTURE.md`, `ENDPOINTS.md`, `SETUP_GUIDE.md`, and `BUG_AUDIT.md`.

5. **Direct Code Studio Execution**:
   - Enabled bi-directional flow: the user can inspect code in the center workspace, prompt the AI in "AI Code Studio" mode, and apply the generated code directly with a single click.

---

## 💻 Local Setup & Development

### 1. Prerequisites
- Node.js 18+ installed.
- npm or pnpm package manager.

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment (Optional)
Create a `.env` file in the project root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(You can also provide the Gemini API Key directly inside the app's top "Keys" settings dialog, stored in `localStorage`)*

### 4. Run Development Server
```bash
npm run dev
```
The server will start on port `3000` with both the Express API and Vite frontend running simultaneously.

### 5. Production Build
```bash
npm run build
npm run start
```
