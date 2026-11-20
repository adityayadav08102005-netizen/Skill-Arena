"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSectionSave } from "@/hooks/useSectionSave";
import { SaveRow, SectionCard, SelectField, TextArea, TextField } from "./fields";

/**
 * Generic editor for a list of entries (education, experience, projects).
 * `fields`: [{ key, label, type?: "text"|"textarea"|"select"|"year"|"month"|"list", options?, wide?, placeholder? }]
 */
export default function ListSection({ section, title, description, addLabel, emptyText, fields, initial, toForm, toBody, onSaved, max = 20 }) {
  const [items, setItems] = useState(() => (initial ?? []).map((item) => ({ _key: crypto.randomUUID(), ...toForm(item) })));
  const { save, status, error, clearError } = useSectionSave(section, onSaved);

  const blank = () => Object.fromEntries(fields.map((f) => [f.key, f.type === "select" ? f.options[0][0] : ""]));
  const add = () => setItems((s) => [...s, { _key: crypto.randomUUID(), ...blank() }]);
  const remove = (key) => {
    setItems((s) => s.filter((i) => i._key !== key));
    clearError();
  };
  const change = (key, field, value) => {
    setItems((s) => s.map((i) => (i._key === key ? { ...i, [field]: value } : i)));
    clearError();
  };

  return (
    <SectionCard
      title={title}
      description={description}
      footer={<SaveRow status={status} error={error} onClick={() => save({ [section]: items.map(({ _key, ...rest }) => toBody(rest)) })} />}
    >
      {items.length === 0 && <p className="rounded-xl bg-page px-4 py-6 text-center text-sm text-muted">{emptyText}</p>}

      <ol className="space-y-3">
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <motion.li
              key={item._key}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden rounded-2xl border border-line p-4 transition-colors hover:border-arena-200"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-muted">#{index + 1}</span>
                <button type="button" onClick={() => remove(item._key)} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted transition-colors hover:bg-danger-50 hover:text-danger-600">
                  <Trash2 size={13} aria-hidden="true" /> Remove
                </button>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                {fields.map((f) => {
                  const common = {
                    id: `${section}-${item._key}-${f.key}`,
                    label: f.label,
                    value: item[f.key] ?? "",
                    placeholder: f.placeholder,
                    className: f.wide ? "sm:col-span-2" : undefined,
                    onChange: (e) => change(item._key, f.key, e.target.value),
                  };
                  if (f.type === "textarea") return <TextArea key={f.key} rows={3} {...common} />;
                  if (f.type === "select") return <SelectField key={f.key} options={f.options} {...common} />;
                  if (f.type === "month") return <TextField key={f.key} type="month" {...common} />;
                  if (f.type === "year") return <TextField key={f.key} inputMode="numeric" {...common} />;
                  return <TextField key={f.key} {...common} />;
                })}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>

      {items.length < max && (
        <button
          type="button"
          onClick={add}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-arena-200 py-3 text-sm text-arena-600 transition-colors hover:bg-arena-50"
        >
          <Plus size={15} aria-hidden="true" /> {addLabel}
        </button>
      )}
    </SectionCard>
  );
}
