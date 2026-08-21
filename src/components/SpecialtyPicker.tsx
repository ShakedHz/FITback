import {
  TRAINING_TYPES,
  type TrainingType,
} from '@/data/trainingTypes';
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
  const pickerLabel = label ?? t('auth.teach');

  const toggle = (type: TrainingType) => {
    if (value.includes(type)) {
      onChange(value.filter((item) => item !== type));
    } else {
      onChange([...value, type]);
    }
  };

  return (
    <fieldset className="specialty-picker">
      <legend className="specialty-picker__label">{pickerLabel}</legend>
      <div className="specialty-picker__list" role="group" aria-label={pickerLabel}>
        {TRAINING_TYPES.map((type) => {
          const selected = value.includes(type);
          const id = `specialty-${type}`;
          return (
            <label key={type} htmlFor={id} className="specialty-picker__row">
              <input
                id={id}
                type="checkbox"
                className="specialty-picker__checkbox"
                checked={selected}
                onChange={() => toggle(type)}
              />
              <span className="specialty-picker__text">{trainingLabel(type, t)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
