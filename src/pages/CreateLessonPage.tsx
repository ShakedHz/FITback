import { useNavigate } from 'react-router-dom';
import { PenLine, LayoutTemplate, Sparkles, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/i18n';
import './CreateLesson.css';

const options = [
  {
    id: 'new',
    icon: PenLine,
    titleKey: 'create.buildTitle',
    descKey: 'create.buildDesc',
    path: '/builder?blank=1',
    draftMode: 'blank' as const,
  },
  {
    id: 'template',
    icon: LayoutTemplate,
    titleKey: 'create.templateTitle',
    descKey: 'create.templateDesc',
    path: '/builder?template=1',
    draftMode: 'template' as const,
  },
  {
    id: 'ai',
    icon: Sparkles,
    titleKey: 'create.aiTitle',
    descKey: 'create.aiDesc',
    path: '/create/ai',
  },
];

export function CreateLessonPage() {
  const navigate = useNavigate();
  const { resetLessonDraft } = useApp();
  const { t } = useI18n();

  const open = (path: string, draftMode?: 'blank' | 'template') => {
    if (draftMode) resetLessonDraft(draftMode);
    navigate(path);
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">{t('create.title')}</h1>
        <p className="page-subtitle">{t('create.subtitle')}</p>
      </div>

      <div className="create-list">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              className="create-option"
              onClick={() => open(opt.path, opt.draftMode)}
            >
              <span className="create-option__icon">
                <Icon size={20} strokeWidth={1.75} aria-hidden />
              </span>
              <span className="create-option__body">
                <span className="create-option__title">{t(opt.titleKey)}</span>
                <span className="create-option__desc">{t(opt.descKey)}</span>
              </span>
              <ChevronRight className="rtl-flip create-option__chevron" size={18} aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}
