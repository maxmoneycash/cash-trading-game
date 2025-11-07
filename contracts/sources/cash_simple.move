module cash_trading_game::cash_simple {
    use std::signer;
    use std::vector;
    use aptos_framework::account::{Self, SignerCapability};
    use aptos_framework::fungible_asset::{Self as fa, Metadata};
    use aptos_framework::object;
    use aptos_framework::primary_fungible_store;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_std::table::{Self, Table};

    /// Error codes
    const E_UNAUTHORIZED: u64 = 1;
    const E_INSUFFICIENT_BALANCE: u64 = 2;
    const E_EXCEEDS_LIMIT: u64 = 3;
    const E_INVALID_AMOUNT: u64 = 4;
    const E_TREASURY_INSUFFICIENT: u64 = 6;

    /// Safety limits
    const MAX_SETTLEMENT_PER_TXN: u64 = 1_000_000_000; // 1,000 CASH (6 decimals)
    const MIN_DEPOSIT: u64 = 100_000; // 0.1 CASH (6 decimals)
    const CASH_METADATA_ADDRESS: address =
        @0xc692943f7b340f02191c5de8dac2f827e0b66b3ed2206206a3526bcb0cae6e40;

    /// Resource account holds house funds (NO private key exists)
    struct HouseTreasury has key {
        signer_capability: SignerCapability,
        total_deposited: u64,
        total_paid_out: u64,
        total_settlements: u64,
        paused: bool
    }

    /// Authorized backend addresses that can settle trades
    struct AuthorizedBackends has key {
        addresses: vector<address>
    }

    /// User ledger tracking balances
    struct UserLedger has key {
        balances: Table<address, u64>
    }

    #[event]
    struct UserDepositEvent has drop, store {
        user: address,
        amount: u64,
        new_balance: u64,
        timestamp: u64
    }

    #[event]
    struct UserWithdrawEvent has drop, store {
        user: address,
        amount: u64,
        remaining_balance: u64,
        timestamp: u64
    }

    #[event]
    struct TradeSettledEvent has drop, store {
        player: address,
        delta: u64,
        is_profit: bool,
        new_balance: u64,
        backend: address,
        timestamp: u64
    }

    /// Initialize module with resource account
    fun init_module(deployer: &signer) {
        // Create resource account for treasury (no private key!)
        let (treasury_signer, signer_cap) =
            account::create_resource_account(deployer, b"cash_game_treasury_v1");

        // Store treasury capability
        move_to(
            deployer,
            HouseTreasury {
                signer_capability: signer_cap,
                total_deposited: 0,
                total_paid_out: 0,
                total_settlements: 0,
                paused: false
            }
        );

        // Initialize authorized backends (empty initially)
        move_to(deployer, AuthorizedBackends { addresses: vector::empty() });

        // Initialize user ledger
        move_to(deployer, UserLedger { balances: table::new() });
    }

    /// Owner adds authorized backend
    public entry fun add_authorized_backend(
        owner: &signer, backend_address: address
    ) acquires AuthorizedBackends {
        assert!(signer::address_of(owner) == @cash_trading_game, E_UNAUTHORIZED);

        let backends = borrow_global_mut<AuthorizedBackends>(@cash_trading_game);

        // Add to addresses if not already present
        if (!vector::contains(&backends.addresses, &backend_address)) {
            vector::push_back(&mut backends.addresses, backend_address);
        };
    }

    /// Owner revokes backend authorization
    public entry fun revoke_backend_authorization(
        owner: &signer, backend_address: address
    ) acquires AuthorizedBackends {
        assert!(signer::address_of(owner) == @cash_trading_game, E_UNAUTHORIZED);

        let backends = borrow_global_mut<AuthorizedBackends>(@cash_trading_game);

        // Remove from addresses
        let (found, index) = vector::index_of(&backends.addresses, &backend_address);
        if (found) {
            vector::remove(&mut backends.addresses, index);
        };
    }

    /// Check if backend is authorized
    fun is_authorized(backend_addr: address): bool acquires AuthorizedBackends {
        let backends = borrow_global<AuthorizedBackends>(@cash_trading_game);
        vector::contains(&backends.addresses, &backend_addr)
    }

    /// User deposits CASH into their game balance
    public entry fun deposit_user(user: &signer, amount: u64) acquires UserLedger, HouseTreasury {
        assert!(amount >= MIN_DEPOSIT, E_INVALID_AMOUNT);

        let user_addr = signer::address_of(user);

        // Get treasury resource account address
        let treasury = borrow_global<HouseTreasury>(@cash_trading_game);
        let treasury_addr =
            account::get_signer_capability_address(&treasury.signer_capability);

        // Get metadata object
        let metadata = object::address_to_object<Metadata>(CASH_METADATA_ADDRESS);

        // Ensure primary stores exist
        let user_store =
            primary_fungible_store::ensure_primary_store_exists(user_addr, metadata);
        let treasury_store =
            primary_fungible_store::ensure_primary_store_exists(treasury_addr, metadata);

        // Transfer CASH from user to treasury
        fa::transfer(user, user_store, treasury_store, amount);

        // Update user ledger
        let ledger = borrow_global_mut<UserLedger>(@cash_trading_game);
        let current =
            if (table::contains(&ledger.balances, user_addr)) {
                *table::borrow(&ledger.balances, user_addr)
            } else { 0 };
        let new_balance = current + amount;
        table::upsert(&mut ledger.balances, user_addr, new_balance);

        event::emit(
            UserDepositEvent {
                user: user_addr,
                amount,
                new_balance,
                timestamp: timestamp::now_microseconds()
            }
        );
    }

    /// Backend settles a trade (updates user balance)
    public entry fun record_trade(
        backend: &signer,
        player: address,
        amount: u64,
        is_profit: bool
    ) acquires AuthorizedBackends, UserLedger, HouseTreasury {
        let backend_addr = signer::address_of(backend);

        // Verify backend is authorized
        assert!(is_authorized(backend_addr), E_UNAUTHORIZED);

        // Safety check: limit settlement size
        assert!(amount <= MAX_SETTLEMENT_PER_TXN, E_EXCEEDS_LIMIT);

        // Check treasury isn't paused
        let treasury = borrow_global_mut<HouseTreasury>(@cash_trading_game);
        assert!(!treasury.paused, E_UNAUTHORIZED);

        // Update player ledger
        let ledger = borrow_global_mut<UserLedger>(@cash_trading_game);
        let current =
            if (table::contains(&ledger.balances, player)) {
                *table::borrow(&ledger.balances, player)
            } else { 0 };

        let new_balance =
            if (is_profit) {
                // Player profit
                current + amount
            } else {
                // Player loss
                if (current >= amount) {
                    current - amount
                } else {
                    // Can't lose more than current balance
                    0
                }
            };

        table::upsert(&mut ledger.balances, player, new_balance);
        treasury.total_settlements = treasury.total_settlements + 1;

        event::emit(
            TradeSettledEvent {
                player,
                delta: amount,
                is_profit,
                new_balance,
                backend: backend_addr,
                timestamp: timestamp::now_microseconds()
            }
        );
    }

    /// User withdraws CASH from their game balance
    public entry fun withdraw_user(user: &signer, amount: u64) acquires UserLedger, HouseTreasury {
        let user_addr = signer::address_of(user);

        // Check user has sufficient balance
        let ledger = borrow_global_mut<UserLedger>(@cash_trading_game);
        assert!(table::contains(&ledger.balances, user_addr), E_INSUFFICIENT_BALANCE);

        let current = *table::borrow(&ledger.balances, user_addr);
        assert!(current >= amount, E_INSUFFICIENT_BALANCE);

        // Debit user ledger
        let new_balance = current - amount;
        table::upsert(&mut ledger.balances, user_addr, new_balance);

        // Transfer from treasury resource account to user
        let treasury = borrow_global_mut<HouseTreasury>(@cash_trading_game);
        let treasury_addr =
            account::get_signer_capability_address(&treasury.signer_capability);
        let treasury_signer =
            account::create_signer_with_capability(&treasury.signer_capability);

        // Get metadata
        let metadata = object::address_to_object<Metadata>(CASH_METADATA_ADDRESS);
        let user_store =
            primary_fungible_store::ensure_primary_store_exists(user_addr, metadata);
        let treasury_store =
            primary_fungible_store::ensure_primary_store_exists(treasury_addr, metadata);

        // Verify treasury has sufficient balance
        let treasury_balance = fa::balance(treasury_store);
        assert!(treasury_balance >= amount, E_TREASURY_INSUFFICIENT);

        fa::transfer(
            &treasury_signer,
            treasury_store,
            user_store,
            amount
        );
        treasury.total_paid_out = treasury.total_paid_out + amount;

        event::emit(
            UserWithdrawEvent {
                user: user_addr,
                amount,
                remaining_balance: new_balance,
                timestamp: timestamp::now_microseconds()
            }
        );
    }

    /// Owner funds house treasury
    public entry fun deposit_house(owner: &signer, amount: u64) acquires HouseTreasury {
        assert!(signer::address_of(owner) == @cash_trading_game, E_UNAUTHORIZED);

        let treasury = borrow_global_mut<HouseTreasury>(@cash_trading_game);
        let treasury_addr =
            account::get_signer_capability_address(&treasury.signer_capability);

        let owner_addr = signer::address_of(owner);

        // Get metadata
        let metadata = object::address_to_object<Metadata>(CASH_METADATA_ADDRESS);
        let owner_store =
            primary_fungible_store::ensure_primary_store_exists(owner_addr, metadata);
        let treasury_store =
            primary_fungible_store::ensure_primary_store_exists(treasury_addr, metadata);

        fa::transfer(owner, owner_store, treasury_store, amount);
        treasury.total_deposited = treasury.total_deposited + amount;
    }

    /// Owner pauses/unpauses settlements
    public entry fun set_paused(owner: &signer, paused: bool) acquires HouseTreasury {
        assert!(signer::address_of(owner) == @cash_trading_game, E_UNAUTHORIZED);

        let treasury = borrow_global_mut<HouseTreasury>(@cash_trading_game);
        treasury.paused = paused;
    }

    /// View functions
    #[view]
    public fun get_user_balance(player: address): u64 acquires UserLedger {
        let ledger = borrow_global<UserLedger>(@cash_trading_game);
        if (table::contains(&ledger.balances, player)) {
            *table::borrow(&ledger.balances, player)
        } else { 0 }
    }

    #[view]
    public fun get_treasury_balance(): u64 acquires HouseTreasury {
        let treasury = borrow_global<HouseTreasury>(@cash_trading_game);
        let treasury_addr =
            account::get_signer_capability_address(&treasury.signer_capability);
        let metadata = object::address_to_object<Metadata>(CASH_METADATA_ADDRESS);
        let treasury_store =
            primary_fungible_store::ensure_primary_store_exists(treasury_addr, metadata);
        fa::balance(treasury_store)
    }

    #[view]
    public fun get_treasury_stats(): (u64, u64, u64, bool) acquires HouseTreasury {
        let treasury = borrow_global<HouseTreasury>(@cash_trading_game);
        (
            treasury.total_deposited,
            treasury.total_paid_out,
            treasury.total_settlements,
            treasury.paused
        )
    }

    #[view]
    public fun is_backend_authorized(backend: address): bool acquires AuthorizedBackends {
        let backends = borrow_global<AuthorizedBackends>(@cash_trading_game);
        vector::contains(&backends.addresses, &backend)
    }

    #[view]
    public fun get_treasury_address(): address acquires HouseTreasury {
        let treasury = borrow_global<HouseTreasury>(@cash_trading_game);
        account::get_signer_capability_address(&treasury.signer_capability)
    }

    #[test_only]
    public fun init_for_test(account: &signer) {
        init_module(account);
    }
}
