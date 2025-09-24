import React from 'react';

interface TransactionLogEntry {
  id: string;
  timestamp: Date;
  type: 'connect' | 'faucet' | 'game_start' | 'game_complete' | 'balance_refresh';
  status: 'pending' | 'success' | 'error';
  message: string;
  txHash?: string;
}

interface TransactionLogProps {
  entries: TransactionLogEntry[];
  onClear: () => void;
}

export function TransactionLog({
  entries,
  onClear
}: TransactionLogProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '?';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'connect':
        return '🔗';
      case 'faucet':
        return '🚰';
      case 'game_start':
        return '🎮';
      case 'game_complete':
        return '🏁';
      case 'balance_refresh':
        return '💰';
      default:
        return '📝';
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getExplorerUrl = (txHash: string) => {
    return `https://explorer.aptoslabs.com/txn/${txHash}?network=devnet`;
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ margin: 0, color: '#4ecdc4' }}>
          📋 Transaction Log
        </h3>
        <button
          onClick={onClear}
          disabled={entries.length === 0}
          style={{
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            borderRadius: '6px',
            color: entries.length > 0 ? '#f44336' : '#666',
            cursor: entries.length > 0 ? 'pointer' : 'not-allowed',
            padding: '8px 12px',
            fontSize: '12px'
          }}
        >
          Clear Log
        </button>
      </div>

      {entries.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '14px'
        }}>
          No transactions yet. Start by connecting your wallet!
        </div>
      ) : (
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px'
        }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                background: entry.status === 'pending'
                  ? 'rgba(255, 152, 0, 0.05)'
                  : 'transparent'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    <span>{getTypeIcon(entry.type)}</span>
                    <span
                      style={{
                        color: getStatusColor(entry.status),
                        fontWeight: '600',
                        fontSize: '14px'
                      }}
                    >
                      {getStatusIcon(entry.status)}
                    </span>
                    <span style={{
                      fontSize: '14px',
                      color: '#ffffff'
                    }}>
                      {entry.message}
                    </span>
                  </div>

                  {entry.txHash && (
                    <div style={{
                      marginTop: '6px',
                      fontSize: '12px'
                    }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Tx: {' '}
                      </span>
                      <a
                        href={getExplorerUrl(entry.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#4ecdc4',
                          textDecoration: 'none'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                      >
                        {entry.txHash.slice(0, 8)}...{entry.txHash.slice(-6)}
                      </a>
                    </div>
                  )}
                </div>

                <div style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  whiteSpace: 'nowrap'
                }}>
                  {formatTime(entry.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div style={{
          marginTop: '10px',
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.5)',
          textAlign: 'center'
        }}>
          Showing last {entries.length} transaction{entries.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}