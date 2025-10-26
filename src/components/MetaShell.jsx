import { useState } from 'react'
import '../styles/design-system.css'

/**
 * Meta Shell - Structural Meta-Layer
 * 
 * Purpose: Wrap existing functionality with three-pane architecture
 * without breaking any underlying logic
 * 
 * Architecture:
 * - Navigation (L): Quick actions, controls
 * - Content (C): Existing app mounts here untouched
 * - Context (R): Metadata, analytics, status
 */

const MetaShell = ({ 
  children, 
  navigationItems = [],
  contextSections = [],
  isFullscreen = false,
  onNavigationToggle = null,
  onContextToggle = null
}) => {
  const [navExpanded, setNavExpanded] = useState(false)
  const [contextCollapsed, setContextCollapsed] = useState(false)

  const handleNavToggle = () => {
    const newState = !navExpanded
    setNavExpanded(newState)
    if (onNavigationToggle) onNavigationToggle(newState)
  }

  const handleContextToggle = () => {
    const newState = !contextCollapsed
    setContextCollapsed(newState)
    if (onContextToggle) onContextToggle(newState)
  }

  return (
    <div className={`meta-shell ${isFullscreen ? 'meta-shell--fullscreen' : ''}`}>
      {/* Navigation Pane (Left) */}
      {!isFullscreen && (
        <nav className={`meta-shell__nav ${navExpanded ? 'meta-shell__nav--expanded' : ''}`}>
          <div className="meta-shell__nav-items">
            {/* Toggle button */}
            <button
              className="meta-shell__nav-item"
              onClick={handleNavToggle}
              title={navExpanded ? 'Collapse navigation' : 'Expand navigation'}
            >
              <span className="meta-shell__nav-icon">
                {navExpanded ? '◀' : '▶'}
              </span>
              <span className="meta-shell__nav-label">Menu</span>
            </button>

            <div className="meta-divider" />

            {/* Navigation items */}
            {navigationItems.map((item, index) => (
              <button
                key={index}
                className={`meta-shell__nav-item ${item.active ? 'meta-shell__nav-item--active' : ''}`}
                onClick={item.onClick}
                title={item.label}
                disabled={item.disabled}
              >
                <span className="meta-shell__nav-icon">{item.icon}</span>
                <span className="meta-shell__nav-label">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="meta-spacer" />

          {/* Bottom items */}
          <div className="meta-shell__nav-items" style={{ marginTop: 'auto' }}>
            {navigationItems.filter(item => item.position === 'bottom').map((item, index) => (
              <button
                key={`bottom-${index}`}
                className={`meta-shell__nav-item ${item.active ? 'meta-shell__nav-item--active' : ''}`}
                onClick={item.onClick}
                title={item.label}
              >
                <span className="meta-shell__nav-icon">{item.icon}</span>
                <span className="meta-shell__nav-label">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Content Pane (Center) - Existing app mounts here */}
      <main className="meta-shell__content">
        <div className="meta-shell__content-inner">
          {children}
        </div>
      </main>

      {/* Context Pane (Right) */}
      {!isFullscreen && (
        <aside className={`meta-shell__context ${contextCollapsed ? 'meta-shell__context--collapsed' : ''}`}>
          <div className="meta-shell__context-header">
            <h2 className="meta-shell__context-title">Context</h2>
            <button
              className="meta-button meta-button--ghost"
              onClick={handleContextToggle}
              style={{ padding: 'var(--space-2)' }}
            >
              {contextCollapsed ? '◀' : '▶'}
            </button>
          </div>

          <div className="meta-shell__context-body">
            {contextSections.map((section, index) => (
              <div key={index} className="meta-context-section">
                <h3 className="meta-context-section__title">{section.title}</h3>
                <div className="meta-context-section__content">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  )
}

export default MetaShell


