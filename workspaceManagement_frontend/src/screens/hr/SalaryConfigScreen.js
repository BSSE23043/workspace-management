import React, { useReducer, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { loadSalaryConfig, updateCompanySalaryConfig, updateEmployeeSalaryOverride } from '../../services/salaryService';
import { useTheme } from '../../hooks/useTheme';
import storageService, { STORAGE_KEYS } from '../../services/storageService';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import Icon from '../../components/common/Icon';
import { isValidNumber } from '../../utils/validation';

// Syllabus Requirement: useReducer for complex salary configuration state
const salaryReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FIELD': {
      const nextState = { ...state, [action.field]: action.value };
      const base = Number(nextState.baseSalary) || 0;
      const days = Number(nextState.expectedWorkingDays) || 22;
      nextState.dailyProRata = days > 0 ? Math.round(base / days) : 0;
      return nextState;
    }
    case 'LOAD_CONFIG': {
      const base = Number(action.payload.baseSalary || 150000);
      const days = Number(action.payload.expectedWorkingDays || action.payload.workingDaysPerPeriod || 22);
      return {
        baseSalary: String(base),
        expectedWorkingDays: String(days),
        dailyProRata: days > 0 ? Math.round(base / days) : 0,
        deductionPerAbsentDay: String(action.payload.deductionPerAbsentDay || 5000),
      };
    }
    default:
      return state;
  }
};

const initialSalaryState = {
  baseSalary: '150000',
  expectedWorkingDays: '22',
  dailyProRata: 6818,
  deductionPerAbsentDay: '5000',
};

