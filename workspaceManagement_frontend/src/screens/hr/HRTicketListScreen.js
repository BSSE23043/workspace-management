import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { loadTickets } from '../../services/ticketService';
import { useTheme } from '../../hooks/useTheme';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';

export const HRTicketListScreen = ({ navigation }) => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('HR');

  // Tickets are stored in AsyncStorage — load on demand (mount + every focus)
  // so the queue always reflects the latest stored state.
  const [tickets, setTickets] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  useEffect(() => {
    const load = async () => {
      setTickets(await loadTickets());
      setIsDataLoaded(true);
    };
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return () => unsubscribe();
  }, [navigation]);

  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const countByStatus = (status) => tickets.filter((t) => t.status === status).length;
  const STATUS_TABS = [
    { id: 'ALL', label: 'All', count: tickets.length },
    { id: 'OPEN', label: 'Open', count: countByStatus('OPEN') },
    { id: 'IN_PROGRESS', label: 'Progress', count: countByStatus('IN_PROGRESS') },
    { id: 'RESOLVED', label: 'Resolved', count: countByStatus('RESOLVED') },
  ];

  const filteredTickets = tickets.filter(
    (t) => selectedStatus === 'ALL' || t.status === selectedStatus
  );

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={[styles.ticketCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
        onPress={() => navigation.navigate('HRTicketDetail', { ticketId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.headerLeft}>
            <Text style={[styles.ticketId, { color: palette.primary }]}>#{item.id}</Text>
            <View
              style={[
                styles.statusTag,
                item.status === 'OPEN'
                  ? styles.statusOpen
                  : item.status === 'IN_PROGRESS'
                  ? styles.statusProgress
                  : styles.statusResolved,
              ]}
            >
              <Text
                style={[
                  styles.statusTagText,
                  item.status === 'OPEN'
                    ? styles.textOpen
                    : item.status === 'IN_PROGRESS'
                    ? styles.textProgress
                    : styles.textResolved,
                ]}
              >
                {item.status}
              </Text>
            </View>
          </View>
          <Text style={[styles.dateText, { color: palette.textSecondary }]}>{item.date}</Text>
        </View>

        <Text style={[styles.subject, { color: palette.textPrimary }]}>{item.subject}</Text>
        <Text style={[styles.explanation, { color: palette.textSecondary }]} numberOfLines={2}>
          {item.explanation}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.userBadge}>
            <Icon name="person" size={13} color="#64748B" />
            <Text style={[styles.userName, { color: palette.textPrimary }]}>{item.userName}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isDataLoaded) {
    return <View style={[styles.container, { backgroundColor: palette.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="HR Support Ticket Queue"
        subtitle="Human Resources"
        navigation={navigation}
      />

      {/* Status Tabs */}
      <View style={styles.tabsRow}>
        {STATUS_TABS.map((tab) => {
          const isSelected = selectedStatus === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabBtn,
                isSelected
                  ? { backgroundColor: palette.primary, borderColor: palette.primary }
                  : { backgroundColor: palette.card, borderColor: palette.cardBorder },
              ]}
              onPress={() => setSelectedStatus(tab.id)}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  isSelected ? { color: '#FFFFFF' } : { color: palette.textSecondary },
                ]}
              >
                {tab.label} {tab.count !== undefined ? `(${tab.count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredTickets}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No tickets found for this filter.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  ticketCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusOpen: { backgroundColor: '#FEF3C7' },
  statusProgress: { backgroundColor: '#DBEAFE' },
  statusResolved: { backgroundColor: '#DCFCE7' },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textOpen: { color: '#B45309' },
  textProgress: { color: '#1D4ED8' },
  textResolved: { color: '#16A34A' },
  dateText: {
    fontSize: 11,
  },
  subject: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  explanation: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
  },
});

export default HRTicketListScreen;
