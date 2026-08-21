import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  addSurveyClient,
  loadSurveyClients,
  removeSurveyClient,
  type SurveyClient,
} from '@/services/surveyClients';
import { isValidPhone } from '@/utils/sms';
import { useI18n } from '@/i18n';
import './WeeklySurvey.css';

export function WeeklySurveyPage() {
  const navigate = useNavigate();
  const { instructor, arboxConnection, arboxClients } = useApp();
  const { t } = useI18n();
  const isLiveArbox = arboxConnection.connected && arboxConnection.dataSource === 'live';
  const [clients, setClients] = useState<SurveyClient[]>(() => loadSurveyClients());
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const instructorName = instructor.name || t('clients.instructorFallback');

  const previewUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({
      title: t('feedback.classFeedback'),
      instructor: instructorName,
    });
    return `${origin}/feedback/demo?${params.toString()}`;
  }, [instructorName, t]);

  const messagePreview = useMemo(
    () =>
      t('clients.smsPreview', { url: previewUrl }),
    [previewUrl, t]
  );

  const addClient = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName) {
      setError(t('errors.clientName'));
      return;
    }
    if (!isValidPhone(trimmedPhone)) {
      setError(t('errors.clientPhone'));
      return;
    }
    const duplicate = clients.some(
      (c) => c.phone.replace(/\D/g, '') === trimmedPhone.replace(/\D/g, '')
    );
    if (duplicate) {
      setError(t('errors.phoneExists'));
      return;
    }
    const client = addSurveyClient({ name: trimmedName, phone: trimmedPhone });
    setClients((prev) => [client, ...prev]);
    setName('');
    setPhone('');
  };

  const removeClient = (id: string) => {
    setClients(removeSurveyClient(id));
  };

  return (
    <div className="page fade-in weekly-survey">
      <div className="page-header">
        <h1 className="page-title">{t('clients.title')}</h1>
        <p className="page-subtitle">
          {isLiveArbox
            ? t('clients.synced', { count: arboxClients.length })
            : t('clients.addHint')}
        </p>
      </div>

      {isLiveArbox ? (
        <>
          <p className="section-title">
            {arboxClients.length === 0 ? t('clients.noneInArbox') : t('clients.fromArbox', { count: arboxClients.length })}
          </p>
          {arboxClients.length === 0 ? (
            <div className="card weekly-survey-empty-list">
              <p>{t('clients.arboxEmpty')}</p>
            </div>
          ) : (
            <div className="card weekly-survey-clients">
              {arboxClients.map((client) => (
                <div key={client.id} className="weekly-survey-client">
                  <span className="weekly-survey-client__avatar">
                    {client.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="weekly-survey-client__body">
                    <p className="weekly-survey-client__name">{client.name}</p>
                    <p className="weekly-survey-client__contact">
                      {client.phone || client.email || t('clients.noContact')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
      <div className="card weekly-survey-add">
        <form className="weekly-survey-add__form" onSubmit={addClient}>
          <input
            className="input"
            type="text"
            placeholder={t('clients.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          <input
            className="input"
            type="tel"
            inputMode="tel"
            placeholder={t('clients.phonePlaceholder')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
          <button type="submit" className="btn btn-primary">
            <Plus size={16} /> {t('clients.add')}
          </button>
        </form>
      </div>

      {error && (
        <p className="weekly-survey-error" role="alert">
          {error}
        </p>
      )}

      <p className="section-title">{t('clients.messageAfter')}</p>
      <div className="card weekly-survey-message">
        <p>{messagePreview}</p>
      </div>
      <div className="weekly-survey-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            const url = new URL(previewUrl);
            navigate(`${url.pathname}${url.search}`);
          }}
        >
          <ExternalLink size={14} /> {t('clients.previewForm')}
        </button>
      </div>

      <p className="section-title">
        {clients.length === 0 ? t('clients.noneYet') : t('clients.count', { count: clients.length })}
      </p>

      {clients.length === 0 ? (
        <div className="card weekly-survey-empty-list">
          <p>{t('clients.emptyList')}</p>
        </div>
      ) : (
        <div className="card weekly-survey-clients">
          {clients.map((client) => (
            <div key={client.id} className="weekly-survey-client">
              <span className="weekly-survey-client__avatar">
                {client.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="weekly-survey-client__body">
                <p className="weekly-survey-client__name">{client.name}</p>
                <p className="weekly-survey-client__contact">{client.phone}</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm weekly-survey-client__remove"
                onClick={() => removeClient(client.id)}
                aria-label={t('clients.removeAria', { name: client.name })}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}
