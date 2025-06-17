//+------------------------------------------------------------------+
//| Expert tick function (multi-symbol version)                      |
//+------------------------------------------------------------------+
void OnTick()
{
  EvaluateSpikeFeedback();
  spikeTuneCounter++;
  if(spikeTuneCounter >= Spike_Tune_Interval) {
    AutoTuneSpikeThresholds();
    spikeTuneCounter = 0;
  }
  int symbols_total = SymbolsTotal(true); // Only Market Watch
  for(int i=0; i<symbols_total; i++)
  {
    string symbol = SymbolName(i, true);
    if(!SymbolSelect(symbol, true)) continue;
    ProcessSymbolTick(symbol);
  }
  UpdateDashboardAllSymbols();

  // Call in OnTick for current chart symbol
  OrderBlock ob = FindRecentOrderBlock(_Symbol, PERIOD_CURRENT, 30);
  PlotOrderBlock(_Symbol, PERIOD_CURRENT, ob);
  LiquidityZone lz = FindLiquidityZone(_Symbol, PERIOD_CURRENT, 30, 3, 0.002);
  PlotLiquidityZone(_Symbol, PERIOD_CURRENT, lz);
}

//+------------------------------------------------------------------+
//| Per-symbol state variables                                       |
//+------------------------------------------------------------------+
#include <stderror.mqh>
#include <Map.mqh>
CMapStringToInt spikeCooldownBarsMap;
CMapStringToInt postSpikeTPBarsMap;

//+------------------------------------------------------------------+
//| Inputs for advanced spike detection                              |
//+------------------------------------------------------------------+
input double Spike_BodyMultiplier = 3.0;      // Candle body multiplier for spike
input double Spike_ATRMultiplier = 3.0;       // ATR surge multiplier
input double Spike_BBMultiplier = 2.5;        // Bollinger Band breakout multiplier
input double Spike_VolumeMultiplier = 2.0;    // Volume surge multiplier
input int    Spike_MTF_M1 = 1;                // Enable M1 timeframe check
input int    Spike_MTF_M5 = 1;                // Enable M5 timeframe check
input int    Spike_MTF_M15 = 1;               // Enable M15 timeframe check

//+------------------------------------------------------------------+
//| Inputs for anomaly detection                                     |
//+------------------------------------------------------------------+
input double Spike_ZScore_Threshold = 2.5; // Z-score threshold for anomaly

//+------------------------------------------------------------------+
//| Inputs for spike feedback evaluation                             |
//+------------------------------------------------------------------+
input int Spike_Feedback_Bars = 5;         // Bars to check after detection
input double Spike_Feedback_ATR_Mult = 2;  // ATR multiple for true spike
input double Spike_Feedback_Pips = 50;     // Pips for true spike (alternative)

//+------------------------------------------------------------------+
//| Feedback System: Logging spike events                            |
//+------------------------------------------------------------------+
#include <Files\FileTxt.mqh>
string FEEDBACK_LOG_FILE = "spike_feedback_log.csv";

void LogSpikeEvent(string symbol, int tf, string reason, double value)
{
    int file_handle = FileOpen(FEEDBACK_LOG_FILE, FILE_READ|FILE_WRITE|FILE_TXT|FILE_ANSI);
    if(file_handle == INVALID_HANDLE)
        file_handle = FileOpen(FEEDBACK_LOG_FILE, FILE_WRITE|FILE_TXT|FILE_ANSI);
    if(file_handle != INVALID_HANDLE)
    {
        FileSeek(file_handle, 0, SEEK_END);
        string tfStr = (tf==PERIOD_M1 ? "M1" : tf==PERIOD_M5 ? "M5" : tf==PERIOD_M15 ? "M15" : IntegerToString(tf));
        string log = symbol+","+tfStr+","+TimeToString(TimeCurrent(),TIME_DATE|TIME_SECONDS)+","+reason+","+DoubleToString(value,2)+",pending\n";
        FileWriteString(file_handle, log);
        FileClose(file_handle);
    }
}

//+------------------------------------------------------------------+
//| Feedback System: Evaluate spike outcome                          |
//+------------------------------------------------------------------+
void EvaluateSpikeFeedback()
{
    int file_handle = FileOpen(FEEDBACK_LOG_FILE, FILE_READ|FILE_WRITE|FILE_TXT|FILE_ANSI);
    if(file_handle == INVALID_HANDLE) return;
    int file_size = FileSize(file_handle);
    string all = FileReadString(file_handle, file_size);
    FileClose(file_handle);
    string lines[];
    int n = StringSplit(all, '\n', lines);
    if(n < 2) return;
    string newAll = "";
    for(int i=0; i<n; i++)
    {
        string line = lines[i];
        if(StringLen(line) < 10) { newAll += line+"\n"; continue; }
        string fields[];
        int m = StringSplit(line, ',', fields);
        if(m < 6) { newAll += line+"\n"; continue; }
        string symbol = fields[0];
        string tfStr = fields[1];
        datetime dt = StringToTime(fields[2]);
        string reason = fields[3];
        double value = StringToDouble(fields[4]);
        string outcome = fields[5];
        if(outcome != "pending") { newAll += line+"\n"; continue; }
        int tf = (tfStr=="M1"?PERIOD_M1:tfStr=="M5"?PERIOD_M5:tfStr=="M15"?PERIOD_M15:PERIOD_CURRENT);
        if(tf == PERIOD_CURRENT) { newAll += line+"\n"; continue; }
        int barsAgo = iBarShift(symbol, tf, dt, true);
        if(barsAgo < 0) { newAll += line+"\n"; continue; }
        int checkBar = barsAgo - Spike_Feedback_Bars;
        if(checkBar < 0) { newAll += line+"\n"; continue; }
        double price0 = iClose(symbol, tf, barsAgo);
        double priceN = iClose(symbol, tf, checkBar);
        double atr = iATR(symbol, tf, 14);
        double atrVal[1];
        if(CopyBuffer(atr, 0, checkBar, 1, atrVal) != 1) atrVal[0] = 0;
        double move = MathAbs(priceN - price0);
        double movePips = move / SymbolInfoDouble(symbol, SYMBOL_POINT);
        bool isSpike = (atrVal[0] > 0 && move > Spike_Feedback_ATR_Mult * atrVal[0]) || (movePips > Spike_Feedback_Pips);
        string newOutcome = isSpike ? "true_spike" : "false_spike";
        // Update line
        string newLine = symbol+","+tfStr+","+fields[2]+","+reason+","+fields[4]+","+newOutcome;
        newAll += newLine+"\n";
    }
    // Write back
    file_handle = FileOpen(FEEDBACK_LOG_FILE, FILE_WRITE|FILE_TXT|FILE_ANSI);
    if(file_handle != INVALID_HANDLE)
    {
        FileWriteString(file_handle, newAll);
        FileClose(file_handle);
    }
}

