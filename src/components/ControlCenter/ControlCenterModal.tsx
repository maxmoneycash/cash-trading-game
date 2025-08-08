import React, { useState, useEffect } from 'react';
import ControlCenterTabs from './ControlCenterTabs';
import LeaderboardTab from './tabs/LeaderboardTab';
import AccountTab from './tabs/AccountTab';
import ControlCenterTab from './tabs/ControlCenterTab';

interface ControlCenterModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
    // Add more props as needed for complex features
}

export type TabId = 'leaderboard' | 'account' | 'control-center';

const ControlCenterModal: React.FC<ControlCenterModalProps> = ({
    isOpen,
    onClose,
    balance
}) => {
    const [activeTab, setActiveTab] = useState<TabId>('account');
    const [debugMode, setDebugMode] = useState(false);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'leaderboard':
                return <LeaderboardTab />;
            case 'account':
                return <AccountTab balance={balance} />;
            case 'control-center':
                return <ControlCenterTab />;
            default:
                return null;
        }
    };

    // Toggle debug mode with keyboard shortcut (Ctrl/Cmd + D)
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault();
                setDebugMode(prev => !prev);
                console.log('Debug mode:', !debugMode);

                // Add global debug functions when debug mode is on
                if (!debugMode) {
                    (window as any).scrollTest = {
                        testAll: () => {
                            console.log('🧪 Testing all scrollable elements...');
                            const scrollables = document.querySelectorAll('.hide-scrollbar');
                            scrollables.forEach((el, index) => {
                                console.log(`Element ${index}:`, el);
                                (el as HTMLElement).scrollTop += 100;
                                console.log(`Scrolled to: ${(el as HTMLElement).scrollTop}`);
                            });
                        },
                        info: () => {
                            const scrollables = document.querySelectorAll('.hide-scrollbar');
                            scrollables.forEach((el, index) => {
                                const htmlEl = el as HTMLElement;
                                console.log(`📜 Element ${index}:`, {
                                    class: htmlEl.className,
                                    canScroll: htmlEl.scrollHeight > htmlEl.clientHeight,
                                    scrollHeight: htmlEl.scrollHeight,
                                    clientHeight: htmlEl.clientHeight,
                                    currentScroll: htmlEl.scrollTop
                                });
                            });
                        }
                    };
                    console.log('✅ Debug functions available: window.scrollTest.testAll() and window.scrollTest.info()');
                } else {
                    delete (window as any).scrollTest;
                }
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyPress);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [isOpen, debugMode]);

    // Move the early return AFTER all hooks
    if (!isOpen) return null;

    return (
        <>
            <style>{`
                /* Mobile styles */
                @media (max-width: 768px) {
                    .modal-container-responsive {
                        width: calc(100vw - 1rem) !important;
                        max-width: calc(100vw - 1rem) !important;
                        margin: 0.5rem !important;
                        maxHeight: calc(100vh - 1rem) !important;
                    }
                }
                
                /* Desktop styles - responsive to width */
                @media (min-width: 769px) {
                    .modal-container-responsive {
                        width: min(92vw, 1400px) !important;
                        min-width: 600px !important;
                    }
                }
                
                /* Narrow desktop screens */
                @media (min-width: 769px) and (max-width: 1200px) {
                    .modal-container-responsive {
                        width: calc(100vw - 2rem) !important;
                        max-width: calc(100vw - 2rem) !important;
                    }
                }
                
                /* Hide all scrollbars globally within the modal */
                .hide-scrollbar {
                    -ms-overflow-style: none !important;  /* IE and Edge */
                    scrollbar-width: none !important;  /* Firefox */
                }
                
                .hide-scrollbar::-webkit-scrollbar {
                    display: none !important;  /* Chrome, Safari and Opera */
                    width: 0 !important;
                    height: 0 !important;
                }
                
                /* Debug indicator for scrolling */
                .scroll-debug {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: rgba(255, 0, 0, 0.8);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    z-index: 999999;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                }
                
                .scroll-debug.hidden {
                    opacity: 0;
                }
            `}</style>

            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    background: 'rgba(0, 0, 0, 0.5)',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        e.stopPropagation();
                        e.preventDefault();
                        onClose();
                    }
                }}
            >
                <div
                    className="glass-container modal-container-responsive"
                    style={{
                        width: isMobile ? 'calc(100vw - 1rem)' : '92vw',
                        height: 'auto',
                        maxWidth: isMobile ? 'calc(100vw - 1rem)' : '1400px',
                        maxHeight: '85vh',
                        borderRadius: '12px',
                        background: 'transparent',
                        boxShadow: `
                            0 0 0 1px rgba(255, 255, 255, 0.12),
                            0 4px 8px rgba(0, 0, 0, 0.15),
                            0 12px 24px rgba(0, 0, 0, 0.20),
                            0 20px 40px rgba(0, 0, 0, 0.15),
                            0 0 80px rgba(255, 255, 255, 0.05)
                        `,
                        border: 'none',
                        fontFamily: 'Bai Jamjuree, sans-serif',
                        pointerEvents: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        margin: isMobile ? '0.5rem' : '1rem',
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    <div
                        className="glass-filter"
                        style={{
                            backdropFilter: 'blur(12px) saturate(120%) brightness(1.05)',
                            WebkitBackdropFilter: 'blur(12px) saturate(120%) brightness(1.05)',
                        }}
                    />
                    <div
                        className="glass-overlay"
                        style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                        }}
                    />
                    <div
                        className="glass-specular"
                        style={{
                            boxShadow: `
                                inset 0 1px 0 rgba(255, 255, 255, 0.08),
                                inset 1px 0 0 rgba(255, 255, 255, 0.06),
                                inset 0 -1px 0 rgba(255, 255, 255, 0.02),
                                inset -1px 0 0 rgba(255, 255, 255, 0.02)
                            `,
                            background: `
                                radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.04) 0%, transparent 50%),
                                radial-gradient(circle at 75% 25%, rgba(255, 255, 255, 0.02) 0%, transparent 40%),
                                radial-gradient(circle at 50% 80%, rgba(255, 255, 255, 0.015) 0%, transparent 60%),
                                linear-gradient(135deg, rgba(255, 255, 255, 0.01) 0%, transparent 50%)
                            `,
                        }}
                    />

                    {/* Modal Content */}
                    <div
                        className="glass-content"
                        style={{
                            position: 'relative',
                            zIndex: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            flex: '1 1 auto',
                            color: '#ffffff',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Debug Mode Indicator */}
                        {debugMode && (
                            <div style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                background: 'rgba(0, 255, 0, 0.2)',
                                border: '1px solid rgba(0, 255, 0, 0.5)',
                                color: '#00FF88',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                zIndex: 1000,
                            }}>
                                DEBUG MODE ON (Ctrl+D to toggle)
                            </div>
                        )}

                        {/* Tab Navigation */}
                        <ControlCenterTabs
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                        />

                        {/* Tab Content */}
                        <div
                            className="modal-content-responsive"
                            style={{
                                flex: '1 1 auto',
                                overflow: 'hidden',
                                padding: activeTab === 'leaderboard' ? '0' : (isMobile ? '1rem' : '1.5rem'),
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: 0,
                            }}
                        >
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ControlCenterModal; 
