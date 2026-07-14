import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileCode, Trash2, Eye, Plus } from 'lucide-react';
import { useOpenWithPrefs, type OpenHandler } from '@/hooks/use-open-with-prefs';
import { usePreviewAssociations, ASSIGNABLE_PREVIEW_TYPES } from '@/lib/preview-associations';
import type { PreviewType } from '@/lib/preview-factory';
import { SectionTitle, Divider } from './shared';

const HANDLER_LABELS: Record<OpenHandler, string> = {
  'xplorer-editor': 'openWith.xplorerEditor',
  vscode: 'openWith.vscode',
  system: 'openWith.systemDefault',
};

// Technical, language-neutral labels for the assignable preview types.
const PREVIEW_TYPE_LABELS: Record<PreviewType, string> = {
  text: 'Text',
  code: 'Code',
  markdown: 'Markdown',
  json: 'JSON',
  csv: 'CSV',
  image: 'Image',
  pdf: 'PDF',
  document: 'Document',
  spreadsheet: 'Spreadsheet',
  video: 'Video',
  audio: 'Audio',
  archive: 'Archive',
  folder: 'Folder',
  unknown: 'Unknown',
};

const FileAssociationsSettings = () => {
  const { t } = useTranslation();
  const { prefs, clearPreference, clearAll } = useOpenWithPrefs();
  const {
    associations,
    set: setPreview,
    remove: removePreview,
    clearAll: clearAllPreview,
  } = usePreviewAssociations();

  const [extInput, setExtInput] = useState('');
  const [typeInput, setTypeInput] = useState<PreviewType>('text');

  const entries = Object.entries(prefs);
  const previewEntries = Object.entries(associations).sort(([a], [b]) => a.localeCompare(b));

  const handleAddPreview = () => {
    const ext = extInput.trim().replace(/^\./, '').toLowerCase();
    if (!ext) return;
    setPreview(ext, typeInput);
    setExtInput('');
  };

  return (
    <div className="space-y-1">
      <SectionTitle title={t('settings.fileAssociations.title')} />
      <p className="text-xp-text-secondary px-4 pb-2 text-xs">
        {t('settings.fileAssociations.description')}
      </p>

      {entries.length === 0 ? (
        <div className="text-xp-text-secondary px-4 py-6 text-center text-sm">
          {t('settings.fileAssociations.noPreferences')}
        </div>
      ) : (
        <>
          <div className="space-y-1 px-2">
            {entries.map(([ext, handler]) => (
              <div
                key={ext}
                className="hover:bg-xp-surface-light/50 flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileCode size={16} className="text-xp-text-secondary shrink-0" />
                  <div>
                    <span className="text-xp-text text-sm font-medium">.{ext}</span>
                    <span className="text-xp-text-secondary ml-2 text-xs">
                      → {t(HANDLER_LABELS[handler])}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => clearPreference(ext)}
                  className="text-xp-text-secondary rounded-md p-1.5 transition-colors hover:text-red-400"
                  title={t('settings.fileAssociations.reset')}
                  aria-label={t('settings.fileAssociations.resetExt', { ext })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="px-4 py-2">
            <button
              onClick={clearAll}
              className="text-xp-text-secondary text-sm transition-colors hover:text-red-400"
            >
              {t('settings.fileAssociations.resetAll')}
            </button>
          </div>
        </>
      )}

      <Divider />

      <SectionTitle title={t('settings.previewAssociations.title')} />
      <p className="text-xp-text-secondary px-4 pb-2 text-xs">
        {t('settings.previewAssociations.description')}
      </p>

      <div className="flex items-center gap-2 px-4 pb-2">
        <input
          type="text"
          value={extInput}
          onChange={(e) => setExtInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddPreview();
          }}
          placeholder={t('settings.previewAssociations.extPlaceholder')}
          aria-label={t('settings.previewAssociations.extPlaceholder')}
          className="bg-xp-surface border-xp-border text-xp-text focus:border-xp-accent w-32 rounded-md border px-2 py-1.5 text-sm outline-none"
        />
        <select
          value={typeInput}
          onChange={(e) => setTypeInput(e.target.value as PreviewType)}
          aria-label={t('settings.previewAssociations.typeLabel')}
          className="bg-xp-surface border-xp-border text-xp-text focus:border-xp-accent rounded-md border px-2 py-1.5 text-sm outline-none"
        >
          {ASSIGNABLE_PREVIEW_TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {PREVIEW_TYPE_LABELS[ty]}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddPreview}
          disabled={!extInput.trim()}
          className="bg-xp-accent/20 text-xp-accent hover:bg-xp-accent/30 flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={14} />
          {t('settings.previewAssociations.add')}
        </button>
      </div>

      {previewEntries.length === 0 ? (
        <div className="text-xp-text-secondary px-4 py-6 text-center text-sm">
          {t('settings.previewAssociations.noPreferences')}
        </div>
      ) : (
        <>
          <div className="space-y-1 px-2">
            {previewEntries.map(([ext, type]) => (
              <div
                key={ext}
                className="hover:bg-xp-surface-light/50 flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Eye size={16} className="text-xp-text-secondary shrink-0" />
                  <div>
                    <span className="text-xp-text text-sm font-medium">.{ext}</span>
                    <span className="text-xp-text-secondary ml-2 text-xs">
                      → {PREVIEW_TYPE_LABELS[type]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removePreview(ext)}
                  className="text-xp-text-secondary rounded-md p-1.5 transition-colors hover:text-red-400"
                  title={t('settings.previewAssociations.reset')}
                  aria-label={t('settings.previewAssociations.resetExt', { ext })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="px-4 py-2">
            <button
              onClick={clearAllPreview}
              className="text-xp-text-secondary text-sm transition-colors hover:text-red-400"
            >
              {t('settings.previewAssociations.resetAll')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FileAssociationsSettings;