//+------------------------------------------------------------------+
//| Process trading logic for a single symbol                        |
//+------------------------------------------------------------------+
void ProcessSymbolTick(string symbol)
{
  Print("[DEBUG] Processing symbol: ", symbol);
  if(postSpikeTPBarsMap.Exist(symbol))
    postSpikeTPBarsMap[symbol] = MathMax(0, postSpikeTPBarsMap[symbol] - 1);
  else
    postSpikeTPBarsMap[symbol] = 0;

  if(IsSymbolExcluded(symbol))
  {
    Print("[DEBUG] Symbol ", symbol, " is excluded from trading.");
    return;
  }
  if(!IsWithinSession())
  {
    Print("[DEBUG] Outside trading session, skipping tick for ", symbol);
    return;
  }
  if(!IsCrashSymbol(symbol) && !IsBoomSymbol(symbol) && !IsVolatilitySymbol(symbol) && !IsStepSymbol(symbol) && !IsRangeBreakSymbol(symbol) && !IsJumpSymbol(symbol)) {
    Print("[DEBUG] Symbol is not a recognized synthetic index, skipping: ", symbol);
    return;
  }
  // Pause after loss logic (global for now)
  if(lossPauseBars > 0)
  {
    Print("[DEBUG] In loss pause (", lossPauseBars, " bars left), blocking new cycle entry for ", symbol);
    lossPauseBars--;
    return;
  }
  double totalProfit, totalLots;
  int totalTrades, buyTrades, sellTrades;
  if(!GetGridStatus(symbol, totalTrades, buyTrades, sellTrades, totalProfit, totalLots)) {
    Print("[DEBUG] GetGridStatus failed for ", symbol);
    return;
  }
  Print("[DEBUG] Trades: ", totalTrades, " Buy: ", buyTrades, " Sell: ", sellTrades, " Profit: ", totalProfit, " for ", symbol);
  UpdateDashboard(totalTrades, totalProfit);

  int openTrades = 0;
  if(IsCrashSymbol(symbol))
  {
    // Only manage buy trades
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
      if(PositionGetInteger(POSITION_MAGIC) == MagicNumber && PositionGetString(POSITION_SYMBOL) == symbol && PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY)
      {
        openTrades++;
      }
    }
  }
  else if(IsBoomSymbol(symbol))
  {
    // Only manage sell trades
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
      if(PositionGetInteger(POSITION_MAGIC) == MagicNumber && PositionGetString(POSITION_SYMBOL) == symbol && PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL)
      {
        openTrades++;
      }
    }
  }
  else if(IsVolatilitySymbol(symbol) || IsStepSymbol(symbol) || IsRangeBreakSymbol(symbol) || IsJumpSymbol(symbol)) {
    // For demo: alternate buy/sell based on trend
    bool trendOk = IsTrendOk(symbol);
    Print("[DEBUG] Trend filter for ", symbol, ": ", (trendOk ? "OK" : "NOT OK"));
    if(!trendOk) {
      Print("[DEBUG] Trend filter: not in correct trend, skipping new entry for ", symbol);
      return;
    }
    if(IsCrashSymbol(symbol)) {
      // ... existing buy logic ...
    } else if(IsBoomSymbol(symbol)) {
      // ... existing sell logic ...
    } else if(IsVolatilitySymbol(symbol) || IsStepSymbol(symbol) || IsRangeBreakSymbol(symbol) || IsJumpSymbol(symbol)) {
      // For demo: alternate buy/sell based on trend
      double entryBuy = SymbolInfoDouble(symbol, SYMBOL_ASK);
      double entrySell = SymbolInfoDouble(symbol, SYMBOL_BID);
      double tpBuy = CalculateTP(symbol, true, entryBuy);
      double tpSell = CalculateTP(symbol, false, entrySell);
      double lot = CalculateAdaptiveLotSize(symbol, 0);
      if(trendOk) {
        bool buyResult = trade.Buy(lot, symbol, entryBuy, 0, tpBuy, "Volatility/Step/Range/Jump Buy");
        Print("[DEBUG] Synthetic index Buy result: ", buyResult, " Lot: ", lot, " TP: ", tpBuy, " for ", symbol);
        bool sellResult = trade.Sell(lot, symbol, entrySell, 0, tpSell, "Volatility/Step/Range/Jump Sell");
        Print("[DEBUG] Synthetic index Sell result: ", sellResult, " Lot: ", lot, " TP: ", tpSell, " for ", symbol);
      }
      lastCycleBalance = AccountInfoDouble(ACCOUNT_BALANCE);
      return;
    }
  }

  // Spike detection: If a spike is likely, close all trades for this symbol and block new entries, and start/reset cooldown
  if(IsSpikeLikely(symbol))
  {
    spikeCooldownBarsMap[symbol] = SPIKE_COOLDOWN_PERIOD; // Start/reset cooldown
    postSpikeTPBarsMap[symbol] = TP_AfterSpikeBars; // Use wider TP for next N bars
    if(openTrades > 0)
    {
      Print("[DEBUG] Spike detected! Closing all open trades for ", symbol, " to avoid spike risk.");
      CloseAllTrades(symbol);
      return;
    }
    else
    {
      Print("[DEBUG] Spike likely, blocking new cycle entry. Cooldown started/reset for ", symbol);
      return;
    }
  }

  // If in cooldown, decrement and block new entries
  if(spikeCooldownBarsMap.Exist(symbol) && spikeCooldownBarsMap[symbol] > 0)
  {
    Print("[DEBUG] In spike cooldown (", spikeCooldownBarsMap[symbol], " bars left), blocking new cycle entry for ", symbol);
    spikeCooldownBarsMap[symbol]--;
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
      Print("[DEBUG] Drawdown stop hit (", drawdownPercent, "% for ", symbol, "), closing all trades for ", symbol);
      CloseAllTrades(symbol);
      return;
    }
  }

  // After global SL or drawdown stop, set pause
  if(lastCycleBalance > 0 && balance < lastCycleBalance)
  {
    Print("[DEBUG] Loss detected in last cycle, pausing new entries for ", PauseAfterLossBars, " bars for ", symbol);
    lossPauseBars = PauseAfterLossBars;
    lastCycleBalance = balance;
  }

  // Manage grid (add more trades as price moves)
  Print("[DEBUG] Managing grid for ", symbol);
  ManageGrid(symbol, openTrades);
}

//+------------------------------------------------------------------+
//| Helper: Get ATR-based grid step                                  |
//+------------------------------------------------------------------+
double GetATRGridStep(string symbol)
{
    int atrPeriod = 14;
    int handle = iATR(symbol, 0, atrPeriod);
    double atrBuffer[1];
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    if(CopyBuffer(handle, 0, 0, 1, atrBuffer) == 1)
        return MathMax(GridStepPips * point, atrBuffer[0]);
    return GridStepPips * point;
}

