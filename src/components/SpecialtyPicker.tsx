import { useRef, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { TRAINING_TYPES, type TrainingType } from '@/data/trainingTypes';
import {
  addCustomTrainingType,
  removeCustomTrainingType,
  useCustomTrainingTypes,
} from '@/data/customTrainingTypes';
import { IconButton } from '@/components/IconToolbar';
import { trainingLabel, useI18n } from '@/i18n';
import './SpecialtyPicker.css';

interface SpecialtyPickerProps {
  value: TrainingType[];
  onChange: (next: TrainingType[]) => void;
  label?: string;
}

export function SpecialtyPicker({
  value,
  onChange,
  label,
}: SpecialtyPickerProps) {
  const { t } = useI18n();
  const customTypes = useCustomTrainingTypes();
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickerLabel = label ?? t('auth.teach');

  const toggle = (type: TrainingType) => {
    if (value.includes(type)) {
      onChange(value.filter((item) => item !== type));
    } else {
      onChange([...value, type]);
    }
  };

  const openAdd = () => {
    setAdding(true);
    setDraftName('');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const cancelAdd = () => {
    setAdding(false);
    setDraftName('');
  };

  const commitAdd = () => {
    const created = addCustomTrainingType(draftName);
    if (!created) {
      cancelAdd();
      return;
    }
    if (!value.includes(created.id)) onChange([...value, created.id]);
    cancelAdd();
  };

  const removeType = (id: string) => {
    removeCustomTrainingType(id);
    if (value.includes(id)) onChange(value.filter((item) => item !== id));
  };

  const rows: TrainingType[] = [...TRAINING_TYPES, ...customTypes.map((item) => item.id)];

  return (
    <fieldset className="specialty-picker">
      <legend className="specialty-picker__label">
        <span>{pickerLabel}</span>
        {customTypes.length > 0 && (
          <IconButton
            className="specialty-picker__edit"
            aria-label={t('auth.editTypes')}
            aria-pressed={editing}
            onClick={() => setEditing((prev) => !prev)}
          >
            {editing ? <Check size={16} /> : <Pencil size={16} />}
          </IconButton>
        )}
      </legend>

      <div className="specialty-picker__list" role="group" aria-label={pickerLabel}>
        {rows.map((type) => {
          const id = `specialty-${type}`;
          const custom = customTypes.find((item) => item.id === type);
          return (
            <div key={type} className="specialty-picker__row">
              <label htmlFor={id} className="specialty-picker__option">
                <input
                  id={id}
                  type="checkbox"
                  className="specialty-picker__checkbox"
                  checked={value.includes(type)}
                  onChange={() => toggle(type)}
                />
                <span className="specialty-picker__text">{trainingLabel(type, t)}</span>
              </label>
              {editing && custom && (
                <IconButton
                  danger
                  className="specialty-picker__remove"
                  aria-label={t('auth.removeType', { name: custom.name })}
                  onClick={() => removeType(custom.id)}
                >
                  <Trash2 size={16} />
                </IconButton>
              )}
            </div>
          );
        })}

        {adding ? (
          <div className="specialty-picker__row specialty-picker__row--add">
            <label className="specialty-picker__field">
              <span className="specialty-picker__field-label">{t('auth.otherTypeName')}</span>
              <input
                ref={inputRef}
                type="text"
                className="specialty-picker__input"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitAdd();
                  }
                  if (e.key === 'Escape') cancelAdd();
                }}
              />
            </label>
            <div className="specialty-picker__add-actions">
              <IconButton
                aria-label={t('common.add')}
                disabled={draftName.trim().length === 0}
                onClick={commitAdd}
              >
                <Check size={16} />
              </IconButton>
              <IconButton aria-label={t('common.cancel')} onClick={cancelAdd}>
                <X size={16} />
              </IconButton>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="specialty-picker__row specialty-picker__other"
            onClick={openAdd}
          >
            <Plus size={18} />
            <span className="specialty-picker__text">{t('auth.otherType')}</span>
          </button>
        )}
      </div>
    </fieldset>
  );
}
