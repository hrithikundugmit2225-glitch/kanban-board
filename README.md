# Kanban Board Application (Trello-Style)

A fully responsive, real-time Trello-style Kanban Board application built as part of the technical assessment. This project demonstrates modern frontend development practices, clean state management, seamless drag-and-drop interactions, user authentication, and the efficient integration of AI-assisted engineering workflows.

---

## ✨ Features

### Core Features
- **Board Management:** Create, edit, and delete multiple kanban boards smoothly.
- **Task/Card Management:** Dynamic creation, inline editing, and deletion of tasks with attributes like names, descriptions, and due dates.
- **Drag and Drop:** Smooth drag-and-drop capabilities to move tasks across different columns (To Do, In Progress, Done).
- **User Authentication:** Secure authentication using Google OAuth and Email-Password configuration.
- **Real-time Updates:** State changes and updates are rendered immediately for a snappy user experience.
- **Responsive Layout:** Fully optimized for mobile, tablet, and desktop viewports using a clean and intuitive user interface.

### Collaboration Features
- **Member Invitations:** Invite members to collaborate on specific boards.
- **Password Recovery:** Forgot password functionality for email-authenticated accounts.

---

## 🛠️ Technologies Used

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling & UI Components:** Tailwind CSS & Shadcn UI
- **State Management:** Zustand
- **Backend / Auth / Real-time:** Supabase
- **Drag and Drop Engine:** @hello-pangea/dnd

---

## 🤖 AI Tools Used During Development

In accordance with modern software engineering workflows, AI tools were strategically leveraged to improve productivity and ensure code correctness:
- **Gemini & ChatGPT:** Used for initial architectural brainstorming, database schema design, and generating strict TypeScript types.
- **Cursor & GitHub Copilot:** Utilized for inline boilerplate generation, automated refactoring, and rapid UI component styling.
- **Claude:** Assisted in optimizing the complex drag-and-drop reordering logic and handling subtle edge cases in real-time state synchronization.

---

## ⚙️ Project Setup Instructions

Run the following commands sequentially in your terminal to set up and start the project locally. Make sure to create the `.env.local` file with your credentials before running the development server:

```bash
# Clone the repository and navigate into the project directory
git clone [https://github.com/hrithikundugmit2225-glitch/kanban-board.git](https://github.com/hrithikundugmit2225-glitch/kanban-board.git)
cd kanban-board

# Install all the required project dependencies
npm install

# Create the environment variables file in the root directory
echo "NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env.local

# Start the local development server
npm run dev

# Build and start the production application
npm run build
npm run start