//+------------------------------------------------------------------+
//| Helper: Check if symbol is Crash or Boom (explicit list)         |
//+------------------------------------------------------------------+
bool IsCrashSymbol(string symbol) {
    string sym = symbol;
    StringToUpper(sym);
    StringReplace(sym, " ", ""); // Remove spaces
    return (
        StringFind(sym, "CRASH300") >= 0 ||
        StringFind(sym, "CRASH500") >= 0 ||
        StringFind(sym, "CRASH600") >= 0 ||
        StringFind(sym, "CRASH900") >= 0 ||
        StringFind(sym, "CRASH1000") >= 0
    );
}
bool IsBoomSymbol(string symbol) {
    string sym = symbol;
    StringToUpper(sym);
    StringReplace(sym, " ", ""); // Remove spaces
    return (
        StringFind(sym, "BOOM300") >= 0 ||
        StringFind(sym, "BOOM500") >= 0 ||
        StringFind(sym, "BOOM600") >= 0 ||
        StringFind(sym, "BOOM900") >= 0 ||
        StringFind(sym, "BOOM1000") >= 0
    );
}

//+------------------------------------------------------------------+
//| Helper: Check if symbol is excluded                              |
//+------------------------------------------------------------------+
bool IsSymbolExcluded(string symbol)
{
    string sym = symbol;
    StringToUpper(sym);
    string ex = ExcludedSymbols;
    StringToUpper(ex);
    return (StringFind(","+ex+",", ","+sym+",") >= 0);
}

//+------------------------------------------------------------------+
//| Helper: Check if within session                                  |
//+------------------------------------------------------------------+
bool IsWithinSession()
{
    if(!UseSessionFilter) return true;
    datetime now = TimeCurrent();
    MqlDateTime tm;
    TimeToStruct(now, tm);
    int hour = tm.hour;
    if(SessionStartHour <= SessionEndHour)
        return (hour >= SessionStartHour && hour < SessionEndHour);
    else // overnight session
        return (hour >= SessionStartHour || hour < SessionEndHour);
}

//+------------------------------------------------------------------+
//| Helper: Trend filter (Crash: price above EMA50, Boom: below)     |
//+------------------------------------------------------------------+
bool IsTrendOk(string symbol)
{
    int ema50 = iMA(symbol, 0, 50, 0, MODE_EMA, PRICE_CLOSE);
    double emaBuffer[1];
    if(CopyBuffer(ema50, 0, 0, 1, emaBuffer) != 1) return false;
    double price = iClose(symbol, 0, 0);
    if(IsCrashSymbol(symbol)) return (price > emaBuffer[0]);
    if(IsBoomSymbol(symbol))  return (price < emaBuffer[0]);
    return false;
}

//+------------------------------------------------------------------+
//| Helper: Adaptive lot size (ATR/drawdown aware)                   |
//+------------------------------------------------------------------+
double CalculateAdaptiveLotSize(string symbol, int gridLevel)
{
    double baseLot = CalculateInitialLotSize(symbol);
    // ATR-based adjustment
    int atrPeriod = 14;
    int atrHandle = iATR(symbol, 0, atrPeriod);
    double atrBuffer[1];
    double atrFactor = 1.0;
    if(CopyBuffer(atrHandle, 0, 0, 1, atrBuffer) == 1 && atrBuffer[0] > 0)
        atrFactor = ATR_LotRiskFactor / atrBuffer[0];
    // Drawdown-aware adjustment
    double equity = AccountInfoDouble(ACCOUNT_EQUITY);
    double balance = AccountInfoDouble(ACCOUNT_BALANCE);
    double dd = balance - equity;
    double ddFactor = 1.0;
    if(dd > 0 && balance > 0)
    {
        double ddPct = dd / balance;
        if(ddPct > 0.05) ddFactor = 0.7; // Reduce risk if >5% drawdown
        if(ddPct > 0.10) ddFactor = 0.5; // Reduce more if >10%
    }
    double lot = baseLot * MathPow(LotMultiplier, gridLevel) * atrFactor * ddFactor;
    double minLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
    double maxLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
    double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
    if(lot < minLot) lot = minLot;
    if(lot > maxLot) lot = maxLot;
    lot = MathFloor(lot / lotStep) * lotStep;
    return NormalizeDouble(lot, 2);
}

//+------------------------------------------------------------------+
//| Candlestick Pattern Recognition                                  |
//+------------------------------------------------------------------+
bool IsBullishEngulfing(string symbol, int tf, int shift=0) {
    double open1 = iOpen(symbol, tf, shift+1);
    double close1 = iClose(symbol, tf, shift+1);
    double open0 = iOpen(symbol, tf, shift);
    double close0 = iClose(symbol, tf, shift);
    return (close1 < open1 && close0 > open0 && close0 > open1 && open0 < close1);
}
bool IsBearishEngulfing(string symbol, int tf, int shift=0) {
    double open1 = iOpen(symbol, tf, shift+1);
    double close1 = iClose(symbol, tf, shift+1);
    double open0 = iOpen(symbol, tf, shift);
    double close0 = iClose(symbol, tf, shift);
    return (close1 > open1 && close0 < open0 && close0 < open1 && open0 > close1);
}
bool IsPinBar(string symbol, int tf, int shift=0) {
    double open = iOpen(symbol, tf, shift);
    double close = iClose(symbol, tf, shift);
    double high = iHigh(symbol, tf, shift);
    double low = iLow(symbol, tf, shift);
    double body = MathAbs(close - open);
    double upper = high - MathMax(open, close);
    double lower = MathMin(open, close) - low;
    double range = high - low;
    // Pin bar: small body, long wick
    return (body < 0.3 * range && (upper > 2 * body || lower > 2 * body));
}
bool IsDoji(string symbol, int tf, int shift=0) {
    double open = iOpen(symbol, tf, shift);
    double close = iClose(symbol, tf, shift);
    double high = iHigh(symbol, tf, shift);
    double low = iLow(symbol, tf, shift);
    double body = MathAbs(close - open);
    double range = high - low;
    return (body < 0.1 * range);
}

//+------------------------------------------------------------------+
//| Z-score calculation for anomaly detection                        |
//+------------------------------------------------------------------+
double ZScore(const double &data[], int len)
{
    if(len < 2) return 0.0;
    double mean = 0, stddev = 0;
    for(int i=1; i<len; i++) mean += data[i];
    mean /= (len-1);
    for(int i=1; i<len; i++) stddev += MathPow(data[i] - mean, 2);
    stddev = MathSqrt(stddev / (len-1));
    if(stddev == 0) return 0.0;
    return (data[0] - mean) / stddev;
}

