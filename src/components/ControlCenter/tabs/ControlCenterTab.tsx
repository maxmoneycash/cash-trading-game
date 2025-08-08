import React, { useState } from 'react';

// Individual control module components
const ConnectionControl: React.FC<{
    icon: string;
    name: string;
    status?: string;
    active: boolean;
    onToggle: () => void;
}> = ({ icon, name, status, active, onToggle }) => {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr',
            gap: '1rem',
            alignItems: 'center',
            padding: '1rem',
        }}>
            <button
                onClick={onToggle}
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: 'none',
                    background: active
                        ? 'linear-gradient(135deg, #027AFF 0%, #0051D5 100%)'
                        : 'rgba(255, 255, 255, 0.1)',
                    color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: active
                        ? '0 4px 15px rgba(2, 122, 255, 0.4)'
                        : '0 2px 8px rgba(0, 0, 0, 0.1)',
                    transform: active ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = active ? 'scale(1.05)' : 'scale(1)';
                }}
            >
                {icon}
            </button>
            <div>
                <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.9)',
                }}>
                    {name}
                </p>
                {status && (
                    <p style={{
                        margin: '0.125rem 0 0 0',
                        fontSize: '0.75rem',
                        color: active ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.4)',
                    }}>
                        {active ? status : 'Off'}
                    </p>
                )}
            </div>
        </div>
    );
};

const Slider: React.FC<{
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    icon: string;
    label: string;
}> = ({ value, onChange, min = 0, max = 100, icon, label }) => {
    return (
        <div style={{
            padding: '1.5rem',
        }}>
            <p style={{
                margin: '0 0 1rem 0',
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 500,
            }}>
                {label}
            </p>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '50px',
                overflow: 'hidden',
                position: 'relative',
                height: '40px',
            }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '0 1rem',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.125rem',
                    color: 'rgba(0, 0, 0, 0.8)',
                    minWidth: '50px',
                }}>
                    {icon}
                </div>
                <div style={{
                    flex: 1,
                    position: 'relative',
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                }}>
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${value}%`,
                        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.9) 100%)',
                        transition: 'width 0.15s ease',
                    }} />
                    <input
                        type="range"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            opacity: 0,
                            cursor: 'pointer',
                        }}
                    />
                    <div style={{
                        position: 'absolute',
                        left: `${value}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '36px',
                        height: '36px',
                        background: '#ffffff',
                        borderRadius: '50%',
                        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
                        transition: 'left 0.15s ease',
                    }} />
                </div>
            </div>
        </div>
    );
};

const SmallControl: React.FC<{
    icon: string;
    label: string;
    active?: boolean;
    onClick?: () => void;
}> = ({ icon, label, active = false, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '1rem',
                background: active
                    ? 'linear-gradient(135deg, #685BDB 0%, #5A4FD8 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                width: '100%',
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                boxShadow: active
                    ? '0 4px 15px rgba(104, 91, 219, 0.4)'
                    : isHovered
                        ? '0 4px 12px rgba(0, 0, 0, 0.1)'
                        : 'none',
            }}
        >
            <span style={{
                fontSize: '1.5rem',
                color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
            }}>
                {icon}
            </span>
            <span style={{
                fontSize: '0.75rem',
                color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                fontWeight: 500,
                textAlign: 'center',
                lineHeight: 1.3,
            }}>
                {label}
            </span>
        </button>
    );
};

