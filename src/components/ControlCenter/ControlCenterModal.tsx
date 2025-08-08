import React, { useState } from 'react';
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

    if (!isOpen) return null;

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

    return (
        <>
            <style>{`
                @media (max-width: 768px) {
                    .modal-container-responsive {
                        width: calc(100vw - 2rem) !important;
                        margin: 1rem !important;
                        maxHeight: calc(100vh - 2rem) !important;
                    }
                    .modal-content-responsive {
                        padding: 1rem !important;
                    }
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
                        width: '92vw',
                        height: 'auto',
                        maxWidth: '1100px',
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
                        margin: '1rem',
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
                                padding: '1.5rem',
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
