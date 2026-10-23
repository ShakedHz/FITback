import { useMemo, useState, type FormEvent } from 'react';
import { Check, Plus, Search, Trash2 } from 'lucide-react';
import { addSurveyClient, removeSurveyClient, type SurveyClient } from '@/services/surveyClients';
import { isValidEmail, normalizeEmail } from '@/utils/email';
import { isValidPhone } from '@/utils/sms';
import { useI18n } from '@/i18n';

const SEARCH_FROM = 8;

interface ClientPickerProps {
  clients: SurveyClient[];
  isSelected: (client: SurveyClient) => boolean;
  onToggle: (client: SurveyClient) => void;
  onAdded?: (client: SurveyClient) => void;
  onRemoved?: (client: SurveyClient) => void;
  /** Off when the roster is owned by Arbox and can't be edited here. */
  canManage?: boolean;
  emptyLabel?: string;
}

export function ClientPicker({
  clients,
  isSelected,
  onToggle,
  onAdded,
  onRemoved,
  canManage = true,
  emptyLabel,
}: ClientPickerProps) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.phone.replace(/\D/g, '').includes(term) ||
        (c.email && c.email.toLowerCase().includes(term))
    );
  }, [clients, query]);

  const closeForm = () => {
    setAdding(false);
    setName('');
    setPhone('');
    setEmail('');
    setError(null);
  };

  const contactLabel = (client: SurveyClient) => {
    if (client.phone) return client.phone;
    if (client.email) return client.email;
    return t('clients.noContact');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    const phoneOk = trimmedPhone ? isValidPhone(trimmedPhone) : false;
    const emailOk = trimmedEmail ? isValidEmail(trimmedEmail) : false;

    if (!trimmedName) {
      setError(t('errors.clientName'));
      return;
    }
    if (!phoneOk && !emailOk) {
      setError(t('errors.clientContact'));
      return;
    }
    if (trimmedPhone && !phoneOk) {
      setError(t('errors.clientPhone'));
      return;
    }
    if (trimmedEmail && !emailOk) {
      setError(t('errors.email'));
      return;
    }
    if (phoneOk) {
      const digits = trimmedPhone.replace(/\D/g, '');
      if (clients.some((c) => c.phone.replace(/\D/g, '') === digits)) {
        setError(t('errors.phoneExists'));
        return;
      }
    }
    if (emailOk) {
      const key = normalizeEmail(trimmedEmail);
      if (clients.some((c) => c.email && normalizeEmail(c.email) === key)) {
        setError(t('errors.emailExists'));
        return;
      }
    }

    onAdded?.(
      addSurveyClient({
        name: trimmedName,
        phone: phoneOk ? trimmedPhone : undefined,
        email: emailOk ? trimmedEmail : undefined,
      })
    );
    closeForm();
  };

  const remove = (client: SurveyClient) => {
    removeSurveyClient(client.id);
    onRemoved?.(client);
  };

  return (
    <div className="client-picker">
      {clients.length > SEARCH_FROM && (
        <div className="client-picker__search">
          <Search size={15} className="client-picker__search-icon" aria-hidden />
          <input
            className="input"
            type="search"
            placeholder={t('clients.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {clients.length === 0 ? (
        <p className="schedule-attendees__empty">{emptyLabel ?? t('clients.emptyList')}</p>
      ) : visible.length === 0 ? (
        <p className="schedule-attendees__empty">{t('clients.noMatch')}</p>
      ) : (
        <ul className="client-picker__list">
          {visible.map((client) => {
            const on = isSelected(client);
            return (
              <li key={client.id} className={`client-row${on ? ' client-row--on' : ''}`}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  className="client-row__main"
                  onClick={() => onToggle(client)}
                >
                  <span className="client-row__box" aria-hidden>
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span className="client-row__text">
                    <span className="client-row__name">{client.name}</span>
                    <span className="client-row__phone">{contactLabel(client)}</span>
                  </span>
                </button>
                {canManage && managing && (
                  <button
                    type="button"
                    className="client-row__delete"
                    onClick={() => remove(client)}
                    aria-label={t('clients.removeAria', { name: client.name })}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canManage && managing && <p className="client-picker__hint">{t('clients.manageHint')}</p>}

      {!canManage ? null : adding ? (
        <form className="client-picker__form" onSubmit={submit}>
          <input
            className="input"
            type="text"
            placeholder={t('clients.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            autoFocus
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
          <input
            className="input"
            type="email"
            inputMode="email"
            placeholder={t('clients.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          {error && (
            <p className="client-picker__error" role="alert">
              {error}
            </p>
          )}
          <div className="client-picker__form-actions">
            <button type="submit" className="btn btn-primary btn-sm">
              {t('clients.add')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={closeForm}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <div className="client-picker__actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm client-picker__add"
            onClick={() => setAdding(true)}
          >
            <Plus size={14} /> {t('clients.addNew')}
          </button>
          {clients.length > 0 && (
            <button
              type="button"
              className="client-picker__manage"
              onClick={() => setManaging((v) => !v)}
            >
              {managing ? t('common.done') : t('clients.manage')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
