import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Settings, Trash2, Users, X } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { createStudioInvite } from '@/auth/studioInvite';
import { findAccountByEmail } from '@/auth/userStore';
import { IconButton, IconToolbar } from '@/components/IconToolbar';
import { useApp } from '@/context/AppContext';
import type { StudioRole } from '@/data/scheduleTypes';
import {
  filterRemovedStudioTeam,
  getStaffEmail,
  listInvitesForStudio,
  membershipsFromAccount,
  resolveMemberStatus,
  saveStaffEmail,
  type StudioTeamRow,
  type TeamMemberStatus,
} from '@/data/studioOrg';
import { translateError, useI18n } from '@/i18n';
import { buildInviteEmailHtml, sendEmail } from '@/services/emailCloud';
import './StudioTeam.css';

function roleLabel(role: StudioRole, t: (key: string) => string): string {
  switch (role) {
    case 'studio_manager':
      return t('auth.studioManager');
    case 'instructor':
      return t('auth.instructor');
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function statusLabel(status: TeamMemberStatus, t: (key: string) => string): string {
  switch (status) {
    case 'you':
      return t('studio.statusYou');
    case 'joined':
      return t('studio.statusJoined');
    case 'invited':
      return t('studio.statusInvited');
    case 'uninvited':
      return t('studio.statusUninvited');
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function StudioTeamPage() {
  const {
    user,
    isLoading,
    addStudioWithArbox,
    createLocalStudio,
    isActiveStudioManager,
    activeMembership,
    removeStudioInstructor,
  } = useAuth();
  const { arboxConnection, removeArboxTeamMember, updateArboxTeamMember } = useApp();
  const { t } = useI18n();

  const memberships = user?.memberships ?? [];
  const active = activeMembership ?? memberships[0];
  const isManager = isActiveStudioManager;
  const clubId = active?.clubId || arboxConnection.clubId;
  const clubName = active?.clubName || arboxConnection.clubName;

  const [emails, setEmails] = useState<Record<string, string>>({});
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showAddStudio, setShowAddStudio] = useState(false);
  const [studioKey, setStudioKey] = useState('');
  const [localStudioName, setLocalStudioName] = useState('');
  const [pickTeam, setPickTeam] = useState<{ id: string; name: string; role: StudioRole }[] | null>(null);
  const [teamRevision, setTeamRevision] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');

  const teamRows = useMemo(() => {
    if (!clubId) return [];
    const staff = filterRemovedStudioTeam(clubId, arboxConnection.team);
    const invites = listInvitesForStudio(clubId);
    const rows: StudioTeamRow[] = staff.map((member) => {
      const typed = emails[member.id];
      const saved = typed !== undefined ? typed : getStaffEmail(clubId, member.id);
      const email = (saved.trim() || member.email || '').trim().toLowerCase();
      const account = email ? findAccountByEmail(email) : undefined;
      const joinedOnDevice = Boolean(
        account && membershipsFromAccount(account).some((m) => m.clubId === clubId)
      );
      return {
        key: member.id,
        name: member.name,
        role: member.role,
        staffId: member.id,
        email,
        onRoster: true,
        status:
          member.id === user?.arboxStaffId
            ? 'you'
            : resolveMemberStatus({
                email,
                currentUserEmail: user?.email,
                joinedOnDevice,
                clubId,
              }),
      };
    });

    for (const invite of invites) {
      if (rows.some((row) => row.email && row.email === invite.email)) continue;
      if (invite.staffId && rows.some((row) => row.staffId === invite.staffId)) continue;
      const account = findAccountByEmail(invite.email);
      rows.push({
        key: invite.id,
        name: invite.name || invite.email,
        role: invite.role,
        staffId: invite.staffId,
        email: invite.email,
        onRoster: false,
        status: resolveMemberStatus({
          email: invite.email,
          currentUserEmail: user?.email,
          joinedOnDevice: Boolean(
            account && membershipsFromAccount(account).some((m) => m.clubId === clubId)
          ),
          clubId,
        }),
      });
    }
    return rows;
  }, [arboxConnection.team, clubId, emails, user?.email, user?.arboxStaffId, teamRevision]);

  const selected = useMemo(
    () => teamRows.find((row) => row.key === selectedKey) ?? null,
    [teamRows, selectedKey]
  );

  useEffect(() => {
    if (!selected) return;
    setDraftName(selected.name);
    setDraftEmail(emails[selected.staffId ?? selected.key] ?? selected.email);
  }, [selected, emails]);

  const openMember = (row: StudioTeamRow) => {
    setLocalError(null);
    setFlash(null);
    setSelectedKey(row.key);
  };

  const closeSheet = () => setSelectedKey(null);

  const handleRemoveInstructor = (row: StudioTeamRow) => {
    if (!clubId) return;
    const ok = window.confirm(t('studio.removeConfirm', { name: row.name }));
    if (!ok) return;
    setLocalError(null);
    try {
      removeStudioInstructor({
        clubId,
        name: row.name,
        email: emails[row.staffId ?? row.key] ?? row.email,
        staffId: row.staffId,
        inviteId: row.staffId ? undefined : row.key,
      });
      if (row.staffId) removeArboxTeamMember(row.staffId);
      setFlash(t('studio.removed', { name: row.name }));
      setTeamRevision((v) => v + 1);
      closeSheet();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('errors.loginFailed'));
    }
  };

  const saveMember = () => {
    if (!selected || !clubId) return;
    const name = draftName.trim();
    const email = draftEmail.trim().toLowerCase();
    if (!name) {
      setLocalError(t('studio.namePlaceholder'));
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError(t('errors.email'));
      return;
    }
    setLocalError(null);
    const key = selected.staffId ?? selected.key;
    setEmails((prev) => ({ ...prev, [key]: email }));
    if (selected.staffId) {
      saveStaffEmail(clubId, selected.staffId, email);
      updateArboxTeamMember(selected.staffId, { name, email });
    }
    setFlash(t('studio.memberSaved'));
    setTeamRevision((v) => v + 1);
    closeSheet();
  };

  const sendInvite = async (input: {
    email: string;
    name: string;
    staffId?: string;
    role: StudioRole;
  }) => {
    if (!clubId || !clubName || !user) return;
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError(t('errors.email'));
      return;
    }
    setLocalError(null);
    if (input.staffId) saveStaffEmail(clubId, input.staffId, email);
    const { url } = createStudioInvite({
      clubId,
      clubName,
      email,
      name: input.name,
      staffId: input.staffId,
      staffName: input.name,
      role: input.role,
      invitedByName: user.name,
    });
    const role = roleLabel(input.role, t);
    const subject = t('studio.inviteSubject', { studio: clubName });
    const body = t('studio.inviteBody', {
      name: input.name || email,
      from: user.name,
      studio: clubName,
      role,
      url,
    });
    setFlash(t('studio.sending'));
    try {
      await sendEmail({
        to: email,
        subject,
        text: body,
        html: buildInviteEmailHtml(body, url, t('studio.inviteLinkLabel')),
      });
      try {
        await navigator.clipboard.writeText(url);
        setFlash(t('studio.inviteSentCopied'));
      } catch {
        setFlash(t('studio.inviteSent'));
      }
    } catch (err) {
      setLocalError(translateError(t, err instanceof Error ? err.message : 'Email send failed'));
      setFlash(null);
      try {
        await navigator.clipboard.writeText(url);
        setFlash(t('studio.linkCopied'));
      } catch {
        /* ignore */
      }
    }
    setTeamRevision((v) => v + 1);
  };

  const copyInvite = async (input: {
    email: string;
    name: string;
    staffId?: string;
    role: StudioRole;
  }) => {
    if (!clubId || !clubName || !user) return;
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError(t('errors.email'));
      return;
    }
    if (input.staffId) saveStaffEmail(clubId, input.staffId, email);
    const { url } = createStudioInvite({
      clubId,
      clubName,
      email,
      name: input.name,
      staffId: input.staffId,
      staffName: input.name,
      role: input.role,
      invitedByName: user.name,
    });
    await navigator.clipboard.writeText(url);
    setFlash(t('studio.linkCopied'));
    setTeamRevision((v) => v + 1);
  };

  const onGuestInvite = (e: FormEvent) => {
    e.preventDefault();
    void sendInvite({
      email: guestEmail,
      name: guestName || guestEmail,
      role: 'instructor',
    }).then(() => {
      setGuestName('');
      setGuestEmail('');
    });
  };

  const onAddStudio = async (instructorId?: string) => {
    setLocalError(null);
    try {
      const result = await addStudioWithArbox(studioKey, instructorId);
      switch (result.kind) {
        case 'pick_instructor':
          setPickTeam(result.team);
          return;
        case 'authenticated':
          setPickTeam(null);
          setShowAddStudio(false);
          setStudioKey('');
          return;
        default: {
          const _exhaustive: never = result;
          return _exhaustive;
        }
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('errors.arboxFailed'));
    }
  };

  const onCreateLocalStudio = (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    void createLocalStudio(localStudioName || user?.name || 'My Studio').catch((err) => {
      setLocalError(err instanceof Error ? err.message : t('errors.arboxFailed'));
    });
  };

  const canRemove =
    selected &&
    selected.role === 'instructor' &&
    selected.status !== 'you';

  const canInviteNew =
    selected &&
    !selected.onRoster &&
    selected.status !== 'you' &&
    selected.status !== 'joined';

  return (
    <div className="page fade-in studio-page">
      <div className="page-header">
        <h1 className="page-title">{t('studio.title')}</h1>
        <p className="page-subtitle">{clubName || t('studio.noStudio')}</p>
      </div>

      {memberships.length > 1 && (
        <Link to="/settings" className="studio-switch-view-link">
          <Settings size={16} aria-hidden />
          {t('profile.switchViewInSettings')}
          <ChevronRight className="rtl-flip" size={16} aria-hidden />
        </Link>
      )}

      {active && (
        <p className="studio-section__hint studio-role-banner">
          {t('studio.roleHere', { role: roleLabel(active.role, t) })}
        </p>
      )}

      {!active && (
        <section className="studio-section card studio-setup">
          <h2 className="studio-section__title">{t('studio.setupTitle')}</h2>
          <p className="studio-section__hint">{t('studio.setupHint')}</p>
          {localError && <p className="studio-error">{translateError(t, localError)}</p>}
          <form className="studio-local-form" onSubmit={onCreateLocalStudio}>
            <input
              className="input"
              type="text"
              placeholder={t('studio.localNamePlaceholder')}
              value={localStudioName}
              onChange={(e) => setLocalStudioName(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {t('studio.createWithoutArbox')}
            </button>
          </form>
          <p className="studio-section__hint">{t('studio.connectArboxLaterHint')}</p>
        </section>
      )}

      {isManager && clubId && (
        <section className="studio-section">
          <h2 className="studio-section__title">
            <Users size={18} /> {t('studio.teamTitle')}
          </h2>
          <p className="studio-section__hint">{t('studio.teamHint')}</p>
          {flash && <p className="studio-flash">{flash}</p>}
          {localError && !selected && (
            <p className="studio-error">{translateError(t, localError)}</p>
          )}

          {teamRows.length === 0 ? (
            <p className="studio-empty">{t('studio.emptyTeam')}</p>
          ) : (
            <div className="studio-team" role="list">
              {teamRows.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  role="listitem"
                  className="studio-member-row"
                  onClick={() => openMember(row)}
                >
                  <span className="studio-member-row__name">{row.name}</span>
                  <ChevronRight className="rtl-flip studio-member-row__chevron" size={18} aria-hidden />
                </button>
              ))}
            </div>
          )}

          <form className="card studio-guest" onSubmit={onGuestInvite}>
            <h3 className="studio-guest__title">{t('studio.inviteSomeone')}</h3>
            <label className="studio-field">
              <span className="studio-field__label">{t('studio.namePlaceholder')}</span>
              <input
                className="input"
                type="text"
                placeholder={t('studio.namePlaceholder')}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
            </label>
            <label className="studio-field">
              <span className="studio-field__label">{t('studio.emailPlaceholder')}</span>
              <input
                className="input"
                type="email"
                required
                placeholder={t('studio.emailPlaceholder')}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
              />
            </label>
            <button type="submit" className="btn btn-primary">
              {t('studio.sendInvite')}
            </button>
          </form>
        </section>
      )}

      {active && !isManager && (
        <p className="studio-section__hint">{t('studio.instructorNote')}</p>
      )}

      <section className="studio-section">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setShowAddStudio((v) => !v)}
        >
          {t('studio.addStudio')}
        </button>
        {showAddStudio && (
          <div className="card studio-add">
            <p className="studio-section__hint">{t('studio.addStudioHint')}</p>
            <p className="studio-section__hint">{t('studio.demoKeyHint')}</p>
            {pickTeam && pickTeam.length > 1 ? (
              <div className="studio-pick">
                {pickTeam.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className="btn btn-ghost"
                    disabled={isLoading}
                    onClick={() => void onAddStudio(member.id)}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <input
                  className="input"
                  type="password"
                  placeholder={t('auth.arboxKey')}
                  value={studioKey}
                  onChange={(e) => setStudioKey(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isLoading || studioKey.trim().length < 8}
                  onClick={() => void onAddStudio()}
                >
                  {isLoading ? t('auth.loadingStudio') : t('studio.addStudioAction')}
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {selected && (
        <div
          className="studio-sheet-backdrop"
          onClick={closeSheet}
          role="presentation"
        >
          <div
            className="studio-sheet card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
          >
            <IconToolbar className="studio-sheet__toolbar">
              <IconButton onClick={closeSheet} aria-label={t('common.close')}>
                <X size={20} />
              </IconButton>
              {canRemove && (
                <IconButton
                  danger
                  onClick={() => handleRemoveInstructor(selected)}
                  aria-label={t('studio.removeInstructor', { name: selected.name })}
                >
                  <Trash2 size={18} />
                </IconButton>
              )}
            </IconToolbar>

            <p className="studio-sheet__meta">
              {roleLabel(selected.role, t)} · {statusLabel(selected.status, t)}
            </p>

            {localError && selected && (
              <p className="studio-error">{translateError(t, localError)}</p>
            )}

            <label className="studio-field">
              <span className="studio-field__label">{t('studio.namePlaceholder')}</span>
              <input
                className="input"
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                disabled={selected.status === 'you'}
              />
            </label>

            <label className="studio-field">
              <span className="studio-field__label">{t('studio.emailPlaceholder')}</span>
              <input
                className="input"
                type="email"
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                disabled={selected.status === 'you'}
              />
            </label>

            {selected.status !== 'you' && (
              <button type="button" className="btn btn-primary" onClick={saveMember}>
                {t('common.save')}
              </button>
            )}

            {canInviteNew && (
              <div className="studio-sheet__invite">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    void sendInvite({
                      email: draftEmail || selected.email,
                      name: draftName || selected.name,
                      staffId: selected.staffId,
                      role: selected.role,
                    })
                  }
                >
                  {selected.status === 'invited'
                    ? t('studio.resendInvite')
                    : t('studio.sendInvite')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    void copyInvite({
                      email: draftEmail || selected.email,
                      name: draftName || selected.name,
                      staffId: selected.staffId,
                      role: selected.role,
                    })
                  }
                >
                  {t('studio.copyLink')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
