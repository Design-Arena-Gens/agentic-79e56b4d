'use client';

import {
  FormEvent,
  MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type MessageAuthor = "agent" | "visitor" | "system";

type ConversationMessage = {
  id: string;
  author: MessageAuthor;
  text: string;
  createdAt: Date;
  meta?: string;
};

type CheckIn = {
  id: string;
  name: string;
  dob: string;
  reason: string;
  status: "Waiting" | "Roomed" | "In Progress";
  arrival: Date;
  location: string;
  phone?: string;
};

const quickPrompts = [
  {
    label: "Schedule a follow-up",
    message:
      "I need to schedule a follow-up appointment for cardiology next week.",
  },
  {
    label: "Check on a patient",
    message: "Can you tell me the status of patient Emily Chen in room 402?",
  },
  {
    label: "Directions",
    message:
      "Where is the radiology department located and how do I get there from the reception desk?",
  },
  {
    label: "Billing help",
    message:
      "A visitor needs help understanding the billing process after discharge.",
  },
  {
    label: "Visitor policy",
    message:
      "What are the visiting hours and policy for the pediatric unit today?",
  },
];

const departmentQueue = [
  { name: "Urgent Care", wait: 18, trend: "down" as const },
  { name: "Radiology", wait: 35, trend: "steady" as const },
  { name: "Cardiology", wait: 42, trend: "up" as const },
  { name: "Laboratory", wait: 22, trend: "down" as const },
];

const facilityHighlights = [
  {
    title: "Wayfinding",
    details: "Radiology → Elevators B, Level 3, turn right at the aquarium.",
  },
  {
    title: "Parking",
    details: "Garage P4 has 126 spots open; valet closes at 10:00 PM.",
  },
  {
    title: "Pharmacy",
    details: "On-site pharmacy open until 11:00 PM, call x7221 for refills.",
  },
  {
    title: "Cafeteria",
    details: "Daily special: Grilled salmon; peak lunch rush expected 12-1 PM.",
  },
];

const escalationRoutes = [
  {
    name: "Clinical Concerns",
    contacts: ["Charge Nurse - x3110", "On-call Hospitalist - x4002"],
  },
  {
    name: "Technical Support",
    contacts: ["IT Service Desk - x5555 (24/7)", "EHR Downtime: #1122"],
  },
  {
    name: "Patient Experience",
    contacts: ["Guest Services Director - x2760", "Interpreter Line - x9900"],
  },
];

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeTimeFromNow(date: Date) {
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  if (Math.abs(diffMinutes) < 1) {
    return "just now";
  }
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  return rtf.format(diffHours, "hour");
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function nextId(prefix: string, ref: MutableRefObject<number>) {
  ref.current += 1;
  return `${prefix}-${ref.current}`;
}

function createInitialConversation(): ConversationMessage[] {
  const now = new Date();
  return [
    {
      id: "msg-0",
      author: "agent",
      text: "Hi there! I'm CareNavigator, your virtual reception partner. I can help you check patients in, track wait times, guide visitors, and coordinate with clinical teams. How can I support you right now?",
      createdAt: now,
      meta: "Live from Pavilion Lobby",
    },
  ];
}

function generateAgentResponse(input: string): string {
  const message = input.toLowerCase();
  if (message.includes("follow-up") || message.includes("schedule")) {
    return [
      "I can coordinate that follow-up. Cardiology has openings Tuesday at 10:20 AM and Thursday at 2:40 PM.",
      "Shall I tentatively reserve the Tuesday slot and notify Dr. Velasquez's coordinator?",
      "I'll also email the appointment summary to the patient once it's confirmed.",
    ].join(" ");
  }
  if (
    message.includes("status") ||
    message.includes("check") ||
    message.includes("update")
  ) {
    return [
      "Emily Chen was transferred to Radiology at 2:05 PM for a CT scan.",
      "Estimated return to room 402 is 3:15 PM. No new alerts noted.",
      "I've flagged this request for the bedside nurse to follow up in person.",
    ].join(" ");
  }
  if (message.includes("where") || message.includes("directions")) {
    return [
      "From reception, take Elevators B to Level 3. Radiology is the second door on the right past the mural.",
      "I've printed a visitor pass to pick up at the front desk kiosk.",
      "Let me know if you need wheelchair assistance en route.",
    ].join(" ");
  }
  if (message.includes("billing") || message.includes("bill")) {
    return [
      "Billing consultations are available in Suite 210 from 8 AM to 6 PM.",
      "I can connect the visitor with Melissa (Patient Accounts) or send them a digital estimate.",
      "Would you like me to schedule a call or prepare an explanation of benefits packet?",
    ].join(" ");
  }
  if (message.includes("visitor") || message.includes("policy")) {
    return [
      "Pediatric unit allows two visitors per patient with badge exchange. Quiet hours begin at 8 PM.",
      "Siblings under 12 need supervisor approval; I can request that now.",
      "Guest Wi-Fi and parking validations are available at the family resource desk.",
    ].join(" ");
  }
  if (message.includes("wheelchair")) {
    return [
      "I've dispatched transport team member Jordan to the lobby with a wheelchair. ETA 5 minutes.",
      "I'll update the patient's chart that mobility assistance was provided.",
    ].join(" ");
  }
  return [
    "Thanks for the update. I've logged the request and will coordinate the appropriate team.",
    "If this involves a clinical concern, I can escalate to the charge nurse immediately.",
    "Feel free to add more details or share the patient's MRN for a deeper chart review.",
  ].join(" ");
}

const triageSuggestions = [
  {
    category: "Mobility & Access",
    notes: "Wheelchair pool at 80% utilization; consider turning around returned units promptly.",
  },
  {
    category: "Visitor Flow",
    notes: "Pediatric lobby busier than usual due to flu clinic; engage volunteers for greeter support.",
  },
  {
    category: "Communication",
    notes: "Morning rounding summary posted at 8:10 AM; include handoff highlights when briefing families.",
  },
];

const dailyBriefing = [
  {
    time: "06:30",
    detail: "Overnight admissions: 14, discharges planned: 18, bed turnover target 56 minutes.",
  },
  {
    time: "08:15",
    detail: "MRI downtime scheduled 1:00-1:45 PM for calibration. Reschedule outpatient slots.",
  },
  {
    time: "09:10",
    detail: "Trauma alert cleared; environmental services preparing trauma bay by 09:40 AM.",
  },
];

export default function AgentDashboard() {
  const idCounter = useRef(0);
  const [conversation, setConversation] = useState<ConversationMessage[]>(
    createInitialConversation,
  );
  const [inputValue, setInputValue] = useState("");
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckIn[]>(() => [
    {
      id: "checkin-1",
      name: "Michael Torres",
      dob: "1988-11-03",
      reason: "Cardiology consult",
      status: "Waiting",
      arrival: new Date(Date.now() - 12 * 60000),
      location: "Lobby - Seat 6B",
      phone: "(415) 555-2189",
    },
    {
      id: "checkin-2",
      name: "Priya Patel",
      dob: "1994-04-12",
      reason: "Radiology follow-up",
      status: "Roomed",
      arrival: new Date(Date.now() - 28 * 60000),
      location: "Radiology - Bay 3",
    },
  ]);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  const handleSend = (message?: string) => {
    const trimmed = (message ?? inputValue).trim();
    if (!trimmed) return;
    const visitorMessage: ConversationMessage = {
      id: nextId("msg", idCounter),
      author: "visitor",
      text: trimmed,
      createdAt: new Date(),
    };
    setConversation((prev) => [...prev, visitorMessage]);
    setInputValue("");
    setIsAgentTyping(true);
    const responseDelay = Math.min(1200 + trimmed.length * 20, 4000);
    setTimeout(() => {
      const reply: ConversationMessage = {
        id: nextId("msg", idCounter),
        author: "agent",
        text: generateAgentResponse(trimmed),
        createdAt: new Date(),
        meta: "Auto-routed to reception log",
      };
      setConversation((prev) => [...prev, reply]);
      setIsAgentTyping(false);
    }, responseDelay);
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = (formData.get("name") as string)?.trim();
    const dob = (formData.get("dob") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim();
    const reason = (formData.get("reason") as string)?.trim();
    if (!name || !dob || !reason) {
      return;
    }
    const newCheckIn: CheckIn = {
      id: nextId("checkin", idCounter),
      name,
      dob,
      reason,
      status: "Waiting",
      arrival: new Date(),
      location: "Lobby - Pending escort",
      phone: phone || undefined,
    };
    setCheckIns((prev) => [newCheckIn, ...prev]);
    setCheckInSuccess(
      `Checked in ${name.split(" ")[0]} — notified ${reason} team.`,
    );
    setTimeout(() => setCheckInSuccess(null), 5000);
    event.currentTarget.reset();
    const confirmation: ConversationMessage = {
      id: nextId("msg", idCounter),
      author: "system",
      text: `Check-in created for ${name} (${reason}). Arrival logged at ${formatTime(newCheckIn.arrival)}.`,
      createdAt: new Date(),
      meta: "EHR sync: success",
    };
    setConversation((prev) => [...prev, confirmation]);
  };

  const activeCheckIns = useMemo(() => checkIns.slice(0, 5), [checkIns]);

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-slate-100">
      <div className="mx-auto grid w-full max-w-[1440px] gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-blue-200/80">
              Seaside Medical Center
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white">
              CareNavigator Agent
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Orchestrating lobby operations, queue management, visitor flow,
              and frontline communication around the clock.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-blue-200/70">
                  Live status
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {now.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right text-xs text-blue-100/80">
                <p>Visitors on-site: 62</p>
                <p>Transport requests: 4</p>
                <p>Escalations pending: 1</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-200">
              {departmentQueue.map((dept) => (
                <div
                  key={dept.name}
                  className="rounded-xl border border-white/10 bg-white/[0.08] p-3"
                >
                  <p className="text-xs font-semibold text-white">
                    {dept.name}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-blue-100">
                    {dept.wait} min
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                    Trend {dept.trend === "down" ? "↓" : dept.trend === "up" ? "↑" : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-wider text-blue-200/70">
              Quick prompts
            </p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => handleSend(prompt.message)}
                  className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-blue-100 transition hover:bg-blue-400/20"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs uppercase tracking-wider text-blue-200/70">
              Shift briefing
            </p>
            <ul className="mt-3 space-y-3 text-sm text-slate-200">
              {dailyBriefing.map((item) => (
                <li
                  key={item.time}
                  className="rounded-xl border border-white/10 bg-black/30 p-3"
                >
                  <p className="text-xs font-semibold text-blue-200/80">
                    {item.time}
                  </p>
                  <p className="mt-1 leading-relaxed">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/30 p-6 backdrop-blur">
          <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200/70">
                Lobby Coordination
              </p>
              <h2 className="text-2xl font-semibold text-white">
                Reception Command Console
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              Connected to EHR · Last sync {relativeTimeFromNow(now)}
            </div>
          </header>
          <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="flex h-[460px] flex-col justify-between">
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {conversation.map((message) => (
                  <article
                    key={message.id}
                    className={`flex flex-col gap-2 rounded-2xl border border-white/10 p-4 ${
                      message.author === "agent"
                        ? "bg-blue-500/10 text-blue-50"
                        : message.author === "system"
                          ? "bg-amber-500/10 text-amber-50"
                          : "bg-slate-900/70 text-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-semibold uppercase tracking-wide text-white/80">
                        {message.author === "agent"
                          ? "CareNavigator"
                          : message.author === "system"
                            ? "System Log"
                            : "Reception Desk"}
                      </span>
                      <span>{formatTime(message.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-line leading-relaxed text-sm">
                      {message.text}
                    </p>
                    {message.meta ? (
                      <p className="text-[11px] uppercase tracking-wide text-blue-200/70">
                        {message.meta}
                      </p>
                    ) : null}
                  </article>
                ))}
                {isAgentTyping ? (
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-blue-500/10 px-4 py-2 text-xs text-blue-100">
                    <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-blue-200" />
                    CareNavigator is drafting a response...
                  </div>
                ) : null}
              </div>
              <form
                className="flex flex-col gap-3 border-t border-white/10 bg-black/40 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSend();
                }}
              >
                <div className="flex gap-3">
                  <input
                    className="flex-1 rounded-full border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/40"
                    placeholder="Type an instruction or update for the reception agent..."
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/40 transition hover:bg-blue-400"
                  >
                    Dispatch
                  </button>
                </div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Agent supports plain language requests, patient lookups, queue
                  adjustments, and visitor guidance.
                </p>
              </form>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-200/80">
              Express Check-In
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              Register a patient
            </h3>
            <p className="mt-2 text-sm text-slate-200">
              Capture essential arrival details and instantly notify the care
              team. Agent validates for duplicates and manages lobby seating.
            </p>
          </div>
          <form
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4"
            onSubmit={handleFormSubmit}
          >
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-300">
              Full name
              <input
                required
                name="name"
                className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/40"
                placeholder="Jordan Matthews"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-300">
              Date of birth
              <input
                required
                name="dob"
                type="date"
                className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/40"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-300">
              Mobile (optional)
              <input
                name="phone"
                className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/40"
                placeholder="(555) 123-4567"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-300">
              Visit reason
              <textarea
                required
                name="reason"
                rows={3}
                className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/40"
                placeholder="Abdominal pain, referred by Dr. Lawson"
              />
            </label>
            <button
              type="submit"
              className="mt-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              Log arrival & notify team
            </button>
            {checkInSuccess ? (
              <p className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-100">
                {checkInSuccess}
              </p>
            ) : null}
          </form>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200/80">
                Lobby queue
              </p>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase text-slate-200">
                {checkIns.length} active
              </span>
            </div>
            <ul className="space-y-3">
              {activeCheckIns.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-white">{entry.name}</p>
                      <p className="text-xs text-slate-300">
                        {entry.reason}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-wide ${
                        entry.status === "Waiting"
                          ? "bg-amber-400/20 text-amber-200"
                          : entry.status === "Roomed"
                            ? "bg-blue-400/20 text-blue-100"
                            : "bg-emerald-400/20 text-emerald-100"
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <p>
                      Arrived {relativeTimeFromNow(entry.arrival)} (
                      {formatTime(entry.arrival)})
                    </p>
                    <p className="text-right">{entry.location}</p>
                    {entry.phone ? (
                      <p className="col-span-2 text-xs text-slate-400">
                        Contact: {entry.phone}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-200/80">
              Facility intel
            </p>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-slate-200">
              {facilityHighlights.map((item) => (
                <li
                  key={slugify(item.title)}
                  className="rounded-xl border border-white/10 bg-black/30 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/80">
                    {item.title}
                  </p>
                  <p className="mt-1">{item.details}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-200/80">
              Triage guidance
            </p>
            <ul className="mt-3 space-y-3 text-sm text-slate-200">
              {triageSuggestions.map((item) => (
                <li
                  key={slugify(item.category)}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/80">
                    {item.category}
                  </p>
                  <p className="mt-1 leading-relaxed">{item.notes}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-200/80">
              Escalation Matrix
            </p>
            <ul className="mt-3 space-y-3 text-sm text-slate-200">
              {escalationRoutes.map((route) => (
                <li
                  key={slugify(route.name)}
                  className="rounded-xl border border-white/10 bg-black/30 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/80">
                    {route.name}
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-slate-300">
                    {route.contacts.map((contact) => (
                      <li key={contact}>{contact}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
