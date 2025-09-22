module cash_trading_game::game {
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event;

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INVALID_ROUND: u64 = 2;
    const E_ROUND_NOT_ACTIVE: u64 = 3;
    const E_INSUFFICIENT_BALANCE: u64 = 4;
    const E_ROUND_ALREADY_COMPLETED: u64 = 5;

    /// Game round structure
    struct GameRound has key, store {
        id: u64,
        player: address,
        seed: vector<u8>,
        bet_amount: u64,
        candle_config: CandleConfig,
        start_time: u64,
        end_time: u64,
        final_price: u64,
        pnl: i64,
        status: u8, // 0: active, 1: completed, 2: liquidated
    }

    /// Candle configuration for deterministic generation
    struct CandleConfig has store, copy, drop {
        initial_price_fp: u64,
        total_candles: u64,
        interval_ms: u64,
        fairness_version: u8,
        start_at_ms: u64,
    }

    /// Player state tracking
    struct PlayerState has key {
        active_rounds: vector<u64>,
        total_winnings: u64,
        total_losses: u64,
        games_played: u64,
        last_round_id: u64,
    }

    /// Global game state
    struct GameState has key {
        next_round_id: u64,
        total_rounds_played: u64,
        total_volume: u64,
    }

    /// Trade record for PnL calculation
    struct Trade has store, copy, drop {
        timestamp: u64,
        action: u8, // 0: buy, 1: sell
        price: u64,
        amount: u64,
    }

    /// Events
    #[event]
    struct GameStartEvent has drop, store {
        round_id: u64,
        player: address,
        bet_amount: u64,
        seed: vector<u8>,
        candle_config: CandleConfig,
    }

    #[event]
    struct GameEndEvent has drop, store {
        round_id: u64,
        player: address,
        final_pnl: i64,
        final_price: u64,
        trades_count: u64,
    }

    #[event]
    struct TradeEvent has drop, store {
        round_id: u64,
        player: address,
        action: u8,
        price: u64,
        amount: u64,
        timestamp: u64,
    }

    /// Initialize the game module (called once)
    fun init_module(admin: &signer) {
        move_to(admin, GameState {
            next_round_id: 1,
            total_rounds_played: 0,
            total_volume: 0,
        });
    }

    /// Initialize player state
    public entry fun initialize_player(account: &signer) {
        let player_addr = signer::address_of(account);
        if (!exists<PlayerState>(player_addr)) {
            move_to(account, PlayerState {
                active_rounds: vector::empty(),
                total_winnings: 0,
                total_losses: 0,
                games_played: 0,
                last_round_id: 0,
            });
        }
    }

    /// Start a new game round
    public entry fun start_game(
        account: &signer,
        bet_amount: u64,
        seed: vector<u8>
    ) acquires PlayerState, GameState {
        let player_addr = signer::address_of(account);
        
        // Initialize player if needed
        if (!exists<PlayerState>(player_addr)) {
            initialize_player(account);
        };

        // Transfer bet amount to contract (commented out for testing without APT)
        // coin::transfer<AptosCoin>(account, @cash_trading_game, bet_amount);
        
        // Get next round ID
        let game_state = borrow_global_mut<GameState>(@cash_trading_game);
        let round_id = game_state.next_round_id;
        game_state.next_round_id = round_id + 1;
        game_state.total_rounds_played = game_state.total_rounds_played + 1;
        game_state.total_volume = game_state.total_volume + bet_amount;

        // Create candle config
        let config = CandleConfig {
            initial_price_fp: 100000000, // $100.00 in fixed point (6 decimals)
            total_candles: 460,
            interval_ms: 65,
            fairness_version: 2,
            start_at_ms: timestamp::now_microseconds() / 1000, // Convert to ms
        };

        // Create game round
        let game_round = GameRound {
            id: round_id,
            player: player_addr,
            seed,
            bet_amount,
            candle_config: config,
            start_time: timestamp::now_microseconds(),
            end_time: 0,
            final_price: 0,
            pnl: 0,
            status: 0,
        };

        // Store round and update player state
        move_to(account, game_round);
        let player_state = borrow_global_mut<PlayerState>(player_addr);
        vector::push_back(&mut player_state.active_rounds, round_id);
        player_state.last_round_id = round_id;

        // Emit event
        event::emit(GameStartEvent {
            round_id,
            player: player_addr,
            bet_amount,
            seed,
            candle_config: config,
        });
    }

    /// Complete a game round with trades and final price
    public entry fun complete_game(
        account: &signer,
        round_id: u64,
        final_price: u64,
        trades: vector<Trade>
    ) acquires GameRound, PlayerState {
        let player_addr = signer::address_of(account);
        let game_round = borrow_global_mut<GameRound>(player_addr);
        
        // Verify round ownership and status
        assert!(game_round.player == player_addr, E_NOT_AUTHORIZED);
        assert!(game_round.id == round_id, E_INVALID_ROUND);
        assert!(game_round.status == 0, E_ROUND_ALREADY_COMPLETED);

        // Calculate final PnL from trades
        let pnl = calculate_pnl_from_trades(&trades, game_round.bet_amount);
        
        // Update game round
        game_round.end_time = timestamp::now_microseconds();
        game_round.final_price = final_price;
        game_round.pnl = pnl;
        game_round.status = 1;

        // Process winnings/losses (commented out for testing without APT)
        // if (pnl > 0) {
        //     let winnings = (pnl as u64);
        //     coin::transfer<AptosCoin>(@cash_trading_game, player_addr, winnings);
        // }

        // Update player state
        let player_state = borrow_global_mut<PlayerState>(player_addr);
        let (found, index) = vector::index_of(&player_state.active_rounds, &round_id);
        if (found) {
            vector::remove(&mut player_state.active_rounds, index);
        };
        player_state.games_played = player_state.games_played + 1;
        
        if (pnl > 0) {
            player_state.total_winnings = player_state.total_winnings + (pnl as u64);
        } else {
            player_state.total_losses = player_state.total_losses + ((-pnl) as u64);
        };

        // Emit completion event
        event::emit(GameEndEvent {
            round_id,
            player: player_addr,
            final_pnl: pnl,
            final_price,
            trades_count: vector::length(&trades),
        });
    }

    /// Calculate PnL from a series of trades
    fun calculate_pnl_from_trades(trades: &vector<Trade>, initial_balance: u64): i64 {
        let balance = (initial_balance as i64);
        let position = 0i64; // Amount of asset held
        let i = 0;
        let len = vector::length(trades);
        
        while (i < len) {
            let trade = vector::borrow(trades, i);
            if (trade.action == 0) { // buy
                balance = balance - (trade.amount as i64);
                position = position + (trade.amount as i64);
            } else { // sell
                balance = balance + (trade.amount as i64);
                position = position - (trade.amount as i64);
            };
            i = i + 1;
        };
        
        // Return net PnL
        balance - (initial_balance as i64)
    }

    /// Record a trade during an active game
    public entry fun record_trade(
        account: &signer,
        round_id: u64,
        action: u8,
        price: u64,
        amount: u64
    ) acquires GameRound {
        let player_addr = signer::address_of(account);
        let game_round = borrow_global<GameRound>(player_addr);
        
        // Verify round
        assert!(game_round.player == player_addr, E_NOT_AUTHORIZED);
        assert!(game_round.id == round_id, E_INVALID_ROUND);
        assert!(game_round.status == 0, E_ROUND_NOT_ACTIVE);

        // Emit trade event
        event::emit(TradeEvent {
            round_id,
            player: player_addr,
            action,
            price,
            amount,
            timestamp: timestamp::now_microseconds(),
        });
    }

    /// Withdraw winnings (for future use when APT transfers are enabled)
    public entry fun withdraw_winnings(
        account: &signer,
        amount: u64
    ) acquires PlayerState {
        let player_addr = signer::address_of(account);
        let player_state = borrow_global_mut<PlayerState>(player_addr);
        
        // Verify sufficient winnings
        assert!(player_state.total_winnings >= amount, E_INSUFFICIENT_BALANCE);
        
        // Transfer winnings (commented out for testing)
        // coin::transfer<AptosCoin>(@cash_trading_game, player_addr, amount);
        
        // Update player state
        player_state.total_winnings = player_state.total_winnings - amount;
    }

    /// View functions

    #[view]
    public fun get_player_state(player: address): (u64, u64, u64, u64) acquires PlayerState {
        if (!exists<PlayerState>(player)) {
            return (0, 0, 0, 0)
        };
        let state = borrow_global<PlayerState>(player);
        (state.total_winnings, state.total_losses, state.games_played, state.last_round_id)
    }

    #[view]
    public fun get_game_round(player: address): (u64, vector<u8>, CandleConfig, u64, u64, i64, u8) acquires GameRound {
        let round = borrow_global<GameRound>(player);
        (round.id, round.seed, round.candle_config, round.start_time, round.end_time, round.pnl, round.status)
    }

    #[view]
    public fun get_game_state(): (u64, u64, u64) acquires GameState {
        let state = borrow_global<GameState>(@cash_trading_game);
        (state.next_round_id, state.total_rounds_played, state.total_volume)
    }
}