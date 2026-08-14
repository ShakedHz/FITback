import {
  TRAINING_TYPES,
  TRAINING_TYPE_LABELS,
  type TrainingType,
} from '@/data/trainingTypes';
import './SpecialtyPicker.css';

interface SpecialtyPickerProps {
  value: TrainingType[];
  onChange: (next: TrainingType[]) => void;
  label?: string;
}

export function SpecialtyPicker({
  value,
  onChange,
  label = 'What do you teach?',
}: SpecialtyPickerProps) {
  const toggle = (type: TrainingType) => {
    if (value.includes(type)) {
      onChange(value.filter((t) => t !== type));
    } else {
      onChange([...value, type]);
    }
  };

  return (
    <fieldset className="specialty-picker">
      <legend className="specialty-picker__label">{label}</legend>
      <div className="specialty-picker__list" role="group" aria-label={label}>
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
              <span className="specialty-picker__text">{TRAINING_TYPE_LABELS[type]}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
