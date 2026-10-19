import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { loadRequirements } from '../../services/requirementService';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';

export const ClientDashboardScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('CLIENT');

  // Requirements are NOT in Redux anymore — read them from AsyncStorage on
  // mount and refresh on focus, so a milestone ticked off by the manager
  // shows up on the client's dashboard right away.
  const [requirements, setRequirements] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  useEffect(() => {
    const load = async () => {
      setRequirements(await loadRequirements());
      setIsDataLoaded(true);
    };
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return () => unsubscribe();
  }, [navigation]);

  // A requirement belongs to exactly one client (clientId is set by the manager
  // when it is created), so this client only ever sees its own deliverables.
  const clientRequirements = requirements.filter((r) => r.clientId === currentUser?.id);

  // Real numbers for the KPI grid — nothing is hardcoded. Each requirement
  // carries a lifecycleState that the manager moves along
  // (IN_PROGRESS / AWAITING_CLIENT / COMPLETED), so the tiles simply tally
  // this client's own requirements. A fresh client with no requirements
  // honestly sees four zeros.
  const totalReqs = clientRequirements.length;
  const inProgressCount = clientRequirements.filter(
    (r) => r.lifecycleState === 'IN_PROGRESS'
  ).length;
  const awaitingClientCount = clientRequirements.filter(
    (r) => r.lifecycleState === 'AWAITING_CLIENT'
  ).length;
  const completedCount = clientRequirements.filter(
    (r) => r.lifecycleState === 'COMPLETED'
  ).length;

  // Wait for the first AsyncStorage read so the KPIs don't flash while real
  // deliverables are still loading.
  if (!isDataLoaded) {
    return <View style={[styles.container, { backgroundColor: palette.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Client Executive Dashboard"
        subtitle={currentUser?.name || 'Client Portal'}
        navigation={navigation}
        showStatus={false}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Header */}
        <View style={styles.welcomeCard}>
          <Text style={[styles.welcomeTitle, { color: palette.textPrimary }]}>
            Welcome, {currentUser?.name || 'Client'} Team
          </Text>
          <Text style={[styles.welcomeSub, { color: palette.textSecondary }]}>
            Enterprise Partner Deliverable Tracker &amp; Progress Hub
          </Text>
        </View>

        {/* 2x2 Deliverable Counter Grid — all values derived from the client's
            own requirements in AsyncStorage (previously hardcoded demo numbers) */}
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Contract Deliverables Status
        </Text>
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.kpiVal, { color: '#92400E' }]}>{totalReqs}</Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>Total Requirements</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.kpiVal, { color: '#1D4ED8' }]}>{inProgressCount}</Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>In Progress</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.kpiVal, { color: '#D97706' }]}>{awaitingClientCount}</Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>Awaiting Client</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.kpiVal, { color: '#16A34A' }]}>{completedCount}</Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>Completed</Text>
          </View>
        </View>

        {/* IMPORTANT SYLLABUS / FIGMA NOTE:
            Do NOT render the "+ Submit New Project Requirement" button or bottom tab.
            Clients only review progress; Engineering Management creates requirements. */}
        <View style={[styles.readOnlyNotice, { backgroundColor: palette.badge }]}>
          <Icon name="shield-checkmark" size={15} color={palette.text} />
          <Text style={[styles.readOnlyNoticeText, { color: palette.text }]}>
            Review-Only Mode: All project requirements are officially scoped and provisioned by Engineering Management.
          </Text>
        </View>

        {/* Recent Milestone Broadcasts */}
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Recent Milestone Broadcasts
        </Text>
        <View style={styles.broadcastsList}>
          {clientRequirements.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
              <Icon name="flag" size={16} color={palette.primary} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                No requirements have been scoped to your organization yet. Engineering Management
                will publish them here as soon as they are created.
              </Text>
            </View>
          ) : (
          clientRequirements.map((req) => {
            const latestBroadcast = req.broadcasts?.[0];
            return (
              <TouchableOpacity
                key={req.id}
                style={[styles.broadcastCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
                onPress={() => navigation.navigate('Milestones')}
                activeOpacity={0.8}
              >
                <View style={styles.bcTopRow}>
                  <Text style={[styles.bcCode, { color: palette.primary }]}>{req.code}</Text>
                  <View style={[styles.bcProgressTag, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={styles.bcProgressTagText}>
                      {req.progressPercent}% Completed
                    </Text>
                  </View>
                </View>

                <Text style={[styles.bcTitle, { color: palette.textPrimary }]}>{req.title}</Text>
                <Text style={[styles.bcContent, { color: palette.textSecondary }]} numberOfLines={2}>
                  {latestBroadcast?.content || 'Milestones progress monitored by engineering managers.'}
                </Text>

                <View style={[styles.bcFooter, { borderTopColor: palette.divider }]}>
                  <Text style={[styles.bcAuthor, { color: palette.textSecondary }]}>
                    {latestBroadcast?.author || 'Engineering Management'}
                  </Text>
                  <Text style={[styles.viewDetailsText, { color: palette.primary }]}>
                    View Milestones →
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  welcomeCard: {
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  welcomeSub: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    width: '48%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  kpiVal: {
    fontSize: 22,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 18,
  },
  readOnlyNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  broadcastsList: {
    gap: 12,
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  broadcastCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    elevation: 1,
  },
  bcTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bcCode: {
    fontSize: 12,
    fontWeight: '800',
  },
  bcProgressTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bcProgressTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  bcTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  bcContent: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  bcFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  bcAuthor: {
    fontSize: 11,
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default ClientDashboardScreen;
