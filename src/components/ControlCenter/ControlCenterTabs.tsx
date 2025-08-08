import React, { useState } from 'react';
import { TabId } from './ControlCenterModal';

interface ControlCenterTabsProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}

interface TabConfig {
    id: TabId;
    label: string;
}

const tabs: TabConfig[] = [
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'account', label: 'Account' },
    { id: 'control-center', label: 'Controls' },
    { id: 'close', label: '✕' },
];

const ControlCenterTabs: React.FC<ControlCenterTabsProps> = ({ activeTab, onTabChange }) => {
    const handleTabClick = (tabId: TabId) => {
        if (tabId === 'close') {
            // Find the modal close function - we'll need to pass this as a prop
            // For now, we'll dispatch a custom event that the modal can listen to
            window.dispatchEvent(new CustomEvent('closeModal'));
        } else {
            onTabChange(tabId);
        }
    };

    // Detect platform and calculate safe top padding
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const isStandalone = typeof window !== 'undefined' && (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any)?.standalone
    );

    // Calculate appropriate top padding for different scenarios
    const getTopPadding = () => {
        if (typeof window === 'undefined') return '1rem'; // SSR fallback

        if (isMobile) {
            if (isStandalone) {
                // PWA mode - needs safe area + extra space for notch/dynamic island
                return 'calc(env(safe-area-inset-top) + 1.5rem)';
            } else {
                // Mobile browser - needs safe area + more space for browser UI
                return 'calc(env(safe-area-inset-top) + 2rem)';
            }
        } else {
            // Desktop - just normal padding
            return '1.5rem';
        }
    };

    return (
        <>
            <style>{`
                /* Navbar container safe area fallbacks */
                .navbar-container {
                    /* Fallback for browsers that don't support env() */
                    padding-top: 1rem;
                    /* Progressive enhancement with env() support */
                    padding-top: calc(env(safe-area-inset-top, 0px) + 1rem);
                }
                
                /* Mobile-specific adjustments */
                @media (max-width: 767px) {
                    .navbar-container {
                        padding-top: 2rem;
                        padding-top: calc(env(safe-area-inset-top, 0px) + 2rem);
                        min-height: 90px;
                    }
                    
                    /* PWA-specific adjustments */
                    .navbar-container.pwa-mode {
                        padding-top: 1.5rem;
                        padding-top: calc(env(safe-area-inset-top, 0px) + 1.5rem);
                        min-height: 90px;
                    }
                }
                
                /* Desktop fallback */
                @media (min-width: 768px) {
                    .navbar-container {
                        padding-top: 1.5rem;
                        min-height: 70px;
                    }
                }
            `}</style>
            <div
                className={`navbar-container ${isStandalone && isMobile ? 'pwa-mode' : ''}`}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem 0.5rem',
                    paddingTop: getTopPadding(),
                    minHeight: '80px', // Ensure minimum space
                    position: 'relative',
                }}
            >
                {/* buttons-container */}
                <div
                    style={{
                        width: '420px', // Smaller since close button will be compact
                        height: '52px',
                        borderRadius: '16px', // Less rounded
                        background: '#121212', // Slightly more contrasted
                        boxShadow: 'inset 0 0 2px 2px rgba(0, 0, 0, 0.6)',
                    }}
                >
                    {/* ul equivalent */}
                    <div
                        style={{
                            listStyle: 'none',
                            width: 'inherit',
                            height: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {tabs.map((tab, index) => (
                            <div
                                key={tab.id}
                                className="tab-button"
                                onClick={() => handleTabClick(tab.id)}
                                onMouseDown={(e) => e.preventDefault()}
                                onTouchStart={(e) => e.preventDefault()}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '1px',
                                    height: '46px',
                                    width: tab.id === 'close' ? '46px' : '120px', // Square close button, wider regular tabs
                                    background: tab.id === activeTab ? '#0F0F0F' : '#1E1E1E', // Active darker (depressed)
                                    borderTop: tab.id === activeTab ? '1px solid #0A0A0A' : '1px solid #383838', // Dark top border when active
                                    borderBottom: tab.id === activeTab ? 'none' : '1px solid #2A2A2A', // Light bottom when inactive
                                    boxShadow: tab.id === activeTab
                                        ? 'inset 0 2px 8px 0 rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(0, 0, 0, 0.3)'
                                        : '0 2px 8px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                                    borderTopLeftRadius: index === 0 ? '14px' : '0', // Less rounded
                                    borderBottomLeftRadius: index === 0 ? '14px' : '0',
                                    borderTopRightRadius: index === tabs.length - 1 ? '14px' : '0',
                                    borderBottomRightRadius: index === tabs.length - 1 ? '14px' : '0',
                                    transition: 'all .5s',
                                    cursor: 'pointer',
                                }}
                            >
                                <span
                                    style={{
                                        display: 'inline-block',
                                        color: tab.id === 'close'
                                            ? '#FF4444' // Bold red always
                                            : (tab.id === activeTab ? '#00FF88' : 'gray'),
                                        textShadow: tab.id === activeTab
                                            ? (tab.id === 'close' ? '0 0 15px rgba(255, 68, 68, 0.8)' : '0 0 15px rgba(0, 255, 136, 0.5)')
                                            : (tab.id === 'close' ? '0 0 8px rgba(255, 68, 68, 0.4)' : 'none'),
                                        textDecoration: 'none',
                                        fontSize: tab.id === 'close' ? '22px' : '15px', // Larger, thick X
                                        fontWeight: tab.id === 'close' ? 900 : 600, // Much bolder X
                                        transition: 'all .5s',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    {tab.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ControlCenterTabs; 