export const SalaryConfigScreen = ({ navigation }) => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('HR');

  // Salary policy is NOT in Redux anymore — read it from AsyncStorage on mount
  // and refresh on focus so the saved company-wide policy / overrides are
  // always the source for the form.
  const [salaryConfig, setSalaryConfig] = useState({ companyWide: {}, overrides: {} });
  useEffect(() => {
    const load = async () => {
      setSalaryConfig(await loadSalaryConfig());
    };
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return () => unsubscribe();
  }, [navigation]);
  const { companyWide, overrides } = salaryConfig;

  // Users are loaded from AsyncStorage (Redux no longer stores the user list)
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
      setUsers(storedUsers);
    })();
  }, []);

  const [activeScope, setActiveScope] = useState('COMPANY'); // 'COMPANY' | 'OVERRIDE'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  const eligibleEmployees = (users || []).filter(
    (u) => u.role === 'EMPLOYEE' || u.role === 'MANAGER'
  );
  const selectedEmployee =
    eligibleEmployees.find((u) => u.id === selectedEmployeeId) || eligibleEmployees[0];

  // Syllabus requirement: useReducer
  const [state, dispatch] = useReducer(salaryReducer, initialSalaryState);

  // Validate numeric fields
  const isValid =
    isValidNumber(state.baseSalary) &&
    isValidNumber(state.expectedWorkingDays) &&
    isValidNumber(state.deductionPerAbsentDay);

  const handleSelectEmployee = (emp) => {
    setSelectedEmployeeId(emp.id);
    const empConfig = overrides[emp.id] || {
      ...companyWide,
      baseSalary: emp.baseSalary || companyWide.baseSalary || 150000,
    };
    dispatch({ type: 'LOAD_CONFIG', payload: empConfig });
  };

  const handleScopeChange = (scope) => {
    setActiveScope(scope);
    if (scope === 'COMPANY') {
      dispatch({ type: 'LOAD_CONFIG', payload: companyWide });
    } else {
      const empConfig = overrides[selectedEmployeeId] || {
        ...companyWide,
        baseSalary: selectedEmployee?.baseSalary || 150000,
      };
      dispatch({ type: 'LOAD_CONFIG', payload: empConfig });
    }
  };

  const handleSave = async () => {
    if (!isValid) {
      Alert.alert('Invalid Input', 'Please enter valid numbers for all salary parameters.');
      return;
    }

    const payload = {
      baseSalary: parseInt(state.baseSalary, 10),
      workingDaysPerPeriod: parseInt(state.expectedWorkingDays, 10),
      deductionPerAbsentDay: parseInt(state.deductionPerAbsentDay, 10),
    };

    // Each save writes to AsyncStorage and returns the updated config, which
    // the form then reads from on the next scope/employee switch.
    if (activeScope === 'COMPANY') {
      setSalaryConfig(await updateCompanySalaryConfig(payload));
      Alert.alert('Saved', 'Company-wide default salary policies updated.');
    } else if (selectedEmployee) {
      const next = await updateEmployeeSalaryOverride({
        userId: selectedEmployee.id,
        config: payload,
      });
      setSalaryConfig(next);
      Alert.alert('Saved', `Employee custom salary override updated for ${selectedEmployee.name || 'employee'}.`);
    } else {
      Alert.alert('No Employee Selected', 'Select an employee before saving an override.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="HR Salary & Custom Deduction"
        subtitle="Policy & Compensation Control"
        showBack
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Segmented Switcher */}
        <View style={[styles.segmentedWrap, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeScope === 'COMPANY' && { backgroundColor: palette.primary },
            ]}
            onPress={() => handleScopeChange('COMPANY')}
          >
            <Text
              style={[
                styles.segmentText,
                activeScope === 'COMPANY' ? { color: '#FFFFFF' } : { color: palette.textSecondary },
              ]}
            >
              Company-Wide Default
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeScope === 'OVERRIDE' && { backgroundColor: palette.primary },
            ]}
            onPress={() => handleScopeChange('OVERRIDE')}
          >
            <Text
              style={[
                styles.segmentText,
                activeScope === 'OVERRIDE' ? { color: '#FFFFFF' } : { color: palette.textSecondary },
              ]}
            >
              Employee Override ({selectedEmployee?.name?.split(' ')[0] || 'Individual'})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Employee Selector when in OVERRIDE mode */}
        {activeScope === 'OVERRIDE' && (
          <View style={[styles.employeeSelectorCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <View style={styles.selectorHeaderRow}>
              <Icon name="people" size={16} color={palette.primary} />
              <Text style={[styles.selectorTitle, { color: palette.textPrimary }]}>
                Select Employee to Configure Overrides:
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.empChipsScroll}>
              {eligibleEmployees.map((emp) => {
                const isSelected = emp.id === selectedEmployeeId;
                return (
                  <TouchableOpacity
                    key={emp.id}
                    style={[
                      styles.empChip,
                      { borderColor: isSelected ? palette.primary : palette.cardBorder },
                      isSelected && { backgroundColor: palette.badge, borderWidth: 1.5 },
                    ]}
                    onPress={() => handleSelectEmployee(emp)}
                  >
                    <View style={styles.empChipTop}>
                      <Text style={[styles.empChipName, { color: palette.textPrimary, fontWeight: isSelected ? '800' : '600' }]}>
                        {emp.name}
                      </Text>
                      {isSelected && <Icon name="checkmark-circle" size={14} color={palette.primary} />}
                    </View>
                    <Text style={[styles.empChipSub, { color: palette.textSecondary }]}>
                      {emp.id}{emp.department ? ` • ${emp.department}` : ''}
                    </Text>
                    <Text style={[styles.empChipSalary, { color: palette.primary }]}>
                      Base: PKR {Number(emp.baseSalary || 150000).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Base Earning & Pro-Rata Parameters
          </Text>

          <AppInput
            label="Base Monthly Salary (PKR)"
            value={state.baseSalary}
            onChangeText={(v) => dispatch({ type: 'SET_FIELD', field: 'baseSalary', value: v })}
            keyboardType="numeric"
            placeholder="150000"
          />

          <AppInput
            label="Expected Working Days / Month"
            value={state.expectedWorkingDays}
            onChangeText={(v) => dispatch({ type: 'SET_FIELD', field: 'expectedWorkingDays', value: v })}
            keyboardType="numeric"
            placeholder="22"
          />

          {/* Auto calculated Pro Rata Pill */}
          <View style={styles.proRataPill}>
            <Icon name="cash" size={15} color="#0F766E" />
            <Text style={styles.proRataText}>
              Standard Daily Pro-Rata Rate: {Number(state.dailyProRata).toLocaleString()} PKR / day
            </Text>
          </View>
        </View>

        {/* Deductions Policy Card */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Deductions & Absence Penalty Rates
          </Text>

          <AppInput
            label="Deduction per Absent Day (PKR / Day)"
            value={state.deductionPerAbsentDay}
            onChangeText={(v) =>
              dispatch({ type: 'SET_FIELD', field: 'deductionPerAbsentDay', value: v })
            }
            keyboardType="numeric"
            placeholder="5000"
          />
        </View>

        {/* Inline Confirmation or Error banner */}
        {isValid ? (
          <View style={styles.validBanner}>
            <Icon name="checkmark-circle" size={16} color="#16A34A" />
            <Text style={styles.validBannerText}>✓ Valid numeric deduction rates configured</Text>
          </View>
        ) : (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorBannerText}>! Please enter valid numeric values for all fields</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: palette.primary }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>Save Salary Configuration</Text>
        </TouchableOpacity>
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
  segmentedWrap: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  proRataPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  proRataText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  validBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 16,
  },
  validBannerText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  employeeSelectorCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  selectorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  selectorTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  empChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  empChip: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minWidth: 160,
    backgroundColor: '#F8FAFC',
  },
  empChipTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  empChipName: {
    fontSize: 13,
  },
  empChipSub: {
    fontSize: 10,
    marginBottom: 4,
  },
  empChipSalary: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default SalaryConfigScreen;
