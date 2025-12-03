import sys
import os
import time
import datetime
import math
import requests
import pandas as pd
import numpy as np
from scipy.stats import norm
from scipy.optimize import brentq
import firebase_admin
import shioaji as sj
from firebase_admin import credentials, firestore
import threading

# ==========================================
# 設定區
# ==========================================
CRED_PATH = "serviceAccountKey.json" 
COMMAND_COLLECTION = "search_commands" 

# 你的永豐金 API 帳號
SJ_API_KEY = "4QXJ3FiGFtzR5WvXtf9Tt41xg6dog6VfhZ5qZy6fiMiy"
SJ_SECRET_KEY = "EHdBKPXyC2h3gpJmHr9UbYtsqup7aREAyn1sLDnb3mCK"

# ==========================================
# 策略篩選設定
# ==========================================
STRATEGY_CONFIG = {
    "EXCLUDE_BROKER": "統一",  # 排除的券商關鍵字
    "MIN_DAYS_LEFT": 90,       # 最小剩餘天數
    "MIN_LEVERAGE": 3.0,       # 最小實質槓桿
    "MAX_LEVERAGE": 9.0,       # 最大實質槓桿
    "MAX_THETA_PCT": 3.0,      # 最大每日利息% (絕對值)
    "MIN_VOLUME": 10,           # 最小成交量
    "MIN_PRICE": 0.25,          # 最低價
    "MAX_PRICE": 3.0          # 最高價
}

# 已知券商列表
KNOWN_BROKERS = [
    "元大", "凱基", "統一", "永豐", "富邦", "群益", "國泰", "兆豐", 
    "華南", "玉山", "元富", "康和", "第一", "麥證", "法興", "匯豐", 
    "國票", "永昌", "亞東"
]

print("⚡ 正在啟動權證戰情室 (v2025.9 委買張數修復版)...")

# ==========================================
# 1. 初始化與 CSV 資料載入
# ==========================================
CACHE_SPECS = {} 

def load_csv_data():
    filename = "warrant_full_data.csv"
    print(f"📂 正在讀取靜態資料庫: {filename} ...")
    
    if not os.path.exists(filename):
        print(f"❌ 錯誤：找不到 {filename}，請先執行 crawler.py")
        return

    try:
        df = pd.read_csv(filename, dtype=str)
        df['履約價格'] = pd.to_numeric(df['履約價格'].str.replace(',', ''), errors='coerce')
        df['行使比例'] = pd.to_numeric(df['行使比例'].str.replace(',', ''), errors='coerce')
        
        count = 0
        for _, row in df.iterrows():
            code = str(row['權證代號']).strip()
            w_type = 'call'
            name = str(row['權證簡稱'])
            if '售' in name: w_type = 'put'
            elif '購' in name: w_type = 'call'
            
            raw_date = str(row['到期日']).strip()
            if len(raw_date) == 7:
                raw_date = str(int(raw_date[:3]) + 1911) + raw_date[3:]
            
            fmt_date = "2099-12-31"
            if len(raw_date) == 8:
                fmt_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"

            CACHE_SPECS[code] = {
                "strike_price": float(row['履約價格']),
                "multiplier": float(row['行使比例']),
                "maturity_date": fmt_date,
                "type": w_type,
                "name": name
            }
            count += 1
            
        print(f"✅ 成功載入 {count} 檔權證詳細規格！")
    except Exception as e:
        print(f"❌ 讀取 CSV 發生錯誤: {e}")

# 初始化 Firebase
if not os.path.exists(CRED_PATH):
    print(f"❌ 找不到 Firebase 金鑰: {CRED_PATH}")
    db = None
else:
    try:
        cred = credentials.Certificate(CRED_PATH)
        if not firebase_admin._apps: firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firebase 連線成功")
    except Exception as e:
        print(f"❌ Firebase 初始化失敗: {e}")
        db = None

# 初始化 Shioaji
api = sj.Shioaji()
try:
    api.login(api_key=SJ_API_KEY, secret_key=SJ_SECRET_KEY)
    print("✅ Shioaji 登入成功")
except Exception as e:
    print(f"❌ API 登入失敗: {e}")
    sys.exit(1)

load_csv_data()

# ==========================================
# 2. 金融工程核心
# ==========================================
class FinancialEngine:
    @staticmethod
    def bs_price(sigma, S, K, T, r, option_type='call'):
        try:
            if T <= 0: return 0
            d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
            d2 = d1 - sigma * np.sqrt(T)
            if option_type == 'call':
                return S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
            else:
                return K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
        except: return 0

    @staticmethod
    def implied_volatility(price, S, K, T, r, option_type='call'):
        try:
            intrinsic = max(0, S - K) if option_type == 'call' else max(0, K - S)
            if price <= intrinsic: return np.nan 
            return brentq(lambda x: FinancialEngine.bs_price(x, S, K, T, r, option_type) - price, 0.001, 5.0)
        except: return np.nan

    @staticmethod
    def calculate_greeks(S, K, T, r, sigma, option_type='call'):
        try:
            if sigma <= 0 or T <= 0: return 0, 0
            d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
            d2 = d1 - sigma * np.sqrt(T)
            
            if option_type == 'call': delta = norm.cdf(d1)
            else: delta = norm.cdf(d1) - 1
                
            term1 = -(S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T))
            if option_type == 'call':
                theta = term1 - r * K * np.exp(-r * T) * norm.cdf(d2)
            else:
                theta = term1 + r * K * np.exp(-r * T) * norm.cdf(-d2)
            return delta, theta
        except: return 0, 0

