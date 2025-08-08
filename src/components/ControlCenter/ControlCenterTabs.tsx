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
];

const ControlCenterTabs: React.FC<ControlCenterTabsProps> = ({ activeTab, onTabChange }) => {
    return (
        <>
            <style>{`
                .tab-button {
                    -webkit-tap-highlight-color: transparent !important;
                    -webkit-touch-callout: none !important;
                    -webkit-user-select: none !important;
                    -khtml-user-select: none !important;
                    -moz-user-select: none !important;
                    -ms-user-select: none !important;
                    user-select: none !important;
                    outline: none !important;
                    border: none !important;
                    background-color: transparent !important;
                }
                .tab-button:focus {
                    outline: none !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .tab-button:active {
                    outline: none !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .tab-button:hover {
                    outline: none !important;
                }
            `}</style>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem 0.5rem',
                    paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
                    position: 'relative',
                }}
            >
                {/* buttons-container */}
                <div
                    style={{
                        width: '370px', // Wider for better text spacing
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
                                onClick={() => onTabChange(tab.id)}
                                onMouseDown={(e) => e.preventDefault()}
                                onTouchStart={(e) => e.preventDefault()}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '1px',
                                    height: '46px',
                                    width: '120px', // Wider tabs for better text spacing
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
                                        color: tab.id === activeTab ? '#00FF88' : 'gray',
                                        textShadow: tab.id === activeTab ? '0 0 15px rgba(0, 255, 136, 0.5)' : 'none',
                                        textDecoration: 'none',
                                        fontSize: '15px',
                                        fontWeight: 600,
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
