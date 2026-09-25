"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";

type Member = { user_id: string; full_name: string };

export default function AddRegistrationForm({
  projectId,
  members,
}: {
  projectId: string;
  members: Member[];
}) {
  const supabase = createClient();
  const tr = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [deviceClass, setDeviceClass] = useState("");
  const [status, setStatus] = useState("niet_gestart");
  const [expectedCompletion, setExpectedCompletion] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from("registrations").insert({
      project_id: projectId,
      item_name: itemName,
      device_class: deviceClass || null,
      registration_status: status,
      expected_completion: expectedCompletion || null,
      owner_id: ownerId || null,
      notes: notes || null,
    });

    setLoading(false);
    if (insertError) {
      setError(tr("Aanmaken mislukt: ") + insertError.message);
      return;
    }

    setItemName("");
    setDeviceClass("");
    setStatus("niet_gestart");
    setExpectedCompletion("");
    setOwnerId("");
    setNotes("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft"
      >
        {tr("+ Registratie toevoegen")}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleCreate}
      className="space-y-3 rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-sm"
    >
      <h2 className="font-display text-lg text-ink">{tr("Nieuwe registratie")}</h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">
          {tr("Item / apparaat")}
        </label>
        <input
          required
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            {tr("Klasse")}
          </label>
          <input
            value={deviceClass}
            onChange={(e) => setDeviceClass(e.target.value)}
            placeholder={tr("bv. Klasse III")}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            {tr("Status")}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            <option value="niet_gestart">{tr("Niet gestart")}</option>
            <option value="in_aanvraag">{tr("In aanvraag")}</option>
            <option value="ingediend">{tr("Ingediend")}</option>
            <option value="goedgekeurd">{tr("Goedgekeurd")}</option>
            <option value="afgewezen">{tr("Afgewezen")}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            {tr("Verwacht klaar")}
          </label>
          <input
            type="date"
            value={expectedCompletion}
            onChange={(e) => setExpectedCompletion(e.target.value)}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            {tr("Eigenaar")}
          </label>
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            <option value="">{tr("Niemand")}</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">
          {tr("Notities")}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-brick-soft px-3 py-2 text-xs text-brick">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft disabled:opacity-60"
        >
          {loading ? tr("Bezig...") : tr("Toevoegen")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-2 text-sm text-ink/60 hover:bg-ivory"
        >
          {tr("Annuleren")}
        </button>
      </div>
    </form>
  );
}
