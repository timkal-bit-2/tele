/**
 * Profile Manager
 * Manages up to 10 user profiles with settings
 */

const PROFILE_STORAGE_KEY = 'teleprompter-profiles'
const LAST_PROFILE_KEY = 'teleprompter-last-profile'
const MAX_PROFILES = 10

const DEFAULT_SETTINGS = {
  fontSize: 40,
  speed: 0.2,
  padding: 111,
  lineHeight: 1.7,
  showReadingLine: true,
  readingLinePosition: 25,
  mirrorHorizontal: false,
  mirrorVertical: false,
  emptyLinesAtStart: 2,
  superLightMode: false
}

export const ProfileManager = {
  /**
   * Load all profiles from localStorage
   */
  loadProfiles() {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('Failed to load profiles:', error)
      return []
    }
  },

  /**
   * Save profiles to localStorage
   */
  saveProfiles(profiles) {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles))
      return true
    } catch (error) {
      console.error('Failed to save profiles:', error)
      return false
    }
  },

  /**
   * Create a new profile
   */
  createProfile(name, settings) {
    const profiles = this.loadProfiles()
    
    if (profiles.length >= MAX_PROFILES) {
      throw new Error(`Maximum of ${MAX_PROFILES} profiles reached`)
    }
    
    if (!name || name.trim().length === 0) {
      throw new Error('Profile name cannot be empty')
    }
    
    // Check for duplicate names
    if (profiles.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error('Profile name already exists')
    }
    
    const newProfile = {
      id: Date.now().toString(),
      name: name.trim(),
      settings: { ...DEFAULT_SETTINGS, ...settings },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    profiles.push(newProfile)
    this.saveProfiles(profiles)
    
    return newProfile
  },

  /**
   * Update an existing profile
   */
  updateProfile(profileId, updates) {
    const profiles = this.loadProfiles()
    const index = profiles.findIndex(p => p.id === profileId)
    
    if (index === -1) {
      throw new Error('Profile not found')
    }
    
    // If name is being updated, check for duplicates
    if (updates.name && updates.name !== profiles[index].name) {
      if (profiles.some((p, i) => i !== index && p.name.toLowerCase() === updates.name.toLowerCase())) {
        throw new Error('Profile name already exists')
      }
    }
    
    profiles[index] = {
      ...profiles[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    this.saveProfiles(profiles)
    return profiles[index]
  },

  /**
   * Delete a profile
   */
  deleteProfile(profileId) {
    const profiles = this.loadProfiles()
    const filtered = profiles.filter(p => p.id !== profileId)
    
    if (filtered.length === profiles.length) {
      throw new Error('Profile not found')
    }
    
    this.saveProfiles(filtered)
    
    // Clear last profile if it was deleted
    const lastProfileId = localStorage.getItem(LAST_PROFILE_KEY)
    if (lastProfileId === profileId) {
      localStorage.removeItem(LAST_PROFILE_KEY)
    }
    
    return true
  },

  /**
   * Get a profile by ID
   */
  getProfile(profileId) {
    const profiles = this.loadProfiles()
    return profiles.find(p => p.id === profileId) || null
  },

  /**
   * Get the last used profile
   */
  getLastProfile() {
    try {
      const lastProfileId = localStorage.getItem(LAST_PROFILE_KEY)
      if (lastProfileId) {
        return this.getProfile(lastProfileId)
      }
    } catch (error) {
      console.error('Failed to get last profile:', error)
    }
    return null
  },

  /**
   * Set the last used profile
   */
  setLastProfile(profileId) {
    try {
      localStorage.setItem(LAST_PROFILE_KEY, profileId)
      return true
    } catch (error) {
      console.error('Failed to set last profile:', error)
      return false
    }
  },

  /**
   * Get profile count
   */
  getProfileCount() {
    return this.loadProfiles().length
  },

  /**
   * Check if max profiles reached
   */
  isMaxProfilesReached() {
    return this.getProfileCount() >= MAX_PROFILES
  },

  /**
   * Get max profiles limit
   */
  getMaxProfiles() {
    return MAX_PROFILES
  }
}

export default ProfileManager