# ==========================================
# 3. 索引建立
# ==========================================
ALL_WARRANTS = [] 
STOCK_CODE_TO_NAME = {}
STOCK_NAME_TO_CODE = {}

def build_contract_index():
    print("📥 建立全市場索引...")
    tse = list(api.Contracts.Stocks.TSE) if hasattr(api.Contracts.Stocks, 'TSE') else []
    otc = list(api.Contracts.Stocks.OTC) if hasattr(api.Contracts.Stocks, 'OTC') else []
    
    for c in tse + otc:
        if len(c.code) == 4: 
            STOCK_CODE_TO_NAME[c.code] = c.name
            STOCK_NAME_TO_CODE[c.name] = c.code
        if c.code in CACHE_SPECS:
            ALL_WARRANTS.append(c)
    print(f"🗺️ 索引完成！含 {len(ALL_WARRANTS)} 檔有效權證。")

# ==========================================
# 4. 搜尋與運算主邏輯
# ==========================================
def process_search(query_text):
    print(f"\n🔔 [Firebase] 收到搜尋請求：{query_text}")
    
    query_str = str(query_text).strip()
    mother_name = query_str
    mother_code = None

    if query_str in STOCK_CODE_TO_NAME:
        mother_code = query_str
        mother_name = STOCK_CODE_TO_NAME[query_str]
    elif query_str in STOCK_NAME_TO_CODE:
        mother_name = query_str
        mother_code = STOCK_NAME_TO_CODE[query_str]
    else:
        for name, code in STOCK_NAME_TO_CODE.items():
            if query_str in name:
                mother_name = name
                mother_code = code
                break
    
    if not mother_code:
        print("   ❌ 找不到此股票代號")
        return []

    print(f"   🔍 正在抓取標的 ({mother_name}) 即時報價...")
    mother_price = 0.0
    try:
        m_contract = api.Contracts.Stocks.TSE.get(mother_code) or api.Contracts.Stocks.OTC.get(mother_code)
        if m_contract:
            s = api.snapshots([m_contract])
            if s: 
                mother_price = float(s[0].close)
                print(f"   📊 標的價格: {mother_price}")
    except Exception as e:
        print(f"   ❌ 標的報價抓取錯誤: {e}")

    if mother_price == 0:
        print("   ⚠️ 標的無價格，無法計算。")
        return []

    search_name = mother_name.replace("-KY", "").replace("KY", "").strip()

    target_warrants = []
    for w in ALL_WARRANTS:
        if search_name in w.name:
            if STRATEGY_CONFIG["EXCLUDE_BROKER"] in w.name:
                continue 
            target_warrants.append(w)
        
    if not target_warrants:
        print(f"   ⚠️ 找不到權證 (關鍵字: {search_name})")
        return []

    print(f"   📋 初步鎖定 {len(target_warrants)} 檔權證，進行計算與篩選...")

    chunk_size = 200
    valid_results = []
    
    for i in range(0, len(target_warrants), chunk_size):
        chunk = target_warrants[i:i+chunk_size]
        try:
            snapshots = api.snapshots(chunk)
        except: continue
        
        snap_map = {s.code: s for s in snapshots}
        
        for c in chunk:
            if c.code not in snap_map: continue
            if c.code not in CACHE_SPECS: continue
            
            snap = snap_map[c.code]
            
            # --- 【報價與張數抓取】 ---
            best_bid = float(snap.buy_price)   # 最佳委買價
            best_ask = float(snap.sell_price)  # 最佳委賣價
            last_price = float(snap.close)     # 最新成交價
            
            # 新增：抓取最佳五檔的第一檔張數 (Best Bid/Ask Volume)
            best_bid_vol = int(snap.buy_volume) # 最佳委買量
            best_ask_vol = int(snap.sell_volume) # 最佳委賣量
            
            # 定義「市價 (Market Price)」邏輯： Ask > Last > Bid
            if best_ask > 0:
                market_price = best_ask
            elif last_price > 0:
                market_price = last_price
            elif best_bid > 0:
                market_price = best_bid
            else:
                continue 
            
            volume = snap.total_volume # 這是當日總成交量
            # --- ---------------- ---
            
            if volume < STRATEGY_CONFIG["MIN_VOLUME"]: continue
            if market_price < STRATEGY_CONFIG["MIN_PRICE"] or market_price > STRATEGY_CONFIG["MAX_PRICE"]: continue

            specs = CACHE_SPECS[c.code]
            strike = specs['strike_price']
            multiplier = specs['multiplier']
            maturity_date_str = specs['maturity_date']
            w_type = specs['type']

            effective_leverage = 0.0
            theta_pct = 0.0 
            days_left = 0
            iv_display = 0.0
            
            if mother_price > 0 and strike > 0:
                try:
                    m_date = datetime.datetime.strptime(maturity_date_str, "%Y-%m-%d").date()
                    days_left = (m_date - datetime.date.today()).days
                    
                    if days_left < STRATEGY_CONFIG["MIN_DAYS_LEFT"]: continue
                    
                    if days_left > 0:
                        T = days_left / 365.0
                        r_rate = 0.015 
                        
                        opt_price_per_share = market_price / multiplier if multiplier > 0 else market_price
                        
                        iv = FinancialEngine.implied_volatility(opt_price_per_share, mother_price, strike, T, r_rate, w_type)
                        
                        if not np.isnan(iv):
                            delta, theta_annual = FinancialEngine.calculate_greeks(mother_price, strike, T, r_rate, iv, w_type)
                            effective_leverage = (mother_price * abs(delta) * multiplier) / market_price
                            
                            if effective_leverage < STRATEGY_CONFIG["MIN_LEVERAGE"] or effective_leverage > STRATEGY_CONFIG["MAX_LEVERAGE"]:
                                continue

                            theta_cost_dollar = (theta_annual / 365.0) * multiplier
                            
                            # --- 【Theta 計算修改】 ---
                            # 使用最佳委買 (Best Bid) 計算每日利息佔比
                            # 邏輯：如果你持有它，每天會依據「變現價格(Bid)」損失多少比例
                            calc_base = best_bid if best_bid > 0 else market_price
                            
                            if calc_base > 0:
                                theta_pct = (theta_cost_dollar / calc_base) * 100
                            
                            if abs(theta_pct) > STRATEGY_CONFIG["MAX_THETA_PCT"]:
                                continue
                            
                            iv_display = round(iv * 100, 1)
                            
                            broker_name = "其他"
                            for b in KNOWN_BROKERS:
                                if b in c.name:
                                    broker_name = b
                                    break
                            
                            # --- 【回傳資料區】 ---
                            valid_results.append({
                                "id": c.code,
                                "name": c.name,
                                "price": round(float(market_price), 2),
                                "bid": round(float(best_bid), 2),
                                "ask": round(float(best_ask), 2),
                                "bid_vol": int(best_bid_vol), # 新增：委買張數
                                "ask_vol": int(best_ask_vol), # 新增：委賣張數
                                "volume": int(volume),        # 這是總成交量
                                "lev": round(effective_leverage, 2),
                                "theta_pct": round(theta_pct, 2),
                                "days": days_left,
                                "strike": strike,
                                "iv": iv_display,
                                "broker": broker_name,
                            })
                except Exception:
                    pass

    valid_results.sort(key=lambda x: x['volume'], reverse=True)

    if valid_results:
        print(f"   ✅ 計算完成！找到 {len(valid_results)} 檔符合策略的權證")
    else:
        print("   ⚠️ 篩選後無符合資料")

    return valid_results

