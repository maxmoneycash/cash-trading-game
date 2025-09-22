import React, { useState } from 'react';
import { Sheet } from "@silk-hq/components";
import "./GameSheet.css";
import ControlCenterTabs from '../ControlCenter/ControlCenterTabs';
import LeaderboardTab from '../ControlCenter/tabs/LeaderboardTab';
import AccountTab from '../ControlCenter/tabs/AccountTab';
import ControlCenterTab from '../ControlCenter/tabs/ControlCenterTab';
import { TabId } from '../ControlCenter/ControlCenterModal';

interface GameSheetProps {
    balance: number;
    pnl: number;
    displayPnl: number;
    isHolding: boolean;
    showLiquidation: boolean;
    rugpullType: string | null;
}

const GameSheet: React.FC<GameSheetProps> = ({ 
    balance, 
    pnl, 
    displayPnl, 
    isHolding, 
    showLiquidation, 
    rugpullType 
}) => {
    const [activeTab, setActiveTab] = useState<TabId>('account');
    const [presented, setPresented] = useState(false);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const isLiquidationEvent = showLiquidation || rugpullType !== null;
    
    // Persistent content that shows at bottom
    const PersistentBar = () => {
        const isNeutral = !isHolding || Math.abs(pnl) < 0.01;
        const isProfit = pnl > 0.01;
        const pnlIntensity = Math.min(Math.abs(pnl) / 100, 1);
        const baseIntensity = 0.08;
        const maxIntensity = 0.20;
        const currentIntensity = baseIntensity + (pnlIntensity * (maxIntensity - baseIntensity));
        
        let pnlColor;
        if (isNeutral) {
            pnlColor = 'rgba(255,255,255,0.9)';
        } else if (isProfit) {
            pnlColor = '#00FF99';
        } else {
            pnlColor = '#FF5555';
        }

        return (
            <div className="persistent-bar">
                <div className="persistent-content">
                    <div className="info-section">
                        <div className="info-item">
                            <span className="info-label">Balance</span>
                            <span className="info-value">${balance.toFixed(0)}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">P&L</span>
                            <span className="info-value" style={{ color: pnlColor }}>
                                {displayPnl >= 0 ? '+' : ''}${displayPnl.toFixed(2)}
                            </span>
                        </div>
                    </div>
                    
                    {!isHolding && !isLiquidationEvent && (
                        <div className="instructions">
                            Hold to Buy • Release to Sell
                        </div>
                    )}
                    
                    {isHolding && (
                        <div className="position-indicator">
                            ACTIVE POSITION
                        </div>
                    )}
                </div>
            </div>
        );
    };

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
        <Sheet.Root 
            license="non-commercial"
            presented={presented} 
            onPresentedChange={setPresented}
        >
            {/* Persistent bottom bar - always visible */}
            <div 
                className="persistent-wrapper"
                onClick={() => setPresented(true)}
            >
                <PersistentBar />
            </div>

            <Sheet.Portal>
                <Sheet.View 
                    className="GameSheet-view" 
                    contentPlacement="bottom"
                    swipeDismissal={true}
                    detents={["60lvh"]}
                >
                    <Sheet.Backdrop 
                        className="GameSheet-backdrop" 
                        themeColorDimming="auto" 
                    />
                    <Sheet.Content className="GameSheet-content">
                        <Sheet.BleedingBackground className="GameSheet-bleedingBackground" />
                        
                        {/* Handle for dragging */}
                        <div className="sheet-handle-container">
                            <Sheet.Handle className="sheet-handle">
                                <span className="visually-hidden">Drag to expand or close</span>
                            </Sheet.Handle>
                        </div>

                        {/* Tab Navigation */}
                        <div className="sheet-tabs-container">
                            <ControlCenterTabs
                                activeTab={activeTab}
                                onTabChange={(tab) => {
                                    if (tab === 'close') {
                                        setPresented(false);
                                    } else {
                                        setActiveTab(tab);
                                    }
                                }}
                            />
                        </div>

                        {/* Tab Content */}
                        <div className="sheet-content-container">
                            {renderTabContent()}
                        </div>
                    </Sheet.Content>
                </Sheet.View>
            </Sheet.Portal>
        </Sheet.Root>
    );
};

export default GameSheet;