//+------------------------------------------------------------------+
//| ML Feature Export: Log feature vector for each spike event       |
//+------------------------------------------------------------------+
string FEATURE_LOG_FILE = "spike_features.csv";
void LogSpikeFeatures(string symbol, int tf, string reason, double value,
    double lastBody, double avgBody, double zBody, double rsi, double atr, double bbUpper, double bbLower, double bbClose, double zVol, long vol,
    bool bullishEngulfing, bool bearishEngulfing, bool pinBar, bool doji)
{
    int file_handle = FileOpen(FEATURE_LOG_FILE, FILE_READ|FILE_WRITE|FILE_TXT|FILE_ANSI);
    if(file_handle == INVALID_HANDLE)
        file_handle = FileOpen(FEATURE_LOG_FILE, FILE_WRITE|FILE_TXT|FILE_ANSI);
    if(file_handle != INVALID_HANDLE)
    {
        FileSeek(file_handle, 0, SEEK_END);
        string tfStr = (tf==PERIOD_M1 ? "M1" : tf==PERIOD_M5 ? "M5" : tf==PERIOD_M15 ? "M15" : IntegerToString(tf));
        string log = symbol+","+tfStr+","+TimeToString(TimeCurrent(),TIME_DATE|TIME_SECONDS)+","+reason+","+DoubleToString(value,2)+","+
            DoubleToString(lastBody,2)+","+DoubleToString(avgBody,2)+","+DoubleToString(zBody,2)+","+DoubleToString(rsi,2)+","+DoubleToString(atr,2)+","+
            DoubleToString(bbUpper,2)+","+DoubleToString(bbLower,2)+","+DoubleToString(bbClose,2)+","+DoubleToString(zVol,2)+","+IntegerToString(vol)+","+
            (bullishEngulfing?"1":"0")+","+(bearishEngulfing?"1":"0")+","+(pinBar?"1":"0")+","+(doji?"1":"0")+"\n";
        FileWriteString(file_handle, log);
        FileClose(file_handle);
    }
}

