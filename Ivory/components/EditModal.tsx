"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";

type Field = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "date" | "number" | "boolean";
  options?: { value: string; label: string }[];
  numeric?: boolean;
};

export default function EditModal({
  table,
  id,
  title,
  fields,
  initialValues,
  beforeSave,
}: {
  table: string;
  id: string;
  title: string;
  fields: Field[];
  initialValues: Record<string, any>;
  beforeSave?: (values: Record<string, any>) => Promise<void>;
}) {
  const supabase = createClient();
  const tr = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: Record<string, any> = {};
    for (const f of fields) {
      let v = values[f.key];
      if (v === "" || v === undefined) v = null;
      if (f.type === "number" && v !== null) v = Number(v);
      if (f.type === "boolean" && v !== null) v = v === "true";
      if (f.numeric && v !== null) v = Number(v);
      payload[f.key] = v;
    }

    if (beforeSave) {
      await beforeSave(values);
    }

    const { error: updateError } = await supabase
      .from(table)
      .update(payload)
      .eq("id", id);

    setLoading(false);
    if (updateError) {
      setError(tr("Opslaan mislukt: ") + updateError.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={tr("Bewerken")}
        className="shrink-0 rounded-md p-1.5 text-ink/30 transition hover:bg-gold-soft hover:text-gold"
      >
        ✎
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSave}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-lg"
          >
            <h2 className="mb-4 font-display text-lg text-ink">{title}</h2>

            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-medium text-ink/60">
                    {f.label}
                  </label>
                  {f.type === "textarea" ? (
                    <textarea
                      value={values[f.key] ?? ""}
                      onChange={(e) =>
                        setValues({ ...values, [f.key]: e.target.value })
                      }
                      rows={2}
                      className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                    />
                  ) : f.type === "select" || f.type === "boolean" ? (
                    <select
                      value={values[f.key] ?? ""}
                      onChange={(e) =>
                        setValues({ ...values, [f.key]: e.target.value })
                      }
                      className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                    >
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={
                        f.type === "date"
                          ? "date"
                          : f.type === "number"
                          ? "number"
                          : "text"
                      }
                      value={values[f.key] ?? ""}
                      onChange={(e) =>
                        setValues({ ...values, [f.key]: e.target.value })
                      }
                      className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-brick-soft px-3 py-2 text-xs text-brick">
                {error}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft disabled:opacity-60"
              >
                {loading ? tr("Bezig...") : tr("Opslaan")}
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
        </div>
      )}
    </>
  );
}
