import { useMemo } from 'react';
import { ClientPicker } from '@/components/ClientPicker';
import { BackButton } from '@/components/IconToolbar';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/i18n';
import type { SurveyClient } from '@/services/surveyClients';
import './Clients.css';

export function ClientsPage() {
  const { t } = useI18n();
  const { rosterClients, arboxClients, arboxConnection } = useApp();
  const isLiveArbox = arboxConnection.connected && arboxConnection.dataSource === 'live';

  const clients = useMemo<SurveyClient[]>(() => {
    if (!isLiveArbox) return rosterClients;
    return arboxClients.map((client) => ({
      id: client.id,
      name: client.name,
      phone: client.phone ?? '',
      createdAt: '',
    }));
  }, [isLiveArbox, arboxClients, rosterClients]);

  return (
    <div className="page fade-in">
      <BackButton to="/settings" label={t('common.back')} />

      <header className="page-header">
        <h1 className="page-title">{t('clients.title')}</h1>
        <p className="page-subtitle">
          {isLiveArbox ? t('clients.arboxHint') : t('clients.subtitle')}
        </p>
      </header>

      <div className="card clients-card">
        <ClientPicker
          className="client-picker--page"
          clients={clients}
          selectable={false}
          canManage={!isLiveArbox}
          emptyLabel={isLiveArbox ? t('schedule.noArboxClients') : undefined}
        />
      </div>
    </div>
  );
}
