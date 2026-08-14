import { useNavigate } from 'react-router-dom';
import { PenLine, LayoutTemplate, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const options = [
  {
    id: 'new',
    icon: PenLine,
    title: 'Build a new lesson',
    desc: 'Start empty — add every exercise yourself',
    path: '/builder?blank=1',
    color: '#8b5cf6',
    draftMode: 'blank' as const,
  },
  {
    id: 'template',
    icon: LayoutTemplate,
    title: 'Import from template',
    desc: 'Use a ready-made professional lesson plan',
    path: '/builder?template=1',
    color: '#fbbf24',
    draftMode: 'template' as const,
  },
  {
    id: 'ai',
    icon: Sparkles,
    title: 'Create with AI',
    desc: 'Design a class from client ratings and improvement notes',
    path: '/create/ai',
    color: '#34d399',
    highlight: true,
  },
];

export function CreateLessonPage() {
  const navigate = useNavigate();
  const { resetLessonDraft } = useApp();

  const open = (path: string, draftMode?: 'blank' | 'template') => {
    if (draftMode) resetLessonDraft(draftMode);
    navigate(path);
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Create a new lesson</h1>
        <p className="page-subtitle">Choose how to get started</p>
      </div>

      {options.map((opt) => {
        const Icon = opt.icon;
        return (
          <div
            key={opt.id}
            className="card card-glow"
            style={{
              cursor: 'pointer',
              ...(opt.highlight
                ? {
                    borderColor: 'rgba(52, 211, 153, 0.35)',
                    background:
                      'linear-gradient(145deg, rgba(52, 211, 153, 0.12), rgba(26, 18, 40, 0.92))',
                  }
                : undefined),
            }}
            onClick={() => open(opt.path, opt.draftMode)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: `${opt.color}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={24} color={opt.color} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>{opt.title}</p>
                <p style={{ fontSize: 13, color: '#94a3b8' }}>{opt.desc}</p>
              </div>
              <span style={{ color: opt.highlight ? '#34d399' : '#a78bfa' }}>→</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
