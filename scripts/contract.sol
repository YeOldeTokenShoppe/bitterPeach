// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
}

/**
 * @title UltimateToken
 * @notice Clean and optimized token with strong anti-bot protection
 * @dev 80B supply, decreasing tax based on buys/time, anti-bot features, CEX support
 */
contract UltimateToken is ERC20, Ownable {
    // Constants
    uint256 public constant TOTAL_SUPPLY = 80_000_000_000 * 10**18; // 80 billion
    uint256 public constant BASIS_POINTS = 10000;
    
    // Uniswap
    IUniswapV2Router02 public immutable uniswapV2Router;
    address public immutable uniswapV2Pair;
    
    // Wallets
    address public treasuryWallet;
    address public marketingWallet;
    
    // Tax System - Buy count OR time based
    uint256 public buyTax = 1000; // 10% initial
    uint256 public sellTax = 1000; // 10% initial
    uint256 public buyCount; // Track number of buys
    uint256 public launchTimestamp; // Track launch time for tax reduction
    
    // Tax milestones
    uint256 public constant TAX_MILESTONE_1_BUYS = 250;
    uint256 public constant TAX_MILESTONE_1_TIME = 12 hours;
    uint256 public constant TAX_MILESTONE_1_RATE = 800; // 8%
    
    uint256 public constant TAX_MILESTONE_2_BUYS = 750;
    uint256 public constant TAX_MILESTONE_2_TIME = 3 days;
    uint256 public constant TAX_MILESTONE_2_RATE = 500; // 5%
    
    uint256 public constant TAX_MILESTONE_3_BUYS = 1500;
    uint256 public constant TAX_MILESTONE_3_TIME = 7 days;
    uint256 public constant TAX_MILESTONE_3_RATE = 0; // 0%
    
    // Anti-Bot Features
    mapping(address => bool) public isBlacklisted;
    mapping(address => uint256) public lastTransactionBlock;
    mapping(address => uint256) public firstPurchaseBlock; // For holder tracking
    uint256 public maxTransactionAmount;
    uint256 public maxWalletAmount;
    uint256 public cooldownBlocks = 1;
    uint256 public launchBlock;
    bool public tradingEnabled;
    uint256 public deadBlocks = 2;
    
    // Auto-liquidity
    bool private inSwapAndLiquify;
    uint256 public swapTokensAtAmount = 100_000_000 * 10**18; // 100M tokens
    
    // CEX Support
    mapping(address => bool) public isCEXWallet;
    mapping(address => string) public cexIdentifier;
    mapping(address => bool) public isExcludedFromFees;
    mapping(address => bool) public isExcludedFromLimits;
    
    // Events
    event TradingEnabled(uint256 blockNumber, uint256 timestamp);
    event TaxUpdated(uint256 buyTax, uint256 sellTax);
    event BlacklistUpdated(address indexed account, bool isBlacklisted);
    event BuyCountIncremented(uint256 newCount);
    event TaxMilestoneReached(uint256 milestone, uint256 newBuyTax, uint256 newSellTax);
    event CEXWalletAdded(address indexed wallet, string identifier);
    event LongTermHolder(address indexed holder, uint256 duration);
    event SwapAndLiquify(uint256 tokensSwapped, uint256 ethReceived);
    
    modifier lockTheSwap {
        inSwapAndLiquify = true;
        _;
        inSwapAndLiquify = false;
    }
    
    constructor(
        address _treasuryWallet,
        address _marketingWallet,
        address _routerAddress
    ) ERC20("UltimateToken", "ULTIMATE") Ownable(msg.sender) {
        // Set wallets
        treasuryWallet = _treasuryWallet;
        marketingWallet = _marketingWallet;
        
        // Setup Uniswap
        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(_routerAddress);
        uniswapV2Pair = IUniswapV2Factory(_uniswapV2Router.factory())
            .createPair(address(this), _uniswapV2Router.WETH());
        uniswapV2Router = _uniswapV2Router;
        
        // Mint supply distribution
        uint256 liquiditySupply = TOTAL_SUPPLY * 60 / 100; // 60% for liquidity
        uint256 treasurySupply = TOTAL_SUPPLY * 25 / 100; // 25% for treasury/OTC
        uint256 marketingSupply = TOTAL_SUPPLY * 15 / 100; // 15% for marketing
        
        _mint(msg.sender, liquiditySupply);
        _mint(treasuryWallet, treasurySupply);
        _mint(marketingWallet, marketingSupply);
        
        // Set initial limits (based on total supply)
        maxTransactionAmount = TOTAL_SUPPLY * 1 / 100; // 1% of total supply
        maxWalletAmount = TOTAL_SUPPLY * 2 / 100; // 2% of total supply
        
        // Exclude from fees and limits
        isExcludedFromFees[address(this)] = true;
        isExcludedFromFees[msg.sender] = true;
        isExcludedFromFees[treasuryWallet] = true;
        isExcludedFromFees[marketingWallet] = true;
        
        isExcludedFromLimits[address(this)] = true;
        isExcludedFromLimits[msg.sender] = true;
        isExcludedFromLimits[treasuryWallet] = true;
        isExcludedFromLimits[marketingWallet] = true;
        isExcludedFromLimits[address(uniswapV2Router)] = true;
        isExcludedFromLimits[uniswapV2Pair] = true;
    }
    
    // ===== TRADING CONTROL =====
    
    function enableTrading() external onlyOwner {
        require(!tradingEnabled, "Already enabled");
        tradingEnabled = true;
        launchBlock = block.number;
        launchTimestamp = block.timestamp;
        emit TradingEnabled(block.number, block.timestamp);
    }
    
    // ===== TRANSFER LOGIC WITH ANTI-BOT =====
    
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override {
        require(!isBlacklisted[from] && !isBlacklisted[to], "Blacklisted");
        
        // Allow owner to add liquidity before trading enabled
        if (!tradingEnabled) {
            require(
                from == owner() || to == owner(),
                "Trading not enabled"
            );
        }
        
        // MEV Protection
        if (from != owner() && to != owner() && to != address(0) && to != address(0xdead)) {
            require(tx.origin == msg.sender, "No contracts allowed");
        }
        
        // Dead blocks protection - auto blacklist snipers
        if (launchBlock > 0 && block.number <= launchBlock + deadBlocks) {
            if (from == uniswapV2Pair && to != address(uniswapV2Router)) {
                isBlacklisted[to] = true;
                emit BlacklistUpdated(to, true);
            }
        }
        
        // Anti-bot checks
        if (from == uniswapV2Pair || to == uniswapV2Pair) {
            // Skip all checks for CEX wallets
            if (!isCEXWallet[from] && !isCEXWallet[to]) {
                // Transaction limits
                if (!isExcludedFromLimits[from] && !isExcludedFromLimits[to]) {
                    require(amount <= maxTransactionAmount, "Exceeds max transaction");
                }
                
                // Wallet limit (not for sells)
                if (to != uniswapV2Pair && !isExcludedFromLimits[to]) {
                    require(balanceOf(to) + amount <= maxWalletAmount, "Exceeds max wallet");
                }
                
                // Cooldown between transactions
                if (cooldownBlocks > 0 && from != uniswapV2Pair) {
                    require(
                        block.number >= lastTransactionBlock[from] + cooldownBlocks,
                        "Cooldown active"
                    );
                }
                
                // Update last transaction block
                if (from != uniswapV2Pair) {
                    lastTransactionBlock[from] = block.number;
                }
            }
        }
        
        // Track first purchase for holder rewards
        if (to != address(0) && to != address(0xdead) && balanceOf(to) == 0) {
            firstPurchaseBlock[to] = block.number;
        }
        if (from != address(0) && balanceOf(from) == amount) {
            firstPurchaseBlock[from] = 0; // Reset when balance goes to 0
        }
        
        // Increment buy count for buys from Uniswap pair
        if (from == uniswapV2Pair && to != address(uniswapV2Router) && !isExcludedFromFees[to]) {
            buyCount++;
            emit BuyCountIncremented(buyCount);
        }
        
        // Auto-update taxes based on buy count OR time
        _updateTaxes();
        
        // Check for auto-liquidity
        uint256 contractBalance = balanceOf(address(this));
        if (
            contractBalance >= swapTokensAtAmount &&
            !inSwapAndLiquify &&
            from != uniswapV2Pair &&
            tradingEnabled &&
            buyTax + sellTax > 0
        ) {
            swapAndLiquify(contractBalance);
        }
        
        // Calculate tax
        uint256 taxAmount = 0;
        if ((buyTax > 0 || sellTax > 0) && !isExcludedFromFees[from] && !isExcludedFromFees[to]) {
            if (from == uniswapV2Pair) {
                taxAmount = (amount * buyTax) / BASIS_POINTS;
            } else if (to == uniswapV2Pair) {
                taxAmount = (amount * sellTax) / BASIS_POINTS;
            }
        }
        
        if (taxAmount > 0) {
            super._update(from, address(this), taxAmount);
            amount -= taxAmount;
        }
        
        super._update(from, to, amount);
    }
    
    // ===== TAX MANAGEMENT =====
    
    function _updateTaxes() private {
        if (buyTax == 0 && sellTax == 0) return;
        if (launchTimestamp == 0) return; // Not launched yet
        
        uint256 timeElapsed = block.timestamp - launchTimestamp;
        
        // Check milestones - reduce tax when EITHER condition is met
        if (buyCount >= TAX_MILESTONE_3_BUYS || timeElapsed >= TAX_MILESTONE_3_TIME) {
            // Reduce to 0%
            if (buyTax != TAX_MILESTONE_3_RATE) {
                buyTax = TAX_MILESTONE_3_RATE;
                sellTax = TAX_MILESTONE_3_RATE;
                emit TaxMilestoneReached(3, buyTax, sellTax);
            }
        } else if (buyCount >= TAX_MILESTONE_2_BUYS || timeElapsed >= TAX_MILESTONE_2_TIME) {
            // Reduce to 5%
            if (buyTax != TAX_MILESTONE_2_RATE) {
                buyTax = TAX_MILESTONE_2_RATE;
                sellTax = TAX_MILESTONE_2_RATE;
                emit TaxMilestoneReached(2, buyTax, sellTax);
            }
        } else if (buyCount >= TAX_MILESTONE_1_BUYS || timeElapsed >= TAX_MILESTONE_1_TIME) {
            // Reduce to 8%
            if (buyTax != TAX_MILESTONE_1_RATE) {
                buyTax = TAX_MILESTONE_1_RATE;
                sellTax = TAX_MILESTONE_1_RATE;
                emit TaxMilestoneReached(1, buyTax, sellTax);
            }
        }
    }
    
    function swapAndLiquify(uint256 contractTokenBalance) private lockTheSwap {
        // Swap tokens for ETH
        swapTokensForEth(contractTokenBalance);
        
        // Send to treasury (can be split between treasury/marketing off-chain)
        uint256 contractETHBalance = address(this).balance;
        if (contractETHBalance > 0) {
            payable(treasuryWallet).transfer(contractETHBalance);
        }
        
        emit SwapAndLiquify(contractTokenBalance, contractETHBalance);
    }
    
    function swapTokensForEth(uint256 tokenAmount) private {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapV2Router.WETH();
        
        _approve(address(this), address(uniswapV2Router), tokenAmount);
        
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0,
            path,
            address(this),
            block.timestamp
        );
    }
    
    // ===== CEX SUPPORT FUNCTIONS =====
    
    function addCEXWallet(address wallet, string memory identifier) external onlyOwner {
        require(wallet != address(0), "Invalid wallet");
        require(!isCEXWallet[wallet], "Already added");
        
        isCEXWallet[wallet] = true;
        cexIdentifier[wallet] = identifier;
        isExcludedFromFees[wallet] = true;
        isExcludedFromLimits[wallet] = true;
        
        emit CEXWalletAdded(wallet, identifier);
    }
    
    function removeCEXWallet(address wallet) external onlyOwner {
        require(isCEXWallet[wallet], "Not a CEX wallet");
        
        isCEXWallet[wallet] = false;
        isExcludedFromFees[wallet] = false;
        isExcludedFromLimits[wallet] = false;
        delete cexIdentifier[wallet];
    }
    
    // ===== ADMIN FUNCTIONS =====
    
    function setBlacklist(address account, bool blacklisted) external onlyOwner {
        isBlacklisted[account] = blacklisted;
        emit BlacklistUpdated(account, blacklisted);
    }
    
    function setLimits(uint256 maxTx, uint256 maxWallet) external onlyOwner {
        require(maxTx >= TOTAL_SUPPLY / 1000, "Max TX too low"); // 0.1% minimum
        require(maxWallet >= TOTAL_SUPPLY / 100, "Max wallet too low"); // 1% minimum
        maxTransactionAmount = maxTx;
        maxWalletAmount = maxWallet;
    }
    
    function setCooldownBlocks(uint256 blocks) external onlyOwner {
        require(blocks <= 5, "Cooldown too high");
        cooldownBlocks = blocks;
    }
    
    function setExcludedFromFees(address account, bool excluded) external onlyOwner {
        isExcludedFromFees[account] = excluded;
    }
    
    function setExcludedFromLimits(address account, bool excluded) external onlyOwner {
        isExcludedFromLimits[account] = excluded;
    }
    
    function setSwapTokensAtAmount(uint256 amount) external onlyOwner {
        require(amount >= TOTAL_SUPPLY / 100000, "Amount too low"); // 0.001% minimum
        require(amount <= TOTAL_SUPPLY / 100, "Amount too high"); // 1% maximum
        swapTokensAtAmount = amount;
    }
    
    function setWallets(address _treasuryWallet, address _marketingWallet) external onlyOwner {
        require(_treasuryWallet != address(0), "Invalid treasury");
        require(_marketingWallet != address(0), "Invalid marketing");
        treasuryWallet = _treasuryWallet;
        marketingWallet = _marketingWallet;
    }
    
    // ===== HOLDER VERIFICATION =====
    
    function checkLongTermStatus() external {
        require(balanceOf(msg.sender) > 0, "No balance");
        require(firstPurchaseBlock[msg.sender] > 0, "No purchase history");
        
        uint256 holdingDuration = block.number - firstPurchaseBlock[msg.sender];
        emit LongTermHolder(msg.sender, holdingDuration);
    }
    
    // ===== VIEW FUNCTIONS =====
    
    function getHolderInfo(address holder) external view returns (
        uint256 balance,
        uint256 firstPurchase,
        bool isExcludedFees,
        bool isExcludedLimits,
        bool isCEX,
        bool blacklisted
    ) {
        return (
            balanceOf(holder),
            firstPurchaseBlock[holder],
            isExcludedFromFees[holder],
            isExcludedFromLimits[holder],
            isCEXWallet[holder],
            isBlacklisted[holder]
        );
    }
    
    function getTaxInfo() external view returns (
        uint256 currentBuyTax,
        uint256 currentSellTax,
        uint256 currentBuyCount,
        uint256 timeElapsed,
        uint256 nextMilestoneBuys,
        uint256 nextMilestoneTime,
        uint256 nextMilestoneTax
    ) {
        uint256 elapsed = launchTimestamp > 0 ? block.timestamp - launchTimestamp : 0;
        
        // Determine next milestone
        uint256 nextBuys;
        uint256 nextTime;
        uint256 nextTax;
        
        if (buyTax > TAX_MILESTONE_1_RATE) {
            nextBuys = TAX_MILESTONE_1_BUYS;
            nextTime = TAX_MILESTONE_1_TIME;
            nextTax = TAX_MILESTONE_1_RATE;
        } else if (buyTax > TAX_MILESTONE_2_RATE) {
            nextBuys = TAX_MILESTONE_2_BUYS;
            nextTime = TAX_MILESTONE_2_TIME;
            nextTax = TAX_MILESTONE_2_RATE;
        } else if (buyTax > TAX_MILESTONE_3_RATE) {
            nextBuys = TAX_MILESTONE_3_BUYS;
            nextTime = TAX_MILESTONE_3_TIME;
            nextTax = TAX_MILESTONE_3_RATE;
        }
        
        return (
            buyTax,
            sellTax,
            buyCount,
            elapsed,
            nextBuys,
            nextTime,
            nextTax
        );
    }
    
    // ===== EMERGENCY FUNCTIONS =====
    
    function rescueETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        payable(treasuryWallet).transfer(balance);
    }
    
    function rescueToken(address tokenAddress) external onlyOwner {
        require(tokenAddress != address(this), "Cannot rescue own tokens");
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens");
        token.transfer(treasuryWallet, balance);
    }
}