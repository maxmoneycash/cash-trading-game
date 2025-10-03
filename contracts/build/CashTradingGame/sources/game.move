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

    /// Event handles for emitting events
    struct EventHandles has key {
        game_start_events: EventHandle<GameStartEvent>,
        game_end_events: EventHandle<GameEndEvent>,
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
        });
    }

    /// Start a new trading game
    /// Player bets APT, receives a seed for deterministic price generation
    public entry fun start_game(
        account: &signer,
        bet_amount: u64
    ) acquires EventHandles, GameTreasury {
        let player = signer::address_of(account);

        // Validate bet amount
        assert!(bet_amount >= MIN_BET_AMOUNT && bet_amount <= MAX_BET_AMOUNT, E_INVALID_BET_AMOUNT);

        // Get treasury address
        let treasury = borrow_global<GameTreasury>(@cash_trading_game);
        let treasury_address = account::get_signer_capability_address(&treasury.signer_cap);

        // Transfer bet amount from player to treasury
        coin::transfer<AptosCoin>(account, treasury_address, bet_amount);

        // Generate random seed for deterministic price generation
        let seed = generate_game_seed();

        // Emit game start event
        let event_handles = borrow_global_mut<EventHandles>(@cash_trading_game);
        event::emit_event(&mut event_handles.game_start_events, GameStartEvent {
            player,
            bet_amount,
            seed,
            timestamp: timestamp::now_microseconds(),
        });
    }

    /// Complete a trading game and receive payout
    /// Player submits final P&L for verification and payout
    public entry fun complete_game(
        account: &signer,
        seed: vector<u8>,
        is_profit: bool,
        amount: u64  // either profit amount or loss amount
    ) acquires EventHandles, GameTreasury {
        let player = signer::address_of(account);

        // Verify the seed and get bet amount
        let bet_amount = verify_seed_and_get_bet(&seed);

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

    /// Generate a random seed for the game
    fun generate_game_seed(): vector<u8> {
        // For now, use timestamp for simple randomness
        let time_bytes = timestamp::now_microseconds();
        let seed = vector::empty<u8>();

        // Convert timestamp to bytes (simple approach)
        let i = 0;
        while (i < 8) {
            vector::push_back(&mut seed, ((time_bytes >> (i * 8)) & 0xFF as u8));
            i = i + 1;
        };

        seed
    }

    /// Verify the seed and return bet amount
    /// This is where the fairness verification happens
    fun verify_seed_and_get_bet(
        seed: &vector<u8>
    ): u64 {
        // For now, return a fixed bet amount for testing
        // TODO: Implement full verification against seed-generated prices
        assert!(!vector::is_empty(seed), E_INVALID_SEED);

        // Placeholder: In real implementation, this would:
        // 1. Generate candles from seed
        // 2. Verify the seed is valid
        // 3. Return the original bet amount from game start event

        100000000 // 1 APT for testing
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

        // Check if already initialized
        if (exists<GameTreasury>(@cash_trading_game)) {
            return
        };

        // Create resource account for treasury
        let (treasury_signer, signer_cap) = account::create_resource_account(account, b"treasury");

        // Register treasury account for APT
        coin::register<AptosCoin>(&treasury_signer);

        // Store the signer capability
        move_to(account, GameTreasury {
            signer_cap,
        });
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

    /// View function to check treasury balance
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