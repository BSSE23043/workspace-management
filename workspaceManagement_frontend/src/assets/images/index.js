// Local Assets Registry matching WMS Syllabus & Figma Specifications

export const IMAGES = {
  dpAdminUsman: require('./dp_admin_usman.png'),
  dpHrSana: require('./dp_hr_sana.png'),
  dpMgrBilal: require('./dp_mgr_bilal.png'),
  dpEmpAli: require('./dp_emp_ali.png'),
  dpEmpHamza: require('./dp_emp_hamza.png'),
  dpClientZafar: require('./dp_client_zafar.png'),
  appLogo: require('./app_logo.png'),
  mapLahoreCampus: require('./map_lahore_campus.png'),
  telemetryCampusHub: require('./telemetry_campus_hub.jpg'),
};

export const getAvatarSource = (avatarKeyOrUri) => {
  if (!avatarKeyOrUri) return IMAGES.dpEmpAli;
  if (typeof avatarKeyOrUri === 'number' || (typeof avatarKeyOrUri === 'object' && avatarKeyOrUri.uri)) {
    return avatarKeyOrUri;
  }
  if (typeof avatarKeyOrUri === 'string') {
    if (avatarKeyOrUri.startsWith('http://') || avatarKeyOrUri.startsWith('https://') || avatarKeyOrUri.startsWith('data:') || avatarKeyOrUri.startsWith('file://') || avatarKeyOrUri.startsWith('content://')) {
      return { uri: avatarKeyOrUri };
    }
    // Check known keys
    if (IMAGES[avatarKeyOrUri]) {
      return IMAGES[avatarKeyOrUri];
    }
  }
  return IMAGES.dpEmpAli;
};

export default IMAGES;
