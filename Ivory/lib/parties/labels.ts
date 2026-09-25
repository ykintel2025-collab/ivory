// Partijen & communicatie: vaste lijsten. Waarde = database, label = Nederlands (vertaald via tr()).

export const PARTY_ROLES = [
  { value: "opdrachtgever", label: "Opdrachtgever", color: "bg-gold-soft text-gold" },
  { value: "kandidaat", label: "Kandidaat-leverancier", color: "bg-amber-soft text-amber" },
  { value: "hoofdaannemer", label: "Hoofdaannemer", color: "bg-teal-soft text-teal" },
  { value: "subleverancier", label: "Subleverancier", color: "bg-ink/5 text-ink/70" },
  { value: "adviseur", label: "Adviseur", color: "bg-ink/5 text-ink/70" },
  { value: "partner", label: "Partner", color: "bg-ink/5 text-ink/70" },
  { value: "instantie", label: "Instantie", color: "bg-ink/5 text-ink/70" },
  { value: "financier", label: "Financier / verzekeraar", color: "bg-ink/5 text-ink/70" },
  { value: "overig", label: "Overig", color: "bg-ink/5 text-ink/50" },
];

export const CONTACT_CATEGORIES = [
  { value: "opdrachtgever", label: "Opdrachtgever" },
  { value: "leverancier", label: "Leverancier" },
  { value: "adviseur", label: "Adviseur" },
  { value: "partner", label: "Partner" },
  { value: "instantie", label: "Instantie" },
  { value: "financier", label: "Financier / verzekeraar" },
  { value: "overig", label: "Overig" },
];

export const PARTY_STATUSES = [
  { value: "actief", label: "Actief", color: "bg-teal-soft text-teal" },
  { value: "in gesprek", label: "In gesprek", color: "bg-amber-soft text-amber" },
  { value: "inactief", label: "Inactief", color: "bg-ink/5 text-ink/50" },
];

export const CHANNELS = [
  { value: "email", label: "E-mail", icon: "✉" },
  { value: "telefoon", label: "Telefoon", icon: "☏" },
  { value: "overleg", label: "Overleg", icon: "◉" },
  { value: "videocall", label: "Videocall", icon: "▶" },
  { value: "whatsapp", label: "WhatsApp", icon: "✆" },
  { value: "brief", label: "Brief", icon: "✎" },
  { value: "overig", label: "Overig", icon: "•" },
];

export const DIRECTIONS = [
  { value: "uit", label: "Uitgaand" },
  { value: "in", label: "Inkomend" },
  { value: "intern", label: "Intern" },
];

export type Contact = {
  id: string;
  name: string;
  type: string | null;
  category: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  country: string | null;
  notes: string | null;
};

export type ProjectParty = {
  id: string;
  contact_id: string;
  party_role: string;
  role: string | null;
  status: string;
  notes: string | null;
  contacts: Contact;
};

export type CommEntry = {
  id: string;
  party_id: string | null;
  contact_date: string;
  channel: string;
  direction: string;
  subject: string | null;
  contact_person: string | null;
  summary: string;
  follow_up: string | null;
  follow_up_due: string | null;
  waiting: boolean;
  task_id: string | null;
  created_at: string;
  contacts?: { name: string } | null;
  logger?: { full_name: string } | null;
  tasks?: { status: string } | null;
};

// communication_log verwijst twee keer naar profiles (logged_by en follow_up_owner): expliciet kiezen.
export const COMM_SELECT = "*, contacts(name), logger:profiles!communication_log_logged_by_fkey(full_name), tasks(status)";

export type ActionTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  waiting: boolean;
  contact_id: string | null;
  owner_id: string | null;
  contacts?: { name: string } | null;
  profiles?: { full_name: string } | null;
};

export function iconOf(channel: string) {
  return CHANNELS.find((c) => c.value === channel)?.icon ?? "•";
}
