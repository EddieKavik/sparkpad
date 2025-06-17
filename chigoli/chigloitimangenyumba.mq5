#include <Indicators\Indicators.mqh>
input double          TakeProfitUSD     = 15.0;    // Target net profit in USD to close the entire grid
//+------------------------------------------------------------------+
//| Improved: Predict if another spike is likely in next 2 candles   |
//+------------------------------------------------------------------+
bool IsAnotherSpikeLikelySoon()
{
    // 1. Candle body and wick analysis
    double avgBody = 0, avgWick = 0;
    for(int i=2; i<=21; i++) {
        double body = MathAbs(iClose(_Symbol, 0, i) - iOpen(_Symbol, 0, i));
        double wick = MathAbs(iHigh(_Symbol, 0, i) - iLow(_Symbol, 0, i)) - body;
        avgBody += body;
        avgWick += wick;
    }
    avgBody /= 20.0;
    avgWick /= 20.0;

    // 2. Last 2 candles: large body or wick, engulfing, pin bar
    bool largeBody = false, largeWick = false, engulfing = false, pinbar = false;
    for(int i=1; i<=2; i++) {
        double body = MathAbs(iClose(_Symbol, 0, i) - iOpen(_Symbol, 0, i));
        double wick = MathAbs(iHigh(_Symbol, 0, i) - iLow(_Symbol, 0, i)) - body;
        if(body > 2.5 * avgBody) largeBody = true;
        if(wick > 2.5 * avgWick) largeWick = true;
        // Engulfing
        if(i > 1) {
            double prevBody = MathAbs(iClose(_Symbol, 0, i+1) - iOpen(_Symbol, 0, i+1));
            if(body > prevBody && 
                ((iClose(_Symbol, 0, i) > iOpen(_Symbol, 0, i) && iClose(_Symbol, 0, i+1) < iOpen(_Symbol, 0, i+1)) ||
                 (iClose(_Symbol, 0, i) < iOpen(_Symbol, 0, i) && iClose(_Symbol, 0, i+1) > iOpen(_Symbol, 0, i+1))))
                engulfing = true;
        }
        // Pin bar
        double upperWick = iHigh(_Symbol, 0, i) - MathMax(iClose(_Symbol, 0, i), iOpen(_Symbol, 0, i));
        double lowerWick = MathMin(iClose(_Symbol, 0, i), iOpen(_Symbol, 0, i)) - iLow(_Symbol, 0, i);
        if((upperWick > 2 * body && lowerWick < 0.5 * body) || (lowerWick > 2 * body && upperWick < 0.5 * body))
            pinbar = true;
    }

    // 3. RSI, Stochastic, Bollinger Bands
    int rsiHandle = iRSI(_Symbol, 0, 14, PRICE_CLOSE);
    double rsiBuffer[2];
    bool rsiExtreme = false;
    if(CopyBuffer(rsiHandle, 0, 0, 2, rsiBuffer) == 2) {
        if(IsCrashSymbol()) rsiExtreme = (rsiBuffer[0] > 80 || rsiBuffer[1] > 80);
        if(IsBoomSymbol())  rsiExtreme = (rsiBuffer[0] < 20 || rsiBuffer[1] < 20);
    }
    int stoHandle = iStochastic(_Symbol, 0, 5, 3, 3, MODE_SMA, 0, MODE_MAIN);
    double stoBuffer[2];
    bool stoExtreme = false;
    if(CopyBuffer(stoHandle, 0, 0, 2, stoBuffer) == 2) {
        if(IsCrashSymbol()) stoExtreme = (stoBuffer[0] > 90 || stoBuffer[1] > 90);
        if(IsBoomSymbol())  stoExtreme = (stoBuffer[0] < 10 || stoBuffer[1] < 10);
    }
    int bbHandle = iBands(_Symbol, 0, 20, 2, 0, PRICE_CLOSE);
    double upperBB[2], lowerBB[2];
    bool bbBreak = false;
    if(CopyBuffer(bbHandle, 1, 0, 2, upperBB) == 2 && CopyBuffer(bbHandle, 2, 0, 2, lowerBB) == 2) {
        double price = iClose(_Symbol, 0, 0);
        if(price > upperBB[0] || price < lowerBB[0]) bbBreak = true;
    }

    // 4. ATR surge (short vs long)
    int atrShort = iATR(_Symbol, 0, 14);
    int atrLong = iATR(_Symbol, 0, 50);
    double atrShortBuf[2], atrLongBuf[2];
    bool atrSurge = false;
    if(CopyBuffer(atrShort, 0, 0, 2, atrShortBuf) == 2 && CopyBuffer(atrLong, 0, 0, 2, atrLongBuf) == 2) {
        if(atrShortBuf[0] > 2.0 * atrLongBuf[0]) atrSurge = true;
    }

    // 5. Volume surge (if available)
    bool volumeSurge = false;
    long vol0 = iVolume(_Symbol, 0, 0);
    long vol1 = iVolume(_Symbol, 0, 1);
    long avgVol = 0;
    for(int i=2; i<=21; i++) avgVol += iVolume(_Symbol, 0, i);
    avgVol /= 20;
    if(vol0 > 2 * avgVol || vol1 > 2 * avgVol) volumeSurge = true;

    // 6. Recent spike memory (if a spike in last 10 candles)
    bool recentSpike = false;
    for(int i=1; i<=10; i++) {
        double body = MathAbs(iClose(_Symbol, 0, i) - iOpen(_Symbol, 0, i));
        if(body > 3.0 * avgBody) recentSpike = true;
    }

    // Combine all
    return largeBody || largeWick || engulfing || pinbar || rsiExtreme || stoExtreme || bbBreak || atrSurge || volumeSurge || recentSpike;
}
void OnTick()
{
  Print("[DEBUG] OnTick called");
  if(postSpikeTPBars > 0) postSpikeTPBars--;
  if(IsSymbolExcluded())
  {
    Print("[DEBUG] Symbol ", _Symbol, " is excluded from trading.");
    return;
  }
  if(!IsWithinSession())
  {
    Print("[DEBUG] Outside trading session, skipping tick.");
    return;
  }
  if(!IsCrashSymbol() && !IsBoomSymbol())
  {
    Print("[DEBUG] Symbol is not Crash or Boom, skipping.");
    return;
  }
  // Pause after loss logic
  if(lossPauseBars > 0)
  {
    lossPauseBars--;
    Print("[DEBUG] In loss pause (", lossPauseBars, " bars left), blocking new cycle entry.");
    return;
  }
  double totalProfit, totalLots;
  int totalTrades, buyTrades, sellTrades;
  if(!GetGridStatus(totalTrades, buyTrades, sellTrades, totalProfit, totalLots)) {
    Print("[DEBUG] GetGridStatus failed");
    return;
  }
  Print("[DEBUG] Trades: ", totalTrades, " Buy: ", buyTrades, " Sell: ", sellTrades, " Profit: ", totalProfit);
  UpdateChartComment(totalTrades, totalProfit);

  int openTrades = 0;
  if(IsCrashSymbol())
  {
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
      if(PositionGetInteger(POSITION_MAGIC) == MagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY)
      {
        openTrades++;
      }
    }
  }
  else if(IsBoomSymbol())
  {
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
      if(PositionGetInteger(POSITION_MAGIC) == MagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL)
      {
        openTrades++;
      }
    }
  }

  // Spike detection: If a spike is likely, close all trades and block new entries, and start/reset cooldown
  if(IsSpikeLikely())
  {
    if(IsAnotherSpikeLikelySoon())
    {
      spikeCooldownBars = SPIKE_COOLDOWN_PERIOD;
      postSpikeTPBars = TP_AfterSpikeBars;
      if(openTrades > 0)
      {
        Print("[DEBUG] Spike detected and another likely soon! Closing all open trades to avoid spike risk.");
        CloseAllGlobalTrades();
        return;
      }
      else
      {
        Print("[DEBUG] Spike likely and another soon, blocking new cycle entry. Cooldown started/reset.");
        return;
      }
    }
    else
    {
      Print("[DEBUG] Spike detected but not likely to continue, allowing trades to continue.");
      // Do not close trades, but start cooldown
      spikeCooldownBars = SPIKE_COOLDOWN_PERIOD;
      postSpikeTPBars = TP_AfterSpikeBars;
      return;
    }
  }

  // If in cooldown, decrement and block new entries
  if(spikeCooldownBars > 0)
  {
    spikeCooldownBars--;
    Print("[DEBUG] In spike cooldown (", spikeCooldownBars, " bars left), blocking new cycle entry.");
    return;
  }

  // Global net floating profit take profit or loss: close all trades for all symbols if net floating profit >= TakeProfitUSD or <= MaxLossUSD
  double globalNetFloatingProfit = GetGlobalNetFloatingProfit();
  Print("[DEBUG] Global net floating profit: ", globalNetFloatingProfit);
  if(globalNetFloatingProfit >= TakeProfitUSD)
  {
    Print("[DEBUG] Global net floating profit target hit (", globalNetFloatingProfit, "), closing all trades on all symbols");
    CloseAllGlobalTrades();
    return;
  }
  if(globalNetFloatingProfit <= MaxLossUSD)
  {
    Print("[DEBUG] Global net floating loss stop hit (", globalNetFloatingProfit, "), closing all trades on all symbols");
    CloseAllGlobalTrades();
    return;
  }

  // Drawdown stop: close all trades if drawdown >= MaxDrawdownPercent
  double equity = AccountInfoDouble(ACCOUNT_EQUITY);
  double balance = AccountInfoDouble(ACCOUNT_BALANCE);
  double drawdown = balance - equity;
  if(drawdown > 0)
  {
    double drawdownPercent = (drawdown / balance) * 100.0;
    if(drawdownPercent >= MaxDrawdownPercent)
    {
      Print("[DEBUG] Drawdown stop hit (", drawdownPercent, "%), closing all trades");
      CloseAllTrades();
      return;
    }
  }

  // After global SL or drawdown stop, set pause
  if(lastCycleBalance > 0 && balance < lastCycleBalance)
  {
    lossPauseBars = PauseAfterLossBars;
    Print("[DEBUG] Loss detected in last cycle, pausing new entries for ", PauseAfterLossBars, " bars.");
    lastCycleBalance = balance;
  }

  // Only start new trade if trend is ok (Crash: up, Boom: down)
  if(openTrades == 0)
  {
    // Pre-trade check: can all running pairs reach TP without spike risk?
    if(IsAnotherSpikeLikelySoon())
    {
      Print("[DEBUG] Pre-trade check: spike likely soon, blocking new entry for this pair.");
      return;
    }
    if(!IsTrendOk())
    {
      Print("[DEBUG] Trend filter: not in correct trend, skipping new entry.");
      return;
    }
    if(IsCrashSymbol())
    {
      Print("[DEBUG] No buy trades found, opening initial buy");
      double entry = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double tp = CalculateTP(true, entry);
      double initialLot = CalculateAdaptiveLotSize(0);
      bool buyResult = trade.Buy(initialLot, _Symbol, entry, 0, tp, "Initial Buy");
      Print("[DEBUG] Initial Buy result: ", buyResult, " Lot: ", initialLot, " TP: ", tp);
      lastCycleBalance = AccountInfoDouble(ACCOUNT_BALANCE);
      return;
    }
    else if(IsBoomSymbol())
    {
      Print("[DEBUG] No sell trades found, opening initial sell");
      double entry = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double tp = CalculateTP(false, entry);
      double initialLot = CalculateAdaptiveLotSize(0);
      bool sellResult = trade.Sell(initialLot, _Symbol, entry, 0, tp, "Initial Sell");
      Print("[DEBUG] Initial Sell result: ", sellResult, " Lot: ", initialLot, " TP: ", tp);
      lastCycleBalance = AccountInfoDouble(ACCOUNT_BALANCE);
      return;
    }
  }

  // Manage grid (add more trades as price moves)
  Print("[DEBUG] Managing grid");
  ManageGrid(openTrades);
} 