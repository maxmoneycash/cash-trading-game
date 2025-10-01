import React, { useState, useEffect } from 'react';
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
    onSheetStateChange?: (expanded: boolean) => void;
}

const GameSheet: React.FC<GameSheetProps> = ({ 
    balance, 
    pnl, 
    displayPnl, 
    isHolding, 
    showLiquidation, 
    rugpullType,
    onSheetStateChange
}) => {
    const [activeTab, setActiveTab] = useState<TabId>('account');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const isLiquidationEvent = showLiquidation || rugpullType !== null;

    // Notify parent when sheet state changes
    useEffect(() => {
        onSheetStateChange?.(isSheetOpen);
    }, [isSheetOpen, onSheetStateChange]);
    
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
        <>
            {/* Trigger button - always accessible */}
            <button
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    zIndex: 1300,
                    cursor: 'pointer'
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsSheetOpen(true);
                }}
                onTouchStart={(e) => {
                    e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                    e.stopPropagation();
                }}
            >
                Open Game Controls
            </button>

            {/* Touch-blocking overlay when sheet is open */}
            {isSheetOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1100,
                        pointerEvents: 'auto',
                        background: 'transparent'
                    }}
                    onTouchStart={(e) => {
                        e.stopPropagation();
                    }}
                    onTouchMove={(e) => {
                        e.stopPropagation();
                    }}
                    onTouchEnd={(e) => {
                        e.stopPropagation();
                    }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                    }}
                    onPointerMove={(e) => {
                        e.stopPropagation();
                    }}
                    onPointerUp={(e) => {
                        e.stopPropagation();
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                />
            )}

            <Sheet.Root 
                license="non-commercial"
                presented={isSheetOpen}
                onPresentedChange={setIsSheetOpen}
            >
                
                <Sheet.Portal>
                    <Sheet.View className="GameSheet-view" detents="50vh">
                        <Sheet.Backdrop 
                            themeColorDimming="auto"
                            onClick={() => setIsSheetOpen(false)}
                        />
                        <Sheet.Content 
                            className="GameSheet-content"
                            onTouchMove={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Sheet.BleedingBackground className="GameSheet-bleedingBackground" />
                            
                            {/* Extended drag handle area */}
                            <div className="sheet-drag-area">
                                <div className="sheet-handle-visual" />
                            </div>
                            
                            {/* Persistent content */}
                            <div 
                                style={{ padding: '16px' }}
                                onTouchStart={(e) => e.stopPropagation()}
                                onTouchEnd={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <PersistentBar />
                            </div>

                            {/* Expandable content */}
                            <div 
                                style={{ flex: 1, padding: '0 16px 16px' }}
                                onTouchStart={(e) => e.stopPropagation()}
                                onTouchEnd={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ControlCenterTabs
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                />
                                
                                <div style={{ marginTop: '16px' }}>
                                    {renderTabContent()}
                                </div>
                            </div>
                        </Sheet.Content>
                    </Sheet.View>
                </Sheet.Portal>
            </Sheet.Root>
        </>
    );
};

export default GameSheet;