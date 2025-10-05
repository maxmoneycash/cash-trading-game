module cash_trading_game::game {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

    /// Error codes
    const E_INVALID_BET_AMOUNT: u64 = 1;
    const E_INVALID_SEED: u64 = 2;
    const E_TRADE_VERIFICATION_FAILED: u64 = 3;
    const E_INSUFFICIENT_CONTRACT_BALANCE: u64 = 4;
    const E_ACTIVE_GAME_NOT_FOUND: u64 = 5;
    const E_SEED_MISMATCH: u64 = 6;
    const E_INVALID_PAYOUT: u64 = 7;

    /// Minimum bet amount (0.001 APT = 100,000 octas)
    const MIN_BET_AMOUNT: u64 = 100000;

    /// Maximum bet amount (10 APT = 1,000,000,000 octas)
    const MAX_BET_AMOUNT: u64 = 1000000000;

    /// Trade action types
    const TRADE_BUY: u8 = 0;
    const TRADE_SELL: u8 = 1;

    /// Events for game tracking and verification
    struct GameStartEvent has drop, store {
        player: address,
        bet_amount: u64,
        seed: vector<u8>,
        timestamp: u64,
    }

    struct GameEndEvent has drop, store {
        player: address,
        bet_amount: u64,
        profit: u64,      // 0 if loss
        loss: u64,        // 0 if profit
        payout: u64,
        timestamp: u64,
    }

    /// New event for single payout transactions
    struct GamePayoutEvent has drop, store {
        player: address,
        bet_amount: u64,
        total_payout: u64,
        pnl: i64,         // Can be negative for losses
        seed: vector<u8>,
        timestamp: u64,
    }

    /// Trade structure for verification
    struct Trade has copy, drop {
        timestamp: u64,
        action: u8,          // 0=buy, 1=sell
        price_fp: u64,       // Fixed-point price (price * 100000000)
        quantity: u64,
    }

    /// Candle configuration for deterministic price generation
    struct CandleConfig has copy, drop {
        initial_price_fp: u64,  // Starting price in fixed-point
        total_candles: u64,     // Number of candles to generate
        interval_ms: u64,       // Time between candles in milliseconds
        fairness_version: u8,   // Version for fairness verification
    }

    /// Active round tracking for each player
    struct ActiveGame has drop, store {
        player: address,
        bet_amount: u64,
        seed: vector<u8>,
    }

    struct ActiveGames has key {
        games: vector<ActiveGame>,
    }

    /// Event handles for emitting events
    struct EventHandles has key {
        game_start_events: EventHandle<GameStartEvent>,
        game_end_events: EventHandle<GameEndEvent>,
        game_payout_events: EventHandle<GamePayoutEvent>,  // New event handle
    }

    /// Resource account capability for managing funds
    struct GameTreasury has key {
        signer_cap: account::SignerCapability,
    }

    /// Initialize the module (called once when deploying)
    fun init_module(account: &signer) {
        // Create resource account for treasury
        let (treasury_signer, signer_cap) = account::create_resource_account(account, b"treasury");

        // Register treasury account for APT
        coin::register<AptosCoin>(&treasury_signer);

        // Store the signer capability
        move_to(account, GameTreasury {
            signer_cap,
        });

        // Create event handles
        move_to(account, EventHandles {
            game_start_events: account::new_event_handle<GameStartEvent>(account),
            game_end_events: account::new_event_handle<GameEndEvent>(account),
            game_payout_events: account::new_event_handle<GamePayoutEvent>(account),
        });

        // Initialize active game tracking
        move_to(account, ActiveGames {
            games: vector::empty<ActiveGame>(),
        });
    }

    /// Single transaction game payout with trade history
    /// Player submits bet amount, trades, and receives payout in one transaction
    public entry fun settle_game_with_trades(
        account: &signer,
        bet_amount: u64,
        seed: vector<u8>,
        entry_prices: vector<u64>,      // Fixed-point prices
        exit_prices: vector<u64>,       // Fixed-point prices
        entry_candle_indices: vector<u64>,
        exit_candle_indices: vector<u64>,
        sizes: vector<u64>,             // Position sizes in octas
        pnls: vector<u64>,              // Individual trade P&Ls in octas
        is_net_profit: bool,            // Whether total P&L is profit
        net_pnl_amount: u64             // Absolute value of total P&L in octas
    ) acquires EventHandles, GameTreasury {
        let player = signer::address_of(account);

        // Validate inputs
        assert!(bet_amount >= MIN_BET_AMOUNT && bet_amount <= MAX_BET_AMOUNT, E_INVALID_BET_AMOUNT);
        assert!(!vector::is_empty(&seed), E_INVALID_SEED);
        
        // Validate trade arrays have same length
        let trade_count = vector::length(&entry_prices);
        assert!(vector::length(&exit_prices) == trade_count, E_TRADE_VERIFICATION_FAILED);
        assert!(vector::length(&entry_candle_indices) == trade_count, E_TRADE_VERIFICATION_FAILED);
        assert!(vector::length(&exit_candle_indices) == trade_count, E_TRADE_VERIFICATION_FAILED);
        assert!(vector::length(&sizes) == trade_count, E_TRADE_VERIFICATION_FAILED);
        assert!(vector::length(&pnls) == trade_count, E_TRADE_VERIFICATION_FAILED);

        // Get treasury address
        let treasury = borrow_global<GameTreasury>(@cash_trading_game);
        let treasury_address = account::get_signer_capability_address(&treasury.signer_cap);

        // Calculate net payment
        let (player_pays, treasury_pays, pnl_i64) = if (is_net_profit) {
            // Player won overall: treasury pays out bet + profit
            (0, bet_amount + net_pnl_amount, net_pnl_amount as i64)
        } else {
            // Player lost overall
            if (net_pnl_amount >= bet_amount) {
                // Total loss: player pays bet amount, gets nothing back
                (bet_amount, 0, -(bet_amount as i64))
            } else {
                // Partial loss: player pays bet amount, gets back (bet - loss)
                (bet_amount, bet_amount - net_pnl_amount, -(net_pnl_amount as i64))
            }
        };

        // Execute transfers
        if (player_pays > 0) {
            coin::transfer<AptosCoin>(account, treasury_address, player_pays);
        };

        if (treasury_pays > 0) {
            let treasury_signer = account::create_signer_with_capability(&treasury.signer_cap);
            let treasury_balance = coin::balance<AptosCoin>(treasury_address);
            assert!(treasury_balance >= treasury_pays, E_INSUFFICIENT_CONTRACT_BALANCE);
            coin::transfer<AptosCoin>(&treasury_signer, player, treasury_pays);
        };

        // Emit detailed game event with trade count
        let event_handles = borrow_global_mut<EventHandles>(@cash_trading_game);
        event::emit_event(&mut event_handles.game_payout_events, GamePayoutEvent {
            player,
            bet_amount,
            total_payout: treasury_pays,
            pnl: pnl_i64,
            seed,
            timestamp: timestamp::now_microseconds(),
        });
    }

    /// Single transaction game payout without trade details
    /// Used when no individual trades are tracked
    public entry fun process_game_payout(
        account: &signer,
        bet_amount: u64,
        seed: vector<u8>,
        is_profit: bool,
        pnl_amount: u64  // absolute value of profit/loss
    ) acquires EventHandles, GameTreasury {
        let player = signer::address_of(account);

        // Validate bet amount and seed
        assert!(bet_amount >= MIN_BET_AMOUNT && bet_amount <= MAX_BET_AMOUNT, E_INVALID_BET_AMOUNT);
        assert!(!vector::is_empty(&seed), E_INVALID_SEED);

        // Get treasury address
        let treasury = borrow_global<GameTreasury>(@cash_trading_game);
        let treasury_address = account::get_signer_capability_address(&treasury.signer_cap);

        // Calculate net payment
        // If profit: player receives bet_amount + pnl_amount from treasury
        // If loss: player pays bet_amount to treasury and receives back (bet_amount - pnl_amount)
        let (player_pays, treasury_pays, pnl_i64) = if (is_profit) {
            // Player won: treasury pays out bet + profit
            (0, bet_amount + pnl_amount, pnl_amount as i64)
        } else {
            // Player lost
            if (pnl_amount >= bet_amount) {
                // Total loss: player pays bet amount, gets nothing back
                (bet_amount, 0, -(bet_amount as i64))
            } else {
                // Partial loss: player pays bet amount, gets back (bet - loss)
                (bet_amount, bet_amount - pnl_amount, -(pnl_amount as i64))
            }
        };

        // Execute transfers
        if (player_pays > 0) {
            // Player pays their bet to treasury
            coin::transfer<AptosCoin>(account, treasury_address, player_pays);
        };

        if (treasury_pays > 0) {
            // Treasury pays out to player
            let treasury_signer = account::create_signer_with_capability(&treasury.signer_cap);
            
            // Check treasury balance
            let treasury_balance = coin::balance<AptosCoin>(treasury_address);
            assert!(treasury_balance >= treasury_pays, E_INSUFFICIENT_CONTRACT_BALANCE);
            
            coin::transfer<AptosCoin>(&treasury_signer, player, treasury_pays);
        };

        // Emit payout event
        let event_handles = borrow_global_mut<EventHandles>(@cash_trading_game);
        event::emit_event(&mut event_handles.game_payout_events, GamePayoutEvent {
            player,
            bet_amount,
            total_payout: treasury_pays,
            pnl: pnl_i64,
            seed,
            timestamp: timestamp::now_microseconds(),
        });
    }

    /// Start a new trading game (legacy - kept for compatibility)
    /// Player bets APT, providing the deterministic seed used for the round
    public entry fun start_game(
        account: &signer,
        bet_amount: u64,
        seed: vector<u8>
    ) acquires ActiveGames, EventHandles, GameTreasury {
        let player = signer::address_of(account);

        // Validate bet amount and seed
        assert!(bet_amount >= MIN_BET_AMOUNT && bet_amount <= MAX_BET_AMOUNT, E_INVALID_BET_AMOUNT);
        assert!(!vector::is_empty(&seed), E_INVALID_SEED);

        // Get treasury address
        let treasury = borrow_global<GameTreasury>(@cash_trading_game);
        let treasury_address = account::get_signer_capability_address(&treasury.signer_cap);

        // Transfer bet amount from player to treasury
        coin::transfer<AptosCoin>(account, treasury_address, bet_amount);

        // Track the active game so we can verify completion later
        let active_games = borrow_global_mut<ActiveGames>(@cash_trading_game);
        let stored_seed = clone_seed(&seed);
        upsert_active_game(&mut active_games.games, player, bet_amount, stored_seed);

        // Emit game start event with the supplied seed
        let event_handles = borrow_global_mut<EventHandles>(@cash_trading_game);
        event::emit_event(&mut event_handles.game_start_events, GameStartEvent {
            player,
            bet_amount,
            seed,
            timestamp: timestamp::now_microseconds(),
        });
    }

    /// Complete a trading game and receive payout (legacy - kept for compatibility)
    /// Player submits final P&L for verification and payout
    public entry fun complete_game(
        account: &signer,
        seed: vector<u8>,
        is_profit: bool,
        amount: u64  // either profit amount or loss amount
    ) acquires ActiveGames, EventHandles, GameTreasury {
        let player = signer::address_of(account);

        // Verify the seed and recover the wager that was posted at start_game
        let bet_amount = verify_seed_and_extract_bet(player, &seed);

        // Calculate payout based on profit/loss
        let (payout, profit, loss) = if (is_profit) {
            (bet_amount + amount, amount, 0)
        } else {
            if (amount >= bet_amount) {
                (0, 0, bet_amount) // Total loss
            } else {
                (bet_amount - amount, 0, amount) // Partial loss
            }
        };

        // Transfer payout to player if any
        if (payout > 0) {
            let treasury = borrow_global<GameTreasury>(@cash_trading_game);
            let treasury_signer = account::create_signer_with_capability(&treasury.signer_cap);
            coin::transfer<AptosCoin>(&treasury_signer, player, payout);
        };

        // Emit game end event
        let event_handles = borrow_global_mut<EventHandles>(@cash_trading_game);
        event::emit_event(&mut event_handles.game_end_events, GameEndEvent {
            player,
            bet_amount,
            profit,
            loss,
            payout,
            timestamp: timestamp::now_microseconds(),
        });
    }

    /// Verify the supplied seed, remove the active game record, and return the bet amount
    fun verify_seed_and_extract_bet(
        player: address,
        seed: &vector<u8>
    ): u64 acquires ActiveGames {
        assert!(!vector::is_empty(seed), E_INVALID_SEED);

        let active_games = borrow_global_mut<ActiveGames>(@cash_trading_game);
        let (found, index) = find_game_index(&active_games.games, player);
        assert!(found, E_ACTIVE_GAME_NOT_FOUND);

        {
            let stored_game = vector::borrow(&active_games.games, index);
            let stored_seed = &stored_game.seed;
            assert!(seeds_match(seed, stored_seed), E_SEED_MISMATCH);
        };

        let removed_game = vector::swap_remove(&mut active_games.games, index);
        let ActiveGame { player: _, bet_amount, seed: _ } = removed_game;
        bet_amount
    }

    /// Helper: find an active game for a player
    fun find_game_index(games: &vector<ActiveGame>, player: address): (bool, u64) {
        find_game_index_inner(games, player, 0)
    }

    fun find_game_index_inner(games: &vector<ActiveGame>, player: address, index: u64): (bool, u64) {
        if (index >= vector::length(games)) {
            (false, 0)
        } else {
            let game_ref = vector::borrow(games, index);
            if (game_ref.player == player) {
                (true, index)
            } else {
                find_game_index_inner(games, player, index + 1)
            }
        }
    }

    /// Helper: insert or replace the active game entry for a player
    fun upsert_active_game(
        games: &mut vector<ActiveGame>,
        player: address,
        bet_amount: u64,
        seed: vector<u8>
    ) {
        let (found, index) = find_game_index(games, player);
        if (found) {
            let _ = vector::swap_remove(games, index);
        };
        vector::push_back(games, ActiveGame { player, bet_amount, seed });
    }

    /// Helper: clone a seed vector
    fun clone_seed(seed: &vector<u8>): vector<u8> {
        let clone = vector::empty<u8>();
        clone_seed_inner(seed, 0, &mut clone);
        clone
    }

    fun clone_seed_inner(seed: &vector<u8>, index: u64, clone_ref: &mut vector<u8>) {
        if (index >= vector::length(seed)) {
            return;
        };
        vector::push_back(clone_ref, *vector::borrow(seed, index));
        clone_seed_inner(seed, index + 1, clone_ref);
    }

    /// Helper: compare two byte seeds
    fun seeds_match(a: &vector<u8>, b: &vector<u8>): bool {
        if (vector::length(a) != vector::length(b)) {
            return false;
        };
        seeds_match_inner(a, b, 0)
    }

    fun seeds_match_inner(a: &vector<u8>, b: &vector<u8>, index: u64): bool {
        if (index >= vector::length(a)) {
            true
        } else if (*vector::borrow(a, index) != *vector::borrow(b, index)) {
            false
        } else {
            seeds_match_inner(a, b, index + 1)
        }
    }

    /// View function to get default candle configuration
    public fun get_default_candle_config(): CandleConfig {
        CandleConfig {
            initial_price_fp: 10000000000, // $100.00 in fixed-point (8 decimals)
            total_candles: 460,
            interval_ms: 65,
            fairness_version: 2,
        }
    }

    /// Utility function to convert APT to octas for display
    public fun apt_to_octas(apt_amount: u64): u64 {
        apt_amount * 100000000
    }

    /// Utility function to convert octas to APT for display
    public fun octas_to_apt(octas: u64): u64 {
        octas / 100000000
    }

    /// Public function to initialize the treasury (needed after contract upgrade)
    public entry fun initialize_treasury(account: &signer) {
        // Only allow the contract owner to initialize
        assert!(signer::address_of(account) == @cash_trading_game, 999);

        // Initialize treasury if missing
        if (!exists<GameTreasury>(@cash_trading_game)) {
            let (treasury_signer, signer_cap) = account::create_resource_account(account, b"treasury");
            coin::register<AptosCoin>(&treasury_signer);
            move_to(account, GameTreasury {
                signer_cap,
            });
        };

        // Initialize event handles if missing
        if (!exists<EventHandles>(@cash_trading_game)) {
            move_to(account, EventHandles {
                game_start_events: account::new_event_handle<GameStartEvent>(account),
                game_end_events: account::new_event_handle<GameEndEvent>(account),
                game_payout_events: account::new_event_handle<GamePayoutEvent>(account),
            });
        };

        // Initialize active game tracking if missing
        if (!exists<ActiveGames>(@cash_trading_game)) {
            move_to(account, ActiveGames {
                games: vector::empty<ActiveGame>(),
            });
        };
    }

    /// Withdraw house profits from treasury to owner's wallet
    /// Only the contract owner can call this
    public entry fun withdraw_house_profits(
        account: &signer,
        amount: u64
    ) acquires GameTreasury {
        // Only allow the contract owner to withdraw
        assert!(signer::address_of(account) == @cash_trading_game, 999);

        let treasury = borrow_global<GameTreasury>(@cash_trading_game);
        let treasury_signer = account::create_signer_with_capability(&treasury.signer_cap);

        // Transfer from treasury to owner's wallet
        coin::transfer<AptosCoin>(&treasury_signer, signer::address_of(account), amount);
    }

    // View function to check treasury balance
    #[view]
    public fun get_treasury_balance(): u64 acquires GameTreasury {
        let treasury = borrow_global<GameTreasury>(@cash_trading_game);
        let treasury_address = account::get_signer_capability_address(&treasury.signer_cap);
        coin::balance<AptosCoin>(treasury_address)
    }

    #[test_only]
    public fun init_for_test(account: &signer) {
        init_module(account);
    }
}
