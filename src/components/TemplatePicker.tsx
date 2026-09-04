import { createPortal } from 'react-dom';
import { ChevronRight, LayoutTemplate, X } from 'lucide-react';
import { IconButton } from '@/components/IconToolbar';
import { levelLabel, trainingLabel, useI18n } from '@/i18n';
import { canChooseTrainingType } from '@/data/trainingTypes';
import type { Lesson } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import './TemplatePicker.css';

interface TemplatePickerProps {
  templates: Lesson[];
  onSelect: (template: Lesson) => void;
  onClose: () => void;
}

export function TemplatePicker({ templates, onSelect, onClose }: TemplatePickerProps) {
  const { t } = useI18n();
  const { instructor } = useApp();
  const showType = canChooseTrainingType(instructor.specialties);
  const shell = document.getElementById('app-shell');
  if (!shell) return null;

  return createPortal(
    <div className="tpl-picker" onClick={onClose} role="presentation">
      <div className="tpl-picker__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="tpl-picker__handle" />
        <div className="tpl-picker__top">
          <h2 className="tpl-picker__title">{t('library.pickTemplate')}</h2>
          <IconButton onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </IconButton>
        </div>
        {templates.length === 0 ? (
          <p className="tpl-picker__empty">{t('library.noTemplates')}</p>
        ) : (
          templates.map((tpl) => {
            const title = tpl.title.trim() || t('library.untitledTemplate');
            const facts = [
              `${tpl.duration} ${t('common.min')}`,
              levelLabel(tpl.level, t),
              ...(showType ? [trainingLabel(tpl.trainingType, t)] : []),
            ];
            return (
              <button
                key={tpl.id}
                type="button"
                className="tpl-picker__row"
                onClick={() => onSelect(tpl)}
              >
                <span className="tpl-picker__icon">
                  <LayoutTemplate size={18} />
                </span>
                <span className="tpl-picker__body">
                  <span className="tpl-picker__name">{title}</span>
                  <span className="tpl-picker__facts">{facts.join(' · ')}</span>
                </span>
                <ChevronRight className="rtl-flip" size={18} color="var(--color-primary-bright)" />
              </button>
            );
          })
        )}
      </div>
    </div>,
    shell
  );
}
