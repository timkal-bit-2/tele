import { useState } from 'react'
import { ProfileManager } from '../utils/profileManager'

/**
 * Profile Manager Component
 * UI for managing up to 10 profiles
 */
const ProfileManagerComponent = ({ currentSettings, onLoadProfile }) => {
  const [profiles, setProfiles] = useState(() => ProfileManager.loadProfiles())
  const [newProfileName, setNewProfileName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  const reloadProfiles = () => {
    setProfiles(ProfileManager.loadProfiles())
  }

  const handleCreateProfile = () => {
    try {
      setError('')
      
      if (!newProfileName.trim()) {
        setError('Please enter a profile name')
        return
      }
      
      const profile = ProfileManager.createProfile(newProfileName, currentSettings)
      setProfiles(ProfileManager.loadProfiles())
      setNewProfileName('')
      setShowCreateForm(false)
      setError('')
      
      // Show success message
      console.log('✅ Profile created:', profile.name)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLoadProfile = (profileId) => {
    try {
      const profile = ProfileManager.getProfile(profileId)
      if (profile) {
        ProfileManager.setLastProfile(profileId)
        onLoadProfile(profile.settings, profile)
        console.log('✅ Loaded profile:', profile.name)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateProfile = (profileId) => {
    try {
      setError('')
      
      if (!editingName.trim()) {
        setError('Profile name cannot be empty')
        return
      }
      
      ProfileManager.updateProfile(profileId, {
        name: editingName.trim(),
        settings: currentSettings
      })
      
      setProfiles(ProfileManager.loadProfiles())
      setEditingId(null)
      setEditingName('')
      console.log('✅ Profile updated')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteProfile = (profileId) => {
    if (!confirm('Are you sure you want to delete this profile?')) {
      return
    }
    
    try {
      ProfileManager.deleteProfile(profileId)
      setProfiles(ProfileManager.loadProfiles())
      setError('')
      console.log('✅ Profile deleted')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleStartEdit = (profile) => {
    setEditingId(profile.id)
    setEditingName(profile.name)
    setError('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setError('')
  }

  const maxReached = ProfileManager.isMaxProfilesReached()
  const maxProfiles = ProfileManager.getMaxProfiles()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs text-gray-400 font-medium">
          📋 Profiles ({profiles.length}/{maxProfiles})
        </h4>
        {!maxReached && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            ➕ New
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-3 py-2 bg-red-900 bg-opacity-50 border border-red-700 rounded text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Create Profile Form */}
      {showCreateForm && (
        <div className="p-3 bg-gray-700 rounded space-y-2">
          <input
            type="text"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateProfile()
              if (e.key === 'Escape') {
                setShowCreateForm(false)
                setNewProfileName('')
                setError('')
              }
            }}
            placeholder="Profile name..."
            className="w-full px-2 py-1 text-xs rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateProfile}
              className="flex-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false)
                setNewProfileName('')
                setError('')
              }}
              className="flex-1 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Max Profiles Warning */}
      {maxReached && (
        <div className="px-3 py-2 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded text-xs text-yellow-200">
          Maximum {maxProfiles} profiles reached. Delete a profile to create a new one.
        </div>
      )}

      {/* Profiles List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {profiles.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">
            No profiles yet. Create one to save your settings!
          </div>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className="p-2 bg-gray-700 rounded hover:bg-gray-650 transition-colors"
            >
              {editingId === profile.id ? (
                /* Edit Mode */
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateProfile(profile.id)
                      if (e.key === 'Escape') handleCancelEdit()
                    }}
                    className="w-full px-2 py-1 text-xs rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateProfile(profile.id)}
                      className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoadProfile(profile.id)}
                    className="flex-1 text-left px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors truncate"
                    title={`Load profile: ${profile.name}`}
                  >
                    {profile.name}
                  </button>
                  <button
                    onClick={() => handleStartEdit(profile)}
                    className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                    title="Edit profile name"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteProfile(profile.id)}
                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    title="Delete profile"
                  >
                    🗑️
                  </button>
                </div>
              )}
              
              {/* Profile metadata */}
              {editingId !== profile.id && (
                <div className="mt-1 text-xs text-gray-400 flex items-center justify-between">
                  <span>
                    Font: {profile.settings.fontSize}px, Speed: {(profile.settings.speed * 10).toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(profile.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Quick tip */}
      {profiles.length > 0 && (
        <div className="text-xs text-gray-500 italic">
          💡 Tip: Profiles auto-save when you load them
        </div>
      )}
    </div>
  )
}

export default ProfileManagerComponent


