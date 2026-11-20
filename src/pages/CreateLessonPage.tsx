import { useNavigate } from 'react-router-dom';
import { PenLine, Sparkles, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/i18n';
import './CreateLesson.css';

export function CreateLessonPage() {
  const navigate = useNavigate();
  const { resetLessonDraft } = useApp();
  const { t } = useI18n();

  const openBlank = () => {
    resetLessonDraft();
    navigate('/builder?blank=1&from=create');
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
    </div>
  );
}
