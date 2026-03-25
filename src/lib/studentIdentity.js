export const STUDENT_NAME_KEY = 'alquimia-verbal:student-name';
export const CLASSROOM_ID_KEY = 'alquimia-verbal:classroom-id';
export const CLASSROOM_NAME_KEY = 'alquimia-verbal:classroom-name';
export const STUDENT_ACCESS_ID_KEY = 'alquimia-verbal:student-access-id';
const RECENT_STUDENT_PROFILES_KEY = 'alquimia-verbal:recent-student-profiles';
const MAX_RECENT_PROFILES = 8;

function getStorage(type) {
  if (typeof window === 'undefined') return null;
  return type === 'local' ? window.localStorage : window.sessionStorage;
}

function normalizeText(value) {
  return value?.trim?.() || '';
}

function readProfiles() {
  const storage = getStorage('local');
  if (!storage) return [];

  try {
    const raw = storage.getItem(RECENT_STUDENT_PROFILES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((profile) => ({
        accessId: normalizeText(profile?.accessId),
        studentName: normalizeText(profile?.studentName),
        classroomId: normalizeText(profile?.classroomId),
        classroomName: normalizeText(profile?.classroomName),
        lastUsedAt: normalizeText(profile?.lastUsedAt),
      }))
      .filter((profile) => profile.accessId && profile.studentName && profile.classroomId);
  } catch {
    return [];
  }
}

function writeProfiles(profiles) {
  const storage = getStorage('local');
  if (!storage) return;
  storage.setItem(RECENT_STUDENT_PROFILES_KEY, JSON.stringify(profiles.slice(0, MAX_RECENT_PROFILES)));
}

function createAccessId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `student-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function getSavedStudentName() {
  const storage = getStorage('session');
  return storage?.getItem(STUDENT_NAME_KEY)?.trim?.() || '';
}

export function getSavedClassroomId() {
  const storage = getStorage('session');
  return storage?.getItem(CLASSROOM_ID_KEY)?.trim?.() || '';
}

export function getSavedClassroomName() {
  const storage = getStorage('session');
  return storage?.getItem(CLASSROOM_NAME_KEY)?.trim?.() || '';
}

export function getSavedStudentAccessId() {
  const storage = getStorage('session');
  return storage?.getItem(STUDENT_ACCESS_ID_KEY)?.trim?.() || '';
}

export function activateStudentProfile(profile) {
  const storage = getStorage('session');
  if (!storage) return null;

  const normalizedProfile = {
    accessId: normalizeText(profile?.accessId),
    studentName: normalizeText(profile?.studentName),
    classroomId: normalizeText(profile?.classroomId),
    classroomName: normalizeText(profile?.classroomName),
  };

  if (!normalizedProfile.studentName || !normalizedProfile.classroomId) {
    return null;
  }

  storage.setItem(STUDENT_NAME_KEY, normalizedProfile.studentName);
  storage.setItem(CLASSROOM_ID_KEY, normalizedProfile.classroomId);
  storage.setItem(CLASSROOM_NAME_KEY, normalizedProfile.classroomName || '');

  if (normalizedProfile.accessId) {
    storage.setItem(STUDENT_ACCESS_ID_KEY, normalizedProfile.accessId);
  } else {
    storage.removeItem(STUDENT_ACCESS_ID_KEY);
  }

  return normalizedProfile;
}

export function rememberStudentProfile({ studentName, classroomId, classroomName }) {
  const normalizedName = normalizeText(studentName);
  const normalizedClassroomId = normalizeText(classroomId);
  const normalizedClassroomName = normalizeText(classroomName);

  if (!normalizedName || !normalizedClassroomId) {
    return null;
  }

  const profiles = readProfiles();
  const existingProfile = profiles.find(
    (profile) => profile.studentName === normalizedName && profile.classroomId === normalizedClassroomId
  );

  const nextProfile = {
    accessId: existingProfile?.accessId || createAccessId(),
    studentName: normalizedName,
    classroomId: normalizedClassroomId,
    classroomName: normalizedClassroomName || existingProfile?.classroomName || '',
    lastUsedAt: new Date().toISOString(),
  };

  const filteredProfiles = profiles.filter(
    (profile) => profile.accessId !== nextProfile.accessId
  );

  writeProfiles([nextProfile, ...filteredProfiles]);
  activateStudentProfile(nextProfile);
  return nextProfile;
}

export function getRecentStudentProfiles(classroomId = '') {
  const normalizedClassroomId = normalizeText(classroomId);
  const profiles = readProfiles();

  return profiles
    .filter((profile) => !normalizedClassroomId || profile.classroomId === normalizedClassroomId)
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
}