//+------------------------------------------------------------------+
//| Super Advanced Spike Detection (with ML feature export)          |
//+------------------------------------------------------------------+
bool IsSpikeLikely(string symbol)
{
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    bool spikeDetected = false;
    int chartSymbol = (StringCompare(symbol, _Symbol) == 0);

    // --- Multi-timeframe check ---
    int timeframes[3] = {PERIOD_M1, PERIOD_M5, PERIOD_M15};
    int tfEnabled[3] = {Spike_MTF_M1, Spike_MTF_M5, Spike_MTF_M15};
    for(int tfIdx=0; tfIdx<3; tfIdx++)
    {
        if(!tfEnabled[tfIdx]) continue;
        int tf = timeframes[tfIdx];
        // --- Candle body spike ---
        double body[11];
        for(int i=0; i<=10; i++)
            body[i] = MathAbs(iClose(symbol, tf, i) - iOpen(symbol, tf, i));
        double avgBody = 0;
        for(int i=1; i<=10; i++) avgBody += body[i];
        avgBody /= 10.0;
        double lastBody = iOpen(symbol, tf, 1) - iClose(symbol, tf, 1); // Bearish
        double lastBodyBull = iClose(symbol, tf, 1) - iOpen(symbol, tf, 1); // Bullish
        bool largeBearish = ((lastBody > Spike_BodyMultiplier * avgBody || lastBody > 100 * point) && lastBody > 0);
        bool largeBullish = ((lastBodyBull > Spike_BodyMultiplier * avgBody || lastBodyBull > 100 * point) && lastBodyBull > 0);
        // --- Z-score anomaly for body ---
        double zBody = ZScore(body, 11);
        bool bodyAnomaly = (MathAbs(zBody) > Spike_ZScore_Threshold);
        // --- RSI extreme ---
        int rsiHandle = iRSI(symbol, tf, 14, PRICE_CLOSE);
        double rsiBuffer[1];
        bool rsiExtreme = false;
        if(CopyBuffer(rsiHandle, 0, 0, 1, rsiBuffer) == 1)
        {
            if(IsCrashSymbol(symbol)) rsiExtreme = (rsiBuffer[0] > 80);
            if(IsBoomSymbol(symbol))  rsiExtreme = (rsiBuffer[0] < 20);
        }
        // --- ATR surge ---
        int atrHandle = iATR(symbol, tf, 14);
        double atrBuffer[11];
        bool atrSurge = false;
        double atrVal = 0;
        if(CopyBuffer(atrHandle, 0, 0, 11, atrBuffer) == 11)
        {
            double avgATR = 0;
            for(int i=1; i<=10; i++) avgATR += atrBuffer[i];
            avgATR /= 10.0;
            if(atrBuffer[0] > Spike_ATRMultiplier * avgATR) atrSurge = true;
            atrVal = atrBuffer[0];
        }
        // --- Bollinger Band breakout ---
        int bbHandle = iBands(symbol, tf, 20, 0, Spike_BBMultiplier, PRICE_CLOSE);
        double upper[1], lower[1], close[1];
        bool bbBreakout = false;
        double bbU=0, bbL=0, bbC=0;
        if(CopyBuffer(bbHandle, 1, 0, 1, upper) == 1 && CopyBuffer(bbHandle, 2, 0, 1, lower) == 1 && CopyBuffer(bbHandle, 0, 0, 1, close) == 1)
        {
            if(IsCrashSymbol(symbol) && close[0] < lower[0]) bbBreakout = true;
            if(IsBoomSymbol(symbol) && close[0] > upper[0]) bbBreakout = true;
            bbU = upper[0]; bbL = lower[0]; bbC = close[0];
        }
        // --- Volume surge and anomaly ---
        long vol[11];
        bool volSurge = false;
        double volD[11];
        long vol0 = 0;
        if(CopyTicksRange(symbol, vol, 0, 11) == 11)
        {
            double avgVol = 0;
            for(int i=1; i<=10; i++) avgVol += vol[i];
            avgVol /= 10.0;
            if(vol[0] > Spike_VolumeMultiplier * avgVol) volSurge = true;
            for(int i=0; i<=10; i++) volD[i] = (double)vol[i];
            vol0 = vol[0];
        }
        double zVol = ZScore(volD, 11);
        bool volAnomaly = (MathAbs(zVol) > Spike_ZScore_Threshold);
        // --- Pattern recognition ---
        bool bullishEngulfing = IsBullishEngulfing(symbol, tf, 1);
        bool bearishEngulfing = IsBearishEngulfing(symbol, tf, 1);
        bool pinBar = IsPinBar(symbol, tf, 1);
        bool doji = IsDoji(symbol, tf, 1);
        // --- Combine all ---
        if(IsCrashSymbol(symbol))
        {
            if(largeBearish) { LogSpikeEvent(symbol, tf, "largeBearish", lastBody); LogSpikeFeatures(symbol, tf, "largeBearish", lastBody, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "largeBearish"); spikeDetected = true; }
            if(rsiExtreme) { LogSpikeEvent(symbol, tf, "rsiExtreme", rsiBuffer[0]); LogSpikeFeatures(symbol, tf, "rsiExtreme", rsiBuffer[0], lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "rsiExtreme"); spikeDetected = true; }
            if(atrSurge) { LogSpikeEvent(symbol, tf, "atrSurge", atrVal); LogSpikeFeatures(symbol, tf, "atrSurge", atrVal, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "atrSurge"); spikeDetected = true; }
            if(bbBreakout) { LogSpikeEvent(symbol, tf, "bbBreakout", bbC); LogSpikeFeatures(symbol, tf, "bbBreakout", bbC, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "bbBreakout"); spikeDetected = true; }
            if(volSurge) { LogSpikeEvent(symbol, tf, "volSurge", vol0); LogSpikeFeatures(symbol, tf, "volSurge", vol0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "volSurge"); spikeDetected = true; }
            if(bodyAnomaly) { LogSpikeEvent(symbol, tf, "bodyAnomaly", zBody); LogSpikeFeatures(symbol, tf, "bodyAnomaly", zBody, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "bodyAnomaly"); spikeDetected = true; }
            if(volAnomaly) { LogSpikeEvent(symbol, tf, "volAnomaly", zVol); LogSpikeFeatures(symbol, tf, "volAnomaly", zVol, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "volAnomaly"); spikeDetected = true; }
            if(bearishEngulfing) { LogSpikeEvent(symbol, tf, "bearishEngulfing", 0); LogSpikeFeatures(symbol, tf, "bearishEngulfing", 0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "bearishEngulfing"); spikeDetected = true; }
            if(pinBar) { LogSpikeEvent(symbol, tf, "pinBar", 0); LogSpikeFeatures(symbol, tf, "pinBar", 0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "pinBar"); spikeDetected = true; }
            if(doji) { LogSpikeEvent(symbol, tf, "doji", 0); LogSpikeFeatures(symbol, tf, "doji", 0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "doji"); spikeDetected = true; }
        }
        if(IsBoomSymbol(symbol))
        {
            if(largeBullish) { LogSpikeEvent(symbol, tf, "largeBullish", lastBodyBull); LogSpikeFeatures(symbol, tf, "largeBullish", lastBodyBull, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "largeBullish"); spikeDetected = true; }
            if(rsiExtreme) { LogSpikeEvent(symbol, tf, "rsiExtreme", rsiBuffer[0]); LogSpikeFeatures(symbol, tf, "rsiExtreme", rsiBuffer[0], lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "rsiExtreme"); spikeDetected = true; }
            if(atrSurge) { LogSpikeEvent(symbol, tf, "atrSurge", atrVal); LogSpikeFeatures(symbol, tf, "atrSurge", atrVal, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "atrSurge"); spikeDetected = true; }
            if(bbBreakout) { LogSpikeEvent(symbol, tf, "bbBreakout", bbC); LogSpikeFeatures(symbol, tf, "bbBreakout", bbC, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "bbBreakout"); spikeDetected = true; }
            if(volSurge) { LogSpikeEvent(symbol, tf, "volSurge", vol0); LogSpikeFeatures(symbol, tf, "volSurge", vol0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "volSurge"); spikeDetected = true; }
            if(bodyAnomaly) { LogSpikeEvent(symbol, tf, "bodyAnomaly", zBody); LogSpikeFeatures(symbol, tf, "bodyAnomaly", zBody, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "bodyAnomaly"); spikeDetected = true; }
            if(volAnomaly) { LogSpikeEvent(symbol, tf, "volAnomaly", zVol); LogSpikeFeatures(symbol, tf, "volAnomaly", zVol, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "volAnomaly"); spikeDetected = true; }
            if(bullishEngulfing) { LogSpikeEvent(symbol, tf, "bullishEngulfing", 0); LogSpikeFeatures(symbol, tf, "bullishEngulfing", 0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "bullishEngulfing"); spikeDetected = true; }
            if(pinBar) { LogSpikeEvent(symbol, tf, "pinBar", 0); LogSpikeFeatures(symbol, tf, "pinBar", 0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "pinBar"); spikeDetected = true; }
            if(doji) { LogSpikeEvent(symbol, tf, "doji", 0); LogSpikeFeatures(symbol, tf, "doji", 0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "doji"); spikeDetected = true; }
        }
        if(spikeDetected) return true; // Conservative: any tf triggers
    }

    // In IsSpikeLikely, after pattern checks:
    bool insideBar = IsInsideBar(symbol, tf, 1);
    bool outsideBar = IsOutsideBar(symbol, tf, 1);
    bool morningStar = IsMorningStar(symbol, tf, 1);
    bool eveningStar = IsEveningStar(symbol, tf, 1);
    bool threeWhiteSoldiers = IsThreeWhiteSoldiers(symbol, tf, 1);
    bool threeBlackCrows = IsThreeBlackCrows(symbol, tf, 1);
    bool swingHigh = IsRecentSwingHigh(symbol, tf, 1, 10);
    bool swingLow = IsRecentSwingLow(symbol, tf, 1, 10);
    if(insideBar) { LogSpikeEvent(symbol, tf, "insideBar", 0); LogSpikeFeatures(symbol, tf, "insideBar", 0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "insideBar"); spikeDetected = true; }
    if(outsideBar) { LogSpikeEvent(symbol, tf, "outsideBar", 0); LogSpikeFeatures(symbol, tf, "outsideBar", 0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "outsideBar"); spikeDetected = true; }
    if(morningStar) { LogSpikeEvent(symbol, tf, "morningStar", 0); LogSpikeFeatures(symbol, tf, "morningStar", 0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "morningStar"); spikeDetected = true; }
    if(eveningStar) { LogSpikeEvent(symbol, tf, "eveningStar", 0); LogSpikeFeatures(symbol, tf, "eveningStar", 0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "eveningStar"); spikeDetected = true; }
    if(threeWhiteSoldiers) { LogSpikeEvent(symbol, tf, "threeWhiteSoldiers", 0); LogSpikeFeatures(symbol, tf, "threeWhiteSoldiers", 0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "threeWhiteSoldiers"); spikeDetected = true; }
    if(threeBlackCrows) { LogSpikeEvent(symbol, tf, "threeBlackCrows", 0); LogSpikeFeatures(symbol, tf, "threeBlackCrows", 0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "threeBlackCrows"); spikeDetected = true; }
    if(swingHigh) { LogSpikeEvent(symbol, tf, "swingHigh", 0); LogSpikeFeatures(symbol, tf, "swingHigh", 0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "swingHigh"); spikeDetected = true; }
    if(swingLow) { LogSpikeEvent(symbol, tf, "swingLow", 0); LogSpikeFeatures(symbol, tf, "swingLow", 0, lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji); if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "swingLow"); spikeDetected = true; }

    // Check for order block break
    if(IsBreakingOrderBlock(symbol, tf, iClose(symbol, tf, 1))) {
      LogSpikeEvent(symbol, tf, "orderBlockBreak", iClose(symbol, tf, 1));
      LogSpikeFeatures(symbol, tf, "orderBlockBreak", iClose(symbol, tf, 1), lastBody, avgBody, zBody, rsiBuffer[0], atrVal, bbU, bbL, bbC, zVol, vol0, bullishEngulfing, bearishEngulfing, pinBar, doji);
      if(chartSymbol) PlotSpikeMarker(symbol, tf, 1, "orderBlockBreak");
      spikeDetected = true;
    }

    return spikeDetected;
}

