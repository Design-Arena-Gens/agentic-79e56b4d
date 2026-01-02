## CareNavigator — Hospital Reception Agent

CareNavigator is a Next.js + Tailwind CSS application that simulates an AI-assisted operations console for a hospital reception team. It combines real-time lobby intelligence, guided patient check-in, and conversational assistance to streamline front-desk tasks.

### Features

- Agent-led conversation workspace with smart prompts for common reception scenarios
- Real-time lobby snapshot with departmental wait times and escalation status
- Express patient check-in form that syncs to the conversation log
- Visitor guidance cards covering wayfinding, parking, pharmacy, and cafeteria details
- Operational briefings for shift handoffs and triage recommendations

### Getting Started

Install dependencies and launch the development server:

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to explore the reception dashboard.

### Production Build

```bash
npm run build
npm start
```

### Deployment

This project is optimized for hosting on [Vercel](https://vercel.com). Use `vercel deploy --prod` to ship the production build.
