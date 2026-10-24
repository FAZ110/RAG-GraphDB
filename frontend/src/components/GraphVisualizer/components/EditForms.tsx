import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Button, ErrorNote, Modal, TextInput } from '../../deck';
import { useSpaceStats } from '../../../hooks/useSpaces';
import { findExistingLike } from '../../../services/api';
import type { NodeFields, SimilarNode } from '../../../types';

const SUGGESTED_LABELS = 8;

// Labels and relationship types become Neo4j labels: the backend accepts uppercase identifiers.
const toIdentifier = (value: string) =>
  value.trim().toUpperCase().replace(/[\s-]+/g, '_');

const splitAliases = (value: string) =>
  value
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-gray-600">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

/** Free text, with the space's most used labels matching it one click away. */
function LabelInput({
  value,
  onChange,
  spaceId,
}: {
  value: string;
  onChange: (value: string) => void;
  spaceId: string;
}) {
  const stats = useSpaceStats(spaceId);
  const typed = toIdentifier(value);
  // by_label comes sorted by count, most used first.
  const suggestions = (stats.data?.entities.by_label ?? [])
    .filter((l) => l.label.includes(typed))
    .slice(0, SUGGESTED_LABELS);

  return (
    <>
      <TextInput
        required
        placeholder="Wybierz poniżej albo wpisz nową"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map(({ label, count }) => (
            <button
              key={label}
              type="button"
              aria-pressed={label === typed}
              onClick={() => onChange(label)}
              className="cursor-pointer border border-line px-2 py-0.5 text-xs font-medium text-fg-muted hover:border-fg hover:text-fg aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-fg-inverse"
            >
              {label} <span className="font-normal opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

interface NodeFormProps {
  initial: NodeFields;
  spaceId: string;
  pending: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (fields: NodeFields) => void;
  onCancel: () => void;
}

export function NodeForm({ initial, spaceId, pending, error, submitLabel, onSubmit, onCancel }: NodeFormProps) {
  const [name, setName] = useState(initial.name);
  const [label, setLabel] = useState(initial.label);
  const [description, setDescription] = useState(initial.description ?? '');
  const [aliases, setAliases] = useState((initial.aliases ?? []).join(', '));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      label: toIdentifier(label),
      description: description.trim() || null,
      aliases: splitAliases(aliases),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <Field label="Nazwa">
        <TextInput required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Kategoria">
        <LabelInput value={label} onChange={setLabel} spaceId={spaceId} />
      </Field>
      <Field label="Opis">
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:border-fg"
        />
      </Field>
      <Field label="Aliasy (po przecinku)">
        <TextInput value={aliases} onChange={(e) => setAliases(e.target.value)} />
      </Field>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Anuluj
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? 'Zapisuję…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

type CreateProps = Omit<NodeFormProps, 'initial' | 'submitLabel' | 'onCancel'> & {
  onShowExisting: (nodeId: string) => void;
  onCancel: () => void;
};

export function NodeCreateModal({
  open,
  onOpenChange,
  ...props
}: Omit<CreateProps, 'onCancel'> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Nowy węzeł"
      className="inset-x-3 top-[15vh] mx-auto max-w-md p-6"
    >
      <h2 className="mb-4 text-title text-fg">Nowy węzeł</h2>
      {/* Mounted only while open, so every opening starts with an empty form. */}
      {open && <CreateNode {...props} onCancel={() => onOpenChange(false)} />}
    </Modal>
  );
}

/** Before creating, looks for a node it would duplicate and asks first. */
function CreateNode({ spaceId, pending, error, onSubmit, onShowExisting, onCancel }: CreateProps) {
  const [checking, setChecking] = useState(false);
  // The fields that were checked, so "create anyway" saves exactly what the warning was about.
  const [warning, setWarning] = useState<{ fields: NodeFields; existing: SimilarNode[] } | null>(null);

  const check = async (fields: NodeFields) => {
    setChecking(true);
    setWarning(null);
    // The check only helps; if it fails, creating goes ahead.
    const existing = await findExistingLike(spaceId, fields).catch(() => []);
    setChecking(false);
    if (existing.length > 0) setWarning({ fields, existing });
    else onSubmit(fields);
  };

  return (
    <>
      <NodeForm
        initial={{ name: '', label: '', description: null, aliases: [] }}
        spaceId={spaceId}
        pending={pending || checking}
        error={error}
        submitLabel={checking ? 'Sprawdzam…' : 'Dodaj'}
        onSubmit={(fields) => void check(fields)}
        onCancel={onCancel}
      />
      {warning && (
        <div role="alert" className="mt-4 border-l-4 border-amber-500 bg-amber-50 px-3 py-2">
          <p className="text-sm font-semibold text-amber-900">
            {warning.existing.length === 1 ? 'Podobny węzeł już istnieje' : 'Podobne węzły już istnieją'}
          </p>
          <ul className="mt-2 space-y-1.5">
            {warning.existing.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-amber-900">
                  {n.name} <span className="text-xs text-amber-700">({n.label})</span>
                </span>
                <Button variant="secondary" size="sm" className="h-7 px-2" onClick={() => onShowExisting(n.id)}>
                  Pokaż
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => onSubmit(warning.fields)}>
              Utwórz mimo to
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export function EdgeTypeForm({
  initial,
  pending,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: string;
  pending: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (type: string) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(toIdentifier(type));
      }}
      className="space-y-2"
    >
      <Field label="Typ powiązania">
        <TextInput
          required
          autoFocus
          placeholder="np. WORKS_AT"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />
      </Field>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Anuluj
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? 'Zapisuję…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