//+------------------------------------------------------------------+
//| Helper: Calculate dynamic TP for each trade                      |
//+------------------------------------------------------------------+
double CalculateTP(string symbol, bool isBuy, double entryPrice)
{
    double atr = 0;
    int atrPeriod = 14;
    int atrHandle = iATR(symbol, 0, atrPeriod);
    double atrBuffer[1];
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    if(CopyBuffer(atrHandle, 0, 0, 1, atrBuffer) == 1)
        atr = atrBuffer[0];
    else
        atr = GridStepPips * point;
    double multiplier = (postSpikeTPBarsMap.Exist(symbol) && postSpikeTPBarsMap[symbol] > 0) ? TP_Multiplier_AfterSpike : TP_Multiplier;
    double tpDistance = MathMax(GridStepPips * point, atr * multiplier);
    if(isBuy)
        return entryPrice + tpDistance;
    else
        return entryPrice - tpDistance;
}

//+------------------------------------------------------------------+
//| Manage grid for buy (Crash) or sell (Boom)                      |
//+------------------------------------------------------------------+
void ManageGrid(string symbol, int openTrades)
{
    if(IsCrashSymbol(symbol))
    {
        double lastBuyPrice = 0;
        GetLastBuyGridPrice(symbol, lastBuyPrice);
        double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
        double priceStep = GetATRGridStep(symbol);
        if(openTrades > 0 && openTrades < MaxGridLevels && ask > lastBuyPrice + priceStep)
        {
            double tp = CalculateTP(symbol, true, ask);
            double nextLot = CalculateAdaptiveLotSize(symbol, openTrades);
            bool buyResult = trade.Buy(nextLot, symbol, ask, 0, tp, "Grid Buy");
            Print("[DEBUG] New Grid Buy opened at ", ask, " Lot: ", nextLot, " TP: ", tp, " Result: ", buyResult, " for ", symbol);
        }
    }
    else if(IsBoomSymbol(symbol))
    {
        double lastSellPrice = 0;
        GetLastSellGridPrice(symbol, lastSellPrice);
        double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
        double priceStep = GetATRGridStep(symbol);
        if(openTrades > 0 && openTrades < MaxGridLevels && bid < lastSellPrice - priceStep)
        {
            double tp = CalculateTP(symbol, false, bid);
            double nextLot = CalculateAdaptiveLotSize(symbol, openTrades);
            bool sellResult = trade.Sell(nextLot, symbol, bid, 0, tp, "Grid Sell");
            Print("[DEBUG] New Grid Sell opened at ", bid, " Lot: ", nextLot, " TP: ", tp, " Result: ", sellResult, " for ", symbol);
        }
    }
}

//+------------------------------------------------------------------+
//| Gets key statistics about the current grid of trades.            |
//+------------------------------------------------------------------+
bool GetGridStatus(string symbol, int &totalTrades, int &buyTrades, int &sellTrades, double &totalProfit, double &totalLots)
{
  totalTrades = 0;
  buyTrades = 0;
  sellTrades = 0;
  totalProfit = 0;
  totalLots = 0;

  for(int i = PositionsTotal() - 1; i >= 0; i--)
  {
    ulong ticket = PositionGetTicket(i);
    if(PositionGetInteger(POSITION_MAGIC) == MagicNumber && PositionGetString(POSITION_SYMBOL) == symbol)
    {
      totalTrades++;
      totalProfit += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
      totalLots += PositionGetDouble(POSITION_VOLUME);

      if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY)
        buyTrades++;
      else if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL)
        sellTrades++;
    }
  }
  return true;
}

