import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine, LayoutTemplate, Sparkles, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TemplatePicker } from '@/components/TemplatePicker';
import type { Lesson } from '@/data/mockData';
import { useI18n } from '@/i18n';
import './CreateLesson.css';

export function CreateLessonPage() {
  const navigate = useNavigate();
  const { resetLessonDraft, savedTemplates, startLessonFromTemplate } = useApp();
  const { t } = useI18n();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const openBlank = () => {
    resetLessonDraft();
    navigate('/builder?blank=1&from=create');
  };

  const openFromTemplate = (template: Lesson) => {
    startLessonFromTemplate(template);
    setShowTemplatePicker(false);
    navigate(`/builder?fromTemplateId=${template.id}&from=create`);
  };

  const onTemplateClick = () => {
    if (savedTemplates.length === 0) {
      navigate('/library?tab=templates');
      return;
    }
    setShowTemplatePicker(true);
  };

  return (
    <div className="page fade-in create-page">
      <div className="page-header">
        <h1 className="page-title">{t('create.title')}</h1>
        <p className="page-subtitle">{t('create.subtitle')}</p>
      </div>

      <div className="create-list">
        <button type="button" className="create-option" onClick={openBlank}>
          <span className="create-option__icon" style={{ background: 'var(--color-primary)22', color: 'var(--color-primary)' }}>
            <PenLine size={22} />
          </span>
          <span className="create-option__body">
            <span className="create-option__title">{t('create.buildTitle')}</span>
            <span className="create-option__desc">{t('create.buildDesc')}</span>
          </span>
          <ChevronRight className="rtl-flip create-option__chevron" size={18} />
        </button>

        <button type="button" className="create-option" onClick={onTemplateClick}>
          <span className="create-option__icon" style={{ background: '#fbbf2422', color: '#fbbf24' }}>
            <LayoutTemplate size={22} />
          </span>
          <span className="create-option__body">
            <span className="create-option__title">{t('create.templateTitle')}</span>
            <span className="create-option__desc">{t('create.templateDesc')}</span>
          </span>
          <ChevronRight className="rtl-flip create-option__chevron" size={18} />
        </button>

        <button type="button" className="create-option create-option--highlight" onClick={() => navigate('/create/ai')}>
          <span className="create-option__icon" style={{ background: '#34d39922', color: '#34d399' }}>
            <Sparkles size={22} />
          </span>
          <span className="create-option__body">
            <span className="create-option__title">{t('create.aiTitle')}</span>
            <span className="create-option__desc">{t('create.aiDesc')}</span>
          </span>
          <ChevronRight className="rtl-flip create-option__chevron" size={18} />
        </button>
      </div>
      {showTemplatePicker && (
        <TemplatePicker
          templates={savedTemplates}
          onSelect={openFromTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}
    </div>
  );
}
