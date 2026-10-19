import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
  Image,
  Switch,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import storageService, { STORAGE_KEYS } from '../../services/storageService';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';
import { getAvatarSource } from '../../assets/images';
import { ROLE_THEMES } from '../../utils/permissions';

const ROLE_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'EMPLOYEE', label: 'Employee' },
  { id: 'MANAGER', label: 'Manager' },
  { id: 'HR', label: 'HR' },
  { id: 'CLIENT', label: 'Client' },
];

export const EmployeeDirectoryScreen = ({ navigation }) => {
  const { getRolePalette, isDark } = useTheme();
  const palette = getRolePalette('ADMIN');

  const { currentUser } = useAuth();

  // Users are loaded from AsyncStorage (the single source of truth) into
  // local state — Redux no longer stores the user list.
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [sortAsc, setSortAsc] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = useCallback(async () => {
    const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
    // Company admins created by the Super Admin carry a companyId; they only
    // see users of their own company. Everyone else sees the full list.
    const scopedUsers = currentUser?.companyId
      ? storedUsers.filter((u) => u.companyId === currentUser.companyId)
      : storedUsers;
    setUsers(scopedUsers);
  }, [currentUser]);

  // Load on mount + reload whenever the screen regains focus
  // (e.g. after adding a user in the Employee Form).
  useEffect(() => {
    loadUsers();
    const unsubscribe = navigation.addListener('focus', loadUsers);
    return unsubscribe;
  }, [loadUsers]);

  // Pull to refresh handler — now actually reloads users from storage
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }, [loadUsers]);

  // Toggle active flag and persist the change to AsyncStorage
  const handleToggleActive = useCallback(
    async (userId) => {
      const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
      const updatedUsers = storedUsers.map((u) =>
        u.id === userId ? { ...u, isActive: u.isActive === false } : u
      );
      await storageService.setItem(STORAGE_KEYS.USERS, updatedUsers);
      // Mirror the same flip in the local (scoped) list
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: u.isActive === false } : u))
      );
    },
    []
  );

  // Filter and group users into SectionList sections
  const sections = useMemo(() => {
    // 1. Filter
    let filtered = users.filter((u) => {
      const matchesRole = selectedRole === 'ALL' || u.role === selectedRole;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });

    // 2. Sort
    filtered.sort((a, b) => {
      return sortAsc
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    });

    // 3. Group by Role for SectionList (the system has no departments —
    //    users are only typed as Employee / Manager / HR / Admin / Client)
    const roleMap = {};
    filtered.forEach((user) => {
      const roleKey = user.role || 'OTHER';
      if (!roleMap[roleKey]) {
        roleMap[roleKey] = [];
      }
      roleMap[roleKey].push(user);
    });

    return Object.keys(roleMap).map((roleKey) => ({
      title: `ROLE: ${roleKey} (${roleMap[roleKey].length})`,
      data: roleMap[roleKey],
    }));
  }, [users, selectedRole, searchQuery, sortAsc]);

  // Render User Item wrapped with useCallback (Syllabus topic 8)
  const renderItem = useCallback(
    ({ item }) => {
      const roleTheme = ROLE_THEMES[item.role] || ROLE_THEMES.EMPLOYEE;
      const isActive = item.isActive !== false;

      return (
        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
          onPress={() => navigation.navigate('EmployeeForm', { userId: item.id })}
          activeOpacity={0.8}
        >
          <Image
            source={getAvatarSource(item.avatarKey || item.avatarCustomUri)}
            style={styles.userAvatar}
          />

          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { color: palette.textPrimary }]}>{item.name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: roleTheme.primary }]}>
                <Text style={styles.roleBadgeText}>{item.role}</Text>
              </View>
            </View>

            <Text style={[styles.userEmail, { color: palette.textSecondary }]}>{item.email}</Text>

            <View style={styles.metaRow}>
              <Text style={[styles.userTitle, { color: palette.textSecondary }]}>{item.title}</Text>
              {Boolean(item.reportsTo) && (
                <Text style={styles.reportsTo}>• Reports to: {item.reportsTo}</Text>
              )}
            </View>
          </View>

          <View style={styles.switchCol}>
            <Text style={[styles.switchLabel, { color: isActive ? '#16A34A' : '#DC2626' }]}>
              {isActive ? 'Active' : 'Deact'}
            </Text>
            <Switch
              value={isActive}
              onValueChange={() => handleToggleActive(item.id)}
              trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
              thumbColor={isActive ? '#16A34A' : '#94A3B8'}
            />
          </View>
        </TouchableOpacity>
      );
    },
    [palette, navigation, handleToggleActive]
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={[styles.sectionHeaderWrap, { backgroundColor: palette.background }]}>
      <Text style={[styles.sectionHeaderText, { color: palette.primary }]}>{title}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Employee Directory & Role Filter"
        showBack
        navigation={navigation}
        rightAction={
          <TouchableOpacity
            style={[styles.addUserBtn, { backgroundColor: palette.primary }]}
            onPress={() => navigation.navigate('EmployeeForm')}
          >
            <Icon name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addUserBtnText}>+ Add User</Text>
          </TouchableOpacity>
        }
      />

      {/* Search Bar */}
      <View style={[styles.searchBox, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
        <Icon name="search" size={18} color="#94A3B8" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search employees by name or email..."
          placeholderTextColor="#94A3B8"
          style={[styles.searchInput, { color: palette.textPrimary }]}
        />
        {Boolean(searchQuery) && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Role Filter Chips */}
      <View style={styles.filterBar}>
        <View style={styles.roleChipsRow}>
          {ROLE_FILTERS.map((f) => {
            const count =
              f.id === 'ALL'
                ? users.length
                : users.filter((u) => u.role === f.id).length;
            const isSelected = selectedRole === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterChip,
                  isSelected
                    ? { backgroundColor: palette.primary, borderColor: palette.primary }
                    : { backgroundColor: palette.card, borderColor: palette.cardBorder },
                ]}
                onPress={() => setSelectedRole(f.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected ? { color: '#FFFFFF' } : { color: palette.textSecondary },
                  ]}
                >
                  {f.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
          onPress={() => setSortAsc(!sortAsc)}
        >
          <Text style={[styles.sortText, { color: palette.textPrimary }]}>
            Sort: {sortAsc ? 'A-Z' : 'Z-A'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Syllabus Requirement: SectionList with sticky section headers */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            title="Refreshing directory..."
            tintColor={palette.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="search" size={40} color="#94A3B8" />
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No users found matching your criteria.
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
  addUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addUserBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
  sortText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionHeaderWrap: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginTop: 4,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 11,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    flexWrap: 'wrap',
  },
  userTitle: {
    fontSize: 11,
  },
  reportsTo: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4,
  },
  switchCol: {
    alignItems: 'center',
    marginLeft: 8,
  },
  switchLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
  },
});

export default EmployeeDirectoryScreen;