# ==========================================
# 5. Firebase 監聽邏輯
# ==========================================
def on_snapshot(col_snapshot, changes, read_time):
    for change in changes:
        if change.type.name == 'ADDED':
            doc = change.document
            data = doc.to_dict()
            if data.get('status') == 'pending':
                query_text = data.get('stock_code') or data.get('query')
                
                if query_text:
                    results = process_search(str(query_text))
                    
                    clean_results = []
                    for item in results:
                        clean_item = {}
                        for k, v in item.items():
                            if isinstance(v, (np.integer, np.int64)):
                                clean_item[k] = int(v)
                            elif isinstance(v, (np.floating, np.float64)):
                                clean_item[k] = float(v)
                            else:
                                clean_item[k] = v
                        clean_results.append(clean_item)

                    try:
                        doc.reference.update({
                            "status": "completed",
                            "updatedAt": firestore.SERVER_TIMESTAMP,
                            "count": len(clean_results),
                            "data": clean_results
                        })
                        print(f"   ☁️ 成功！資料已直接回傳給 App (Doc ID: {doc.id})")
                    except Exception as e:
                        print(f"   ❌ 上傳失敗: {e}")

def start_server():
    build_contract_index()
    print(f"📡 伺服器啟動成功！正在監聽 Firebase 指令...")
    print(f"   (請保持此視窗開啟，電腦會自動處理 App 的請求)")
    
    if db:
        col_ref = db.collection(COMMAND_COLLECTION)
        col_watch = col_ref.on_snapshot(on_snapshot)
        while True:
            try: time.sleep(1)
            except KeyboardInterrupt:
                print("🛑 伺服器停止中...")
                break
    else:
        print("❌ 無法連接 Firebase，請檢查 Key 設定。")

if __name__ == "__main__":
    start_server()