const ControlCenterTab: React.FC = () => {
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [hapticEnabled, setHapticEnabled] = useState(true);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
    const [animationSpeed, setAnimationSpeed] = useState(50);
    const [positionSize, setPositionSize] = useState(20);
    const [doNotDisturb, setDoNotDisturb] = useState(false);
    const [darkMode, setDarkMode] = useState(true);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            height: '100%',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
        }}>
            {/* Top Controls Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '1rem',
            }}>
                {/* Connection Controls */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(20px)',
                    overflow: 'hidden',
                }}>
                    <ConnectionControl
                        icon="♪"
                        name="Sound Effects"
                        status="Enabled"
                        active={soundEnabled}
                        onToggle={() => setSoundEnabled(!soundEnabled)}
                    />
                    <div style={{
                        height: '1px',
                        background: 'rgba(255, 255, 255, 0.08)'
                    }} />
                    <ConnectionControl
                        icon="◉"
                        name="Haptic Feedback"
                        status="Strong"
                        active={hapticEnabled}
                        onToggle={() => setHapticEnabled(!hapticEnabled)}
                    />
                    <div style={{
                        height: '1px',
                        background: 'rgba(255, 255, 255, 0.08)'
                    }} />
                    <ConnectionControl
                        icon="◈"
                        name="Auto-Save"
                        status="Every trade"
                        active={autoSaveEnabled}
                        onToggle={() => setAutoSaveEnabled(!autoSaveEnabled)}
                    />
                </div>

                {/* Other Controls */}
                <div style={{
                    display: 'grid',
                    gridTemplateRows: '1fr 1fr',
                    gap: '1rem',
                }}>
                    {/* Do Not Disturb */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                        display: 'grid',
                        gridTemplateColumns: '80px 1fr',
                        padding: '1.25rem',
                        alignItems: 'center',
                        gap: '1rem',
                    }}>
                        <button
                            onClick={() => setDoNotDisturb(!doNotDisturb)}
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                border: 'none',
                                background: doNotDisturb
                                    ? 'linear-gradient(135deg, #685BDB 0%, #5A4FD8 100%)'
                                    : 'rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '1.5rem',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: doNotDisturb
                                    ? '0 4px 15px rgba(104, 91, 219, 0.4)'
                                    : '0 2px 8px rgba(0, 0, 0, 0.1)',
                            }}
                        >
                            ☾
                        </button>
                        <div>
                            <p style={{
                                margin: 0,
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'rgba(255, 255, 255, 0.9)',
                                lineHeight: 1.4,
                            }}>
                                Do Not<br />Disturb
                            </p>
                        </div>
                    </div>

                    {/* Small Controls Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                    }}>
                        <SmallControl
                            icon="◐"
                            label="Theme"
                            active={!darkMode}
                            onClick={() => setDarkMode(!darkMode)}
                        />
                        <SmallControl
                            icon="≡"
                            label="Analytics"
                            onClick={() => console.log('Analytics clicked')}
                        />
                    </div>
                </div>
            </div>

            {/* Sliders Section */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
            }}>
                {/* Chart Speed Slider */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '0',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.5rem 0.5rem 1.5rem',
                    }}>
                        <span style={{
                            fontSize: '0.875rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontWeight: 500,
                        }}>
                            Chart Speed
                        </span>
                        <span style={{
                            fontSize: '1.5rem',
                        }}>
                            ▶
                        </span>
                    </div>
                    <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={animationSpeed}
                            onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                            style={{
                                width: '100%',
                                height: '40px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '20px',
                                outline: 'none',
                                WebkitAppearance: 'none',
                                appearance: 'none',
                                cursor: 'pointer',
                            }}
                            className="slider"
                        />
                    </div>
                    <style>{`
                        .slider::-webkit-slider-thumb {
                            -webkit-appearance: none;
                            appearance: none;
                            width: 40px;
                            height: 40px;
                            background: #FFFFFF;
                            border-radius: 50%;
                            cursor: pointer;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
                            transition: all 0.2s ease;
                        }
                        
                        .slider::-webkit-slider-thumb:active {
                            transform: scale(0.95);
                            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
                        }
                        
                        .slider::-moz-range-thumb {
                            width: 40px;
                            height: 40px;
                            background: #FFFFFF;
                            border: none;
                            border-radius: 50%;
                            cursor: pointer;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
                            transition: all 0.2s ease;
                        }
                        
                        .slider::-moz-range-thumb:active {
                            transform: scale(0.95);
                            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
                        }
                        
                        .slider2::-webkit-slider-thumb {
                            -webkit-appearance: none;
                            appearance: none;
                            width: 40px;
                            height: 40px;
                            background: #FFFFFF;
                            border-radius: 50%;
                            cursor: pointer;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
                            transition: all 0.2s ease;
                        }
                        
                        .slider2::-webkit-slider-thumb:active {
                            transform: scale(0.95);
                            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
                        }
                        
                        .slider2::-moz-range-thumb {
                            width: 40px;
                            height: 40px;
                            background: #FFFFFF;
                            border: none;
                            border-radius: 50%;
                            cursor: pointer;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
                            transition: all 0.2s ease;
                        }
                        
                        .slider2::-moz-range-thumb:active {
                            transform: scale(0.95);
                            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
                        }
                    `}</style>
                </div>

                {/* Position Size Slider */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '0',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.5rem 0.5rem 1.5rem',
                    }}>
                        <span style={{
                            fontSize: '0.875rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontWeight: 500,
                        }}>
                            Position Size ({positionSize}% of balance)
                        </span>
                        <span style={{
                            fontSize: '1.5rem',
                        }}>
                            $
                        </span>
                    </div>
                    <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                        <input
                            type="range"
                            min="5"
                            max="100"
                            value={positionSize}
                            onChange={(e) => setPositionSize(Number(e.target.value))}
                            style={{
                                width: '100%',
                                height: '40px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '20px',
                                outline: 'none',
                                WebkitAppearance: 'none',
                                appearance: 'none',
                                cursor: 'pointer',
                            }}
                            className="slider2"
                        />
                    </div>
                </div>

                {/* Game Info Card */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.05) 0%, rgba(0, 255, 136, 0.02) 100%)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0, 255, 136, 0.2)',
                    padding: '1.5rem',
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '60px 1fr',
                    gap: '1rem',
                    alignItems: 'center',
                }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '12px',
                        background: 'rgba(0, 255, 136, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.75rem',
                        fontWeight: 'bold',
                        color: '#00FF88',
                        margin: isMobile ? '0 auto' : '0',
                    }}>
                        C$
                    </div>
                    <div>
                        <h4 style={{
                            margin: 0,
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: 'rgba(255, 255, 255, 0.9)',
                        }}>
                            Cash Trading Game
                        </h4>
                        <p style={{
                            margin: '0.25rem 0',
                            fontSize: '0.75rem',
                            color: 'rgba(255, 255, 255, 0.5)',
                        }}>
                            Version 1.0.0 • Build 2024.1
                        </p>
                        <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            marginTop: '0.5rem',
                        }}>
                            <span style={{
                                fontSize: '0.75rem',
                                padding: '0.125rem 0.5rem',
                                background: 'rgba(0, 255, 136, 0.2)',
                                borderRadius: '12px',
                                color: '#00FF88',
                            }}>
                                Connected
                            </span>
                            <span style={{
                                fontSize: '0.75rem',
                                padding: '0.125rem 0.5rem',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: 'rgba(255, 255, 255, 0.6)',
                            }}>
                                Low Latency
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ControlCenterTab; 