//+------------------------------------------------------------------+
//| Finds the highest buy price in the grid.                         |
//+------------------------------------------------------------------+
void GetLastBuyGridPrice(string symbol, double &lastBuyPrice)
{
    lastBuyPrice = 0; // Highest buy price
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
        if(PositionGetInteger(POSITION_MAGIC) == MagicNumber && PositionGetString(POSITION_SYMBOL) == symbol)
        {
            if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY)
            {
                double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
                if(openPrice > lastBuyPrice)
                    lastBuyPrice = openPrice;
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Finds the lowest sell price in the grid.                         |
//+------------------------------------------------------------------+
void GetLastSellGridPrice(string symbol, double &lastSellPrice)
{
    lastSellPrice = 999999999; // Lowest sell price
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
        if(PositionGetInteger(POSITION_MAGIC) == MagicNumber && PositionGetString(POSITION_SYMBOL) == symbol)
        {
            if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL)
            {
                double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
                if(openPrice < lastSellPrice)
                    lastSellPrice = openPrice;
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Calculates initial lot size based on account equity and risk percent. |
//+------------------------------------------------------------------+
double CalculateInitialLotSize(string symbol)
{
    double equity = AccountInfoDouble(ACCOUNT_EQUITY);
    double riskAmount = equity * RiskPercent / 100.0;
    double symbolPoint = SymbolInfoDouble(symbol, SYMBOL_POINT);
    double contractSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_CONTRACT_SIZE);
    double gridStep = GridStepPips * symbolPoint;
    double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
    double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);

    double slPoints = GridStepPips;
    double moneyPerPoint = contractSize * tickValue / tickSize;
    double lot = riskAmount / (slPoints * moneyPerPoint);

    double minLot = MathMax(MinLotSize, SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN));
    double maxLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
    double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
    if(lot < minLot) lot = minLot;
    if(lot > maxLot) lot = maxLot;
    lot = MathFloor(lot / lotStep) * lotStep;
    return NormalizeDouble(lot, 2);
}

//+------------------------------------------------------------------+
//| Closes all open trades for this EA for a symbol.                |
//+------------------------------------------------------------------+
void CloseAllTrades(string symbol)
{
  for(int i = PositionsTotal() - 1; i >= 0; i--)
  {
    if(PositionGetInteger(POSITION_MAGIC) == MagicNumber && PositionGetString(POSITION_SYMBOL) == symbol)
    {
      bool closeResult = trade.PositionClose(PositionGetTicket(i));
      Print("[DEBUG] Closed ticket ", PositionGetTicket(i), " result: ", closeResult, " for ", symbol);
    }
  }
}

//+------------------------------------------------------------------+
//| Displays status information on the chart.                        |
//+------------------------------------------------------------------+
void UpdateDashboard(int totalTrades, double totalProfit)
{
  string comment = expertName + " | v2.10\n";
  comment += "----------------------------------\n";
  comment += "Trades: " + (string)totalTrades + "\n";
  comment += "Floating P/L: " + DoubleToString(totalProfit, 2) + " USD\n";
  comment += "Target Profit: $10\n";
  comment += "Max Drawdown Stop: " + DoubleToString(MaxDrawdownPercent, 2) + "%\n";
  comment += "Spike Z: " + DoubleToString(Spike_ZScore_Threshold,2) + " ATR: " + DoubleToString(Spike_ATRMultiplier,2) + " Body: " + DoubleToString(Spike_BodyMultiplier,2) + "\n";
  comment += "Auto-tune: " + (string)spikeTuneCounter + "/" + (string)Spike_Tune_Interval + "\n";
  Comment(comment);
}

//+------------------------------------------------------------------+
//| Self-Tuning: Automated threshold adjustment                      |
//+------------------------------------------------------------------+
input int Spike_Tune_Interval = 100; // How often to auto-tune (ticks)
int spikeTuneCounter = 0;
void AutoTuneSpikeThresholds()
{
    int file_handle = FileOpen(FEEDBACK_LOG_FILE, FILE_READ|FILE_TXT|FILE_ANSI);
    if(file_handle == INVALID_HANDLE) return;
    int file_size = FileSize(file_handle);
    string all = FileReadString(file_handle, file_size);
    FileClose(file_handle);
    string lines[];
    int n = StringSplit(all, '\n', lines);
    if(n < 2) return;
    int count = 0, trueCount = 0, falseCount = 0;
    for(int i=n-2; i>=0 && count<100; i--) // last 100 events
    {
        string fields[];
        int m = StringSplit(lines[i], ',', fields);
        if(m < 6) continue;
        string outcome = fields[5];
        if(outcome == "true_spike") trueCount++;
        if(outcome == "false_spike") falseCount++;
        count++;
    }
    if(count < 10) return; // not enough data
    double trueRate = (double)trueCount / count;
    double falseRate = (double)falseCount / count;
    // Adjust thresholds
    if(trueRate < 0.3) // Too many false positives, make stricter
    {
        Spike_ZScore_Threshold += 0.1;
        Spike_ATRMultiplier += 0.1;
        Spike_BodyMultiplier += 0.1;
    }
    else if(trueRate > 0.7) // Too many false negatives, make looser
    {
        Spike_ZScore_Threshold = MathMax(1.0, Spike_ZScore_Threshold - 0.1);
        Spike_ATRMultiplier = MathMax(1.0, Spike_ATRMultiplier - 0.1);
        Spike_BodyMultiplier = MathMax(1.0, Spike_BodyMultiplier - 0.1);
    }
}

//+------------------------------------------------------------------+
//| GUI/Visualization: Real-time dashboard and spike markers         |
//+------------------------------------------------------------------+
void UpdateDashboardAllSymbols()
{
  string comment = expertName + " | v2.10\n";
  comment += "----------------------------------\n";
  comment += "Spike Z: " + DoubleToString(Spike_ZScore_Threshold,2) + " ATR: " + DoubleToString(Spike_ATRMultiplier,2) + " Body: " + DoubleToString(Spike_BodyMultiplier,2) + "\n";
  comment += "Auto-tune: " + (string)spikeTuneCounter + "/" + (string)Spike_Tune_Interval + "\n";
  int symbols_total = SymbolsTotal(true);
  for(int i=0; i<symbols_total; i++)
  {
    string symbol = SymbolName(i, true);
    int openTrades = 0;
    for(int j = PositionsTotal() - 1; j >= 0; j--)
    {
      if(PositionGetInteger(POSITION_MAGIC) == MagicNumber && PositionGetString(POSITION_SYMBOL) == symbol)
        openTrades++;
    }
    string trend = IsTrendOk(symbol) ? "Trend OK" : "No Trend";
    string cooldown = (spikeCooldownBarsMap.Exist(symbol) && spikeCooldownBarsMap[symbol] > 0) ? ("CD:"+(string)spikeCooldownBarsMap[symbol]) : "";
    comment += symbol+": Trades="+(string)openTrades+" "+trend+" "+cooldown+"\n";
  }
  Comment(comment);
}

//+------------------------------------------------------------------+
//| Plot spike markers on chart for current symbol                   |
//+------------------------------------------------------------------+
void PlotSpikeMarker(string symbol, int tf, int bar, string reason)
{
  color clr = clrRed;
  if(reason=="largeBullish" || reason=="bullishEngulfing") clr = clrGreen;
  string name = "spike_"+symbol+"_"+IntegerToString(bar)+"_"+reason;
  double price = iClose(symbol, tf, bar);
  ObjectCreate(0, name, OBJ_ARROW, 0, iTime(symbol, tf, bar), price);
  ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
  ObjectSetInteger(0, name, OBJPROP_WIDTH, 2);
  ObjectSetInteger(0, name, OBJPROP_ARROWCODE, 234);
}

//+------------------------------------------------------------------+
//| More Patterns: Advanced Price Action Recognition                  |
//+------------------------------------------------------------------+
bool IsInsideBar(string symbol, int tf, int shift=0) {
    double high0 = iHigh(symbol, tf, shift);
    double low0 = iLow(symbol, tf, shift);
    double high1 = iHigh(symbol, tf, shift+1);
    double low1 = iLow(symbol, tf, shift+1);
    return (high0 < high1 && low0 > low1);
}
bool IsOutsideBar(string symbol, int tf, int shift=0) {
    double high0 = iHigh(symbol, tf, shift);
    double low0 = iLow(symbol, tf, shift);
    double high1 = iHigh(symbol, tf, shift+1);
    double low1 = iLow(symbol, tf, shift+1);
    return (high0 > high1 && low0 < low1);
}
bool IsMorningStar(string symbol, int tf, int shift=0) {
    double open2 = iOpen(symbol, tf, shift+2);
    double close2 = iClose(symbol, tf, shift+2);
    double open1 = iOpen(symbol, tf, shift+1);
    double close1 = iClose(symbol, tf, shift+1);
    double open0 = iOpen(symbol, tf, shift);
    double close0 = iClose(symbol, tf, shift);
    return (close2 < open2 && MathAbs(close1-open1) < 0.3*MathAbs(open2-close2) && close0 > open0 && close0 > ((open2+close2)/2));
}
bool IsEveningStar(string symbol, int tf, int shift=0) {
    double open2 = iOpen(symbol, tf, shift+2);
    double close2 = iClose(symbol, tf, shift+2);
    double open1 = iOpen(symbol, tf, shift+1);
    double close1 = iClose(symbol, tf, shift+1);
    double open0 = iOpen(symbol, tf, shift);
    double close0 = iClose(symbol, tf, shift);
    return (close2 > open2 && MathAbs(close1-open1) < 0.3*MathAbs(open2-close2) && close0 < open0 && close0 < ((open2+close2)/2));
}
bool IsThreeWhiteSoldiers(string symbol, int tf, int shift=0) {
    for(int i=0; i<3; i++) {
        double open = iOpen(symbol, tf, shift+i);
        double close = iClose(symbol, tf, shift+i);
        if(close <= open) return false;
    }
    return true;
}
bool IsThreeBlackCrows(string symbol, int tf, int shift=0) {
    for(int i=0; i<3; i++) {
        double open = iOpen(symbol, tf, shift+i);
        double close = iClose(symbol, tf, shift+i);
        if(close >= open) return false;
    }
    return true;
}

//+------------------------------------------------------------------+
//| Market Structure: Recent Swing High/Low Detection                |
//+------------------------------------------------------------------+
bool IsRecentSwingHigh(string symbol, int tf, int shift=0, int lookback=10) {
    double high = iHigh(symbol, tf, shift);
    for(int i=1; i<=lookback; i++) {
        if(iHigh(symbol, tf, shift+i) > high) return false;
    }
    return true;
}
bool IsRecentSwingLow(string symbol, int tf, int shift=0, int lookback=10) {
    double low = iLow(symbol, tf, shift);
    for(int i=1; i<=lookback; i++) {
        if(iLow(symbol, tf, shift+i) < low) return false;
    }
    return true;
}

//+------------------------------------------------------------------+
//| Order Block Detection                                            |
//+------------------------------------------------------------------+
struct OrderBlock {
  double price;
  int bar;
  bool isBullish;
};

OrderBlock FindRecentOrderBlock(string symbol, int tf, int lookback=30) {
  for(int i=1; i<lookback-2; i++) {
    // Bullish order block: last bearish candle before strong up move
    double open0 = iOpen(symbol, tf, i);
    double close0 = iClose(symbol, tf, i);
    double open1 = iOpen(symbol, tf, i-1);
    double close1 = iClose(symbol, tf, i-1);
    double open2 = iOpen(symbol, tf, i-2);
    double close2 = iClose(symbol, tf, i-2);
    if(close0 < open0 && close1 > open1 && close2 > open2 && close1 > close0 && close2 > close1) {
      return OrderBlock{open0, i, true};
    }
    // Bearish order block: last bullish candle before strong down move
    if(close0 > open0 && close1 < open1 && close2 < open2 && close1 < close0 && close2 < close1) {
      return OrderBlock{open0, i, false};
    }
  }
  return OrderBlock{0, -1, false};
}

//+------------------------------------------------------------------+
//| Liquidity Zone Detection                                         |
//+------------------------------------------------------------------+
struct LiquidityZone {
  double high;
  double low;
  int startBar;
  int endBar;
};

LiquidityZone FindLiquidityZone(string symbol, int tf, int lookback=30, int minTouches=3, double maxRange=0.002) {
  for(int i=lookback; i>=minTouches; i--) {
    double hi = iHigh(symbol, tf, i);
    double lo = iLow(symbol, tf, i);
    int touches = 0;
    for(int j=i-minTouches+1; j<=i; j++) {
      if(MathAbs(iHigh(symbol, tf, j)-hi) < maxRange && MathAbs(iLow(symbol, tf, j)-lo) < maxRange) touches++;
    }
    if(touches >= minTouches) {
      return LiquidityZone{hi, lo, i, i-minTouches+1};
    }
  }
  return LiquidityZone{0,0,-1,-1};
}

//+------------------------------------------------------------------+
//| Plot Order Block and Liquidity Zone on Chart                     |
//+------------------------------------------------------------------+
void PlotOrderBlock(string symbol, int tf, OrderBlock ob) {
  if(ob.bar < 0) return;
  string name = "OB_"+symbol+"_"+IntegerToString(ob.bar);
  double price = ob.price;
  color clr = ob.isBullish ? clrGreen : clrRed;
  ObjectCreate(0, name, OBJ_HLINE, 0, 0, price);
  ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
  ObjectSetInteger(0, name, OBJPROP_WIDTH, 2);
}
void PlotLiquidityZone(string symbol, int tf, LiquidityZone lz) {
  if(lz.startBar < 0) return;
  string name = "LZ_"+symbol+"_"+IntegerToString(lz.startBar);
  ObjectCreate(0, name+"_hi", OBJ_HLINE, 0, 0, lz.high);
  ObjectCreate(0, name+"_lo", OBJ_HLINE, 0, 0, lz.low);
  ObjectSetInteger(0, name+"_hi", OBJPROP_COLOR, clrBlue);
  ObjectSetInteger(0, name+"_lo", OBJPROP_COLOR, clrBlue);
  ObjectSetInteger(0, name+"_hi", OBJPROP_WIDTH, 1);
  ObjectSetInteger(0, name+"_lo", OBJPROP_WIDTH, 1);
}

//+------------------------------------------------------------------+
//| Helper: Check if price is in liquidity zone                      |
//+------------------------------------------------------------------+
bool IsInLiquidityZone(string symbol, int tf, double price) {
  LiquidityZone lz = FindLiquidityZone(symbol, tf, 30, 3, 0.002);
  if(lz.startBar < 0) return false;
  return (price <= lz.high && price >= lz.low);
}

//+------------------------------------------------------------------+
//| Helper: Check if price breaks order block                        |
//+------------------------------------------------------------------+
bool IsBreakingOrderBlock(string symbol, int tf, double price) {
  OrderBlock ob = FindRecentOrderBlock(symbol, tf, 30);
  if(ob.bar < 0) return false;
  if(ob.isBullish && price > ob.price) return true;
  if(!ob.isBullish && price < ob.price) return true;
  return false;
}

//+------------------------------------------------------------------+
//| Helper: Check if symbol is Volatility, Step, Range Break, Jump   |
//+------------------------------------------------------------------+
bool IsVolatilitySymbol(string symbol) {
    string sym = symbol;
    StringToUpper(sym);
    StringReplace(sym, " ", "");
    return (StringFind(sym, "VOLATILITY") >= 0);
}
bool IsStepSymbol(string symbol) {
    string sym = symbol;
    StringToUpper(sym);
    StringReplace(sym, " ", "");
    return (StringFind(sym, "STEP") >= 0);
}
bool IsRangeBreakSymbol(string symbol) {
    string sym = symbol;
    StringToUpper(sym);
    StringReplace(sym, " ", "");
    return (StringFind(sym, "RANGEBREAK") >= 0);
}
bool IsJumpSymbol(string symbol) {
    string sym = symbol;
    StringToUpper(sym);
    StringReplace(sym, " ", "");
    return (StringFind(sym, "JUMP") >= 0);
}

// Change the default input value
input double TakeProfitUSD = 10.0; // Target net profit in USD to close the entire grid 