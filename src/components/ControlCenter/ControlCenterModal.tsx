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
                /* Remove all media query overrides since modal is now fullscreen */
                .modal-container-responsive {
                    width: 100vw !important;
                    height: 100vh !important;
                    max-width: 100vw !important;
                    max-height: 100vh !important;
                    margin: 0 !important;
                    border-radius: 0 !important;
                }
                
                /* Liquid glass animation */
                @keyframes liquidShimmer {
                    0% {
                        background-position: 0% 50%, 100% 50%, 50% 0%;
                        opacity: 0.8;
                    }
                    50% {
                        background-position: 100% 50%, 0% 50%, 50% 100%;
                        opacity: 1;
                    }
                    100% {
                        background-position: 0% 50%, 100% 50%, 50% 0%;
                        opacity: 0.8;
                    }
                }
                
                .glass-overlay {
                    animation: liquidShimmer 30s ease-in-out infinite;
                    background-size: 200% 200%, 150% 150%, 180% 180%;
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
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    background: 'rgba(0, 0, 0, 0.8)',
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
                        width: '100vw',
                        height: '100vh',
                        maxWidth: '100vw',
                        maxHeight: '100vh',
                        borderRadius: '0',
                        background: 'transparent',
                        boxShadow: `
                            inset 0 0 0 1px rgba(255, 255, 255, 0.06),
                            0 0 0 1px rgba(255, 255, 255, 0.04),
                            0 8px 32px rgba(0, 0, 0, 0.6),
                            0 12px 48px rgba(0, 0, 0, 0.5),
                            0 0 80px rgba(0, 0, 0, 0.4),
                            inset 0 0 60px rgba(0, 0, 0, 0.3)
                        `,
                        border: 'none',
                        fontFamily: 'Bai Jamjuree, sans-serif',
                        pointerEvents: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        margin: '0',
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    onTouchMove={(e) => {
                        // Allow touch scrolling inside the modal
                        e.stopPropagation();
                    }}
                >
                    <div
                        className="glass-filter"
                        style={{
                            backdropFilter: 'blur(16px) saturate(100%) brightness(0.6)',
                            WebkitBackdropFilter: 'blur(16px) saturate(100%) brightness(0.6)',
                        }}
                    />
                    <div
                        className="glass-overlay"
                        style={{
                            background: `
                                linear-gradient(135deg, 
                                    rgba(255, 255, 255, 0.02) 0%, 
                                    rgba(255, 255, 255, 0.01) 30%,
                                    rgba(255, 255, 255, 0.015) 70%,
                                    rgba(255, 255, 255, 0.03) 100%
                                ),
                                radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
                                radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.01) 0%, transparent 50%),
                                linear-gradient(to bottom, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.1) 100%)
                            `,
                        }}
                    />
                    <div
                        className="glass-specular"
                        style={{
                            boxShadow: `
                                inset 0 1px 0 rgba(255, 255, 255, 0.06),
                                inset 1px 0 0 rgba(255, 255, 255, 0.04),
                                inset 0 -1px 0 rgba(255, 255, 255, 0.02),
                                inset -1px 0 0 rgba(255, 255, 255, 0.02),
                                inset 0 0 10px rgba(0, 0, 0, 0.2)
                            `,
                            background: `
                                radial-gradient(ellipse at 30% 20%, rgba(255, 255, 255, 0.06) 0%, transparent 40%),
                                radial-gradient(ellipse at 70% 40%, rgba(255, 255, 255, 0.03) 0%, transparent 40%),
                                radial-gradient(ellipse at 50% 60%, rgba(255, 255, 255, 0.02) 0%, transparent 60%),
                                radial-gradient(circle at 90% 10%, rgba(255, 255, 255, 0.04) 0%, transparent 30%),
                                linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 20%, transparent 80%, rgba(0, 0, 0, 0.1) 100%)
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
