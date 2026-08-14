/** @deprecated Use arboxApi — kept for import compatibility */
export {
  connectArboxAccount,
  syncArboxSchedule,
  validateArboxApiKey,
  getDefaultWeekStart,
  restoreArboxSession,
  disconnectArboxAccount,
  attachPlanToArboxEvent,
  detachPlanFromArboxEvent,
  processEndedClassFeedback,
  getMessageLog,
  setAutoFeedbackEnabled,
  inferRoleFromKey,
} from './arboxApi';

export async function fetchArboxSchedule(weekStart: Date, apiKey: string) {
  const { syncArboxSchedule, restoreArboxSession } = await import('./arboxApi');
  const session = restoreArboxSession();
  if (!session?.connection.connected) {
    return syncArboxSchedule(
      {
        connected: true,
        apiKey,
        lastSyncedAt: null,
        clubName: "Maya's Studio",
        clubId: 'club-maya-001',
        role: 'instructor',
        staffId: 'staff-maya',
        staffName: 'Maya Cohen',
        team: [],
        autoFeedbackEnabled: true,
      },
      weekStart
    );
  }
  return syncArboxSchedule(session.connection, weekStart);
}
