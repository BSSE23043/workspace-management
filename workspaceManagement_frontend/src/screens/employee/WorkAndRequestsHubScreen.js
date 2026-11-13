import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import HeaderBar from '../../components/common/HeaderBar';
import ChipButton from '../../components/common/ChipButton';
import MyLeaveRequestsScreen from './MyLeaveRequestsScreen';
import MyHRTicketsScreen from './MyHRTicketsScreen';
import MyTasksScreen from './MyTasksScreen';

export const WorkAndRequestsHubScreen = ({ navigation, route }) => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('EMPLOYEE');
  const [activeSegment, setActiveSegment] = useState('LEAVES'); // 'LEAVES' | 'TICKETS' | 'TASKS'

  // When a caller passes ?initialTab=... (e.g. the Salary screen's
  // "Open an HR Ticket" link -> TICKETS), open that segment ONCE, then clear
  // the param so later plain opens of this tab keep remembering the user's
  // last opened segment. (Allowed concept: plain useEffect - the param change
  // re-renders the screen, so no focus hook is needed.)
  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveSegment(route.params.initialTab.toUpperCase());
      navigation.setParams({ initialTab: undefined });
    }
  }, [route?.params?.initialTab]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Work & Requests"
        subtitle="Employee Self-Service"
        navigation={navigation}
      />

      {/* Segment Switcher Header */}
      <View style={[styles.segmentBar, { backgroundColor: palette.card, borderBottomColor: palette.cardBorder }]}>
        {[
          { id: 'LEAVES', label: 'Leave Requests' },
          { id: 'TICKETS', label: 'HR Tickets' },
          { id: 'TASKS', label: 'Sprint Tasks' },
        ].map((tab) => {
          const isActive = activeSegment === tab.id;
          return (
            <ChipButton
              key={tab.id}
              label={tab.label}
              variant="segment"
              selected={isActive}
              activeColor="transparent"
              selectedTextColor={palette.primary}
              style={{ paddingVertical: 12 }}
              selectedStyle={{
                borderBottomWidth: 3,
                borderBottomColor: palette.primary,
                borderRadius: 0,
              }}
              unselectedStyle={{
                borderBottomWidth: 3,
                borderBottomColor: 'transparent',
                borderRadius: 0,
              }}
              textStyle={{
                fontSize: 12,
                color: isActive ? palette.primary : palette.textSecondary,
                fontWeight: isActive ? '800' : '600',
              }}
              onPress={() => setActiveSegment(tab.id)}
            />
          );
        })}
      </View>

      <View style={styles.contentWrap}>
        {activeSegment === 'LEAVES' && <MyLeaveRequestsScreen navigation={navigation} isEmbedded={true} />}
        {activeSegment === 'TICKETS' && <MyHRTicketsScreen navigation={navigation} isEmbedded={true} />}
        {activeSegment === 'TASKS' && <MyTasksScreen navigation={navigation} isEmbedded={true} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  contentWrap: {
    flex: 1,
  },
});

export default WorkAndRequestsHubScreen;
