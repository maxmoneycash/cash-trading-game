import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface CandleData {
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    isLiquidation?: boolean;
}

interface GameStateData {
    currentPrice: number;
    isRoundActive: boolean;
    roundStartTime: number;
    candleHistory: CandleData[];
    recentCandles: CandleData[];
}

interface RoundStartedData {
    startTime: number;
}

interface UseSocketProps {
    onNewCandle: (candle: CandleData) => void;
    onGameState: (state: GameStateData) => void;
    onRoundStarted: (data: RoundStartedData) => void;
    onRoundStopped: () => void;
}

export const useSocket = ({ onNewCandle, onGameState, onRoundStarted, onRoundStopped }: UseSocketProps) => {
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Connect to server
        socketRef.current = io('http://localhost:3001', {
            transports: ['websocket']
        });

        const socket = socketRef.current;

        // Event listeners
        socket.on('connect', () => {
            console.log('🔌 Connected to trading server');
        });

        socket.on('new_candle', onNewCandle);
        socket.on('game_state', onGameState);
        socket.on('round_started', onRoundStarted);
        socket.on('round_stopped', onRoundStopped);

        socket.on('disconnect', () => {
            console.log('❌ Disconnected from trading server');
        });

        socket.on('connect_error', (error) => {
            console.log('🚨 Connection error:', error);
        });

        // Cleanup on unmount
        return () => {
            socket.disconnect();
        };
    }, [onNewCandle, onGameState, onRoundStarted, onRoundStopped]);

    const startRound = () => {
        socketRef.current?.emit('start_round');
    };

    const stopRound = () => {
        socketRef.current?.emit('stop_round');
    };

    return {
        startRound,
        stopRound,
        isConnected: socketRef.current?.connected || false
    };
};