import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Pencil, ImagePlus, X, Check } from 'lucide-react';
import {
  useCustomCommands,
  type CustomCommand,
  type CustomCommandTarget,
} from '@/lib/custom-commands';
import {
  renderCustomCommandIcon,
  isCustomImageIcon,
  CUSTOM_COMMAND_ICON_NAMES,
  DEFAULT_CUSTOM_COMMAND_ICON,
} from '@/lib/custom-command-icons';
import { SectionTitle } from './shared';

const TARGET_ORDER: CustomCommandTarget[] = ['both', 'file', 'folder'];

/** Max size for a custom icon image (kept small since it lives in localStorage). */
const MAX_ICON_BYTES = 128 * 1024;

const CustomCommandsCard = () => {
  const { t } = useTranslation();
  const { commands, create, update, remove } = useCustomCommands();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [command, setCommand] = useState('');
  const [appliesTo, setAppliesTo] = useState<CustomCommandTarget>('folder');
  const [icon, setIcon] = useState<string>(DEFAULT_CUSTOM_COMMAND_ICON);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const targetLabel = (target: CustomCommandTarget): string =>
    t(`settings.customCommands.target.${target}`);

  const resetForm = () => {
    setEditingId(null);
    setLabel('');
    setCommand('');
    setAppliesTo('folder');
    setIcon(DEFAULT_CUSTOM_COMMAND_ICON);
    setError(null);
  };

  const handleSubmit = () => {
    const trimmedLabel = label.trim();
    const trimmedCommand = command.trim();
    if (!trimmedLabel || !trimmedCommand) return;
    if (editingId) {
      update(editingId, { label: trimmedLabel, command: trimmedCommand, appliesTo, icon });
    } else {
      create({ label: trimmedLabel, command: trimmedCommand, appliesTo, icon, enabled: true });
    }
    resetForm();
  };

  const startEdit = (cmd: CustomCommand) => {
    setEditingId(cmd.id);
    setLabel(cmd.label);
    setCommand(cmd.command);
    setAppliesTo(cmd.appliesTo);
    setIcon(cmd.icon || DEFAULT_CUSTOM_COMMAND_ICON);
    setError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_ICON_BYTES) {
      setError(t('settings.customCommands.iconTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setIcon(reader.result);
        setError(null);
      }
    };
    reader.onerror = () => setError(t('settings.customCommands.iconReadError'));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1">
      <SectionTitle title={t('settings.customCommands.title')} />
      <p className="text-xp-text-secondary px-4 pb-2 text-xs">
        {t('settings.customCommands.description')}
      </p>

      {/* Add / edit form */}
      <div className="space-y-2 px-4 pb-3">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t('settings.customCommands.labelPlaceholder')}
          aria-label={t('settings.customCommands.labelPlaceholder')}
          className="bg-xp-surface border-xp-border text-xp-text focus:border-xp-accent w-full rounded-md border px-2 py-1.5 text-sm outline-none"
        />
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          placeholder={t('settings.customCommands.commandPlaceholder')}
          aria-label={t('settings.customCommands.commandPlaceholder')}
          className="bg-xp-surface border-xp-border text-xp-text focus:border-xp-accent w-full rounded-md border px-2 py-1.5 font-mono text-xs outline-none"
        />
        <div className="flex items-center gap-2">
          <select
            value={appliesTo}
            onChange={(e) => setAppliesTo(e.target.value as CustomCommandTarget)}
            aria-label={t('settings.customCommands.appliesTo')}
            className="bg-xp-surface border-xp-border text-xp-text focus:border-xp-accent rounded-md border px-2 py-1.5 text-sm outline-none"
          >
            {TARGET_ORDER.map((target) => (
              <option key={target} value={target}>
                {targetLabel(target)}
              </option>
            ))}
          </select>
          <button
            onClick={handleSubmit}
            disabled={!label.trim() || !command.trim()}
            className="bg-xp-accent/20 text-xp-accent hover:bg-xp-accent/30 flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            {editingId ? <Check size={14} /> : <Plus size={14} />}
            {editingId ? t('settings.customCommands.save') : t('settings.customCommands.add')}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-xp-text-secondary hover:bg-xp-surface-light flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors"
            >
              <X size={14} />
              {t('settings.customCommands.cancel')}
            </button>
          )}
        </div>

        {/* Icon picker */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xp-text-secondary mr-1 text-[11px]">
            {t('settings.customCommands.icon')}
          </span>
          {CUSTOM_COMMAND_ICON_NAMES.map((name) => {
            const selected = icon === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setIcon(name)}
                aria-label={name}
                aria-pressed={selected}
                className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                  selected
                    ? 'border-xp-accent text-xp-accent bg-xp-accent/15'
                    : 'border-xp-border text-xp-text-secondary hover:bg-xp-surface-light'
                }`}
              >
                {renderCustomCommandIcon(name, 14)}
              </button>
            );
          })}
          {/* Custom image upload */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title={t('settings.customCommands.uploadIcon')}
            aria-label={t('settings.customCommands.uploadIcon')}
            aria-pressed={isCustomImageIcon(icon)}
            className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
              isCustomImageIcon(icon)
                ? 'border-xp-accent bg-xp-accent/15'
                : 'border-xp-border text-xp-text-secondary hover:bg-xp-surface-light'
            }`}
          >
            {isCustomImageIcon(icon) ? renderCustomCommandIcon(icon, 16) : <ImagePlus size={14} />}
          </button>
        </div>

        {error && <p className="text-[11px] text-red-400">{error}</p>}

        <p className="text-xp-text-muted text-[11px] leading-relaxed">
          {t('settings.customCommands.hint')}
        </p>
      </div>

      {commands.length === 0 ? (
        <div className="text-xp-text-secondary px-4 py-6 text-center text-sm">
          {t('settings.customCommands.noCommands')}
        </div>
      ) : (
        <div className="space-y-1 px-2">
          {commands.map((cmd) => (
            <div
              key={cmd.id}
              className={`hover:bg-xp-surface-light/50 flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                editingId === cmd.id ? 'bg-xp-accent/10' : ''
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-xp-text-secondary flex h-4 w-4 shrink-0 items-center justify-center">
                  {renderCustomCommandIcon(cmd.icon, 16)}
                </span>
                <div className="min-w-0">
                  <div className="text-xp-text truncate text-sm font-medium">{cmd.label}</div>
                  <div className="text-xp-text-muted truncate font-mono text-[11px]">
                    {cmd.command}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xp-text-secondary text-[11px]">
                  {targetLabel(cmd.appliesTo)}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={cmd.enabled}
                  onClick={() => update(cmd.id, { enabled: !cmd.enabled })}
                  aria-label={t('settings.customCommands.toggle', { label: cmd.label })}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${
                    cmd.enabled ? 'bg-xp-accent' : 'bg-xp-border'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                      cmd.enabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <button
                  onClick={() => startEdit(cmd)}
                  className="text-xp-text-secondary hover:text-xp-accent rounded-md p-1.5 transition-colors"
                  title={t('settings.customCommands.edit')}
                  aria-label={t('settings.customCommands.editCmd', { label: cmd.label })}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => {
                    if (editingId === cmd.id) resetForm();
                    remove(cmd.id);
                  }}
                  className="text-xp-text-secondary rounded-md p-1.5 transition-colors hover:text-red-400"
                  title={t('settings.customCommands.remove')}
                  aria-label={t('settings.customCommands.removeCmd', { label: cmd.label })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomCommandsCard;
