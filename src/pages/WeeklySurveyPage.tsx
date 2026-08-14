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
import './WeeklySurvey.css';

export function WeeklySurveyPage() {
  const navigate = useNavigate();
  const { instructor, arboxConnection, arboxClients } = useApp();
  const isLiveArbox = arboxConnection.connected && arboxConnection.dataSource === 'live';
  const [clients, setClients] = useState<SurveyClient[]>(() => loadSurveyClients());
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const instructorName = instructor.name || 'your instructor';

  const previewUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({
      title: 'Class feedback',
      instructor: instructorName,
    });
    return `${origin}/feedback/demo?${params.toString()}`;
  }, [instructorName]);

  const messagePreview = useMemo(
    () =>
      `Hi! Thanks for joining "Class name" today. ` +
      `We'd love your feedback — it only takes a minute: ${previewUrl}`,
    [previewUrl]
  );

  const addClient = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName) {
      setError('Enter a client name');
      return;
    }
    if (!isValidPhone(trimmedPhone)) {
      setError('Enter a valid phone number (e.g. 0501234567)');
      return;
    }
    const duplicate = clients.some(
      (c) => c.phone.replace(/\D/g, '') === trimmedPhone.replace(/\D/g, '')
    );
    if (duplicate) {
      setError('This phone number is already on the list');
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
        <h1 className="page-title">Clients</h1>
        <p className="page-subtitle">
          {isLiveArbox
            ? `${arboxClients.length} clients synced from Arbox. Tap a class in Schedule to see who is enrolled.`
            : 'Add clients here, then select who attended each class in Schedule.'}
        </p>
      </div>

      {isLiveArbox ? (
        <>
          <p className="section-title">
            {arboxClients.length === 0 ? 'No clients in Arbox' : `${arboxClients.length} clients from Arbox`}
          </p>
          {arboxClients.length === 0 ? (
            <div className="card weekly-survey-empty-list">
              <p>Your Arbox account has no clients yet, or they could not be loaded.</p>
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
                      {client.phone || client.email || 'No contact on file'}
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
            placeholder="Client name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          <input
            className="input"
            type="tel"
            inputMode="tel"
            placeholder="Phone (0501234567)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
          <button type="submit" className="btn btn-primary">
            <Plus size={16} /> Add client
          </button>
        </form>
      </div>

      {error && (
        <p className="weekly-survey-error" role="alert">
          {error}
        </p>
      )}

      <p className="section-title">Message sent after class</p>
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
          <ExternalLink size={14} /> Preview feedback form
        </button>
      </div>

      <p className="section-title">
        {clients.length === 0 ? 'No clients yet' : `${clients.length} clients`}
      </p>

      {clients.length === 0 ? (
        <div className="card weekly-survey-empty-list">
          <p>Add a name and phone number to build your list.</p>
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
                aria-label={`Remove ${client.name}`}
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
