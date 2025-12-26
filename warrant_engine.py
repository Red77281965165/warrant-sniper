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
    "MIN_LEVERAGE": 2.5,       # 最小實質槓桿
    "MAX_LEVERAGE": 9.0,       # 最大實質槓桿
    "MAX_THETA_PCT": 2.5,      # 最大每日利息% (絕對值)
    "MIN_VOLUME": 0,          # 最小總成交量
    "MIN_PRICE": 0.25,         # 最低價
    "MAX_PRICE": 3.0,          # 最高價
    "MAX_SPREAD": 0.03         # 最大容許買賣價差
}

# 已知券商列表
KNOWN_BROKERS = [
    "元大", "凱基", "統一", "永豐", "富邦", "群益", "國泰", "兆豐", 
    "華南", "玉山", "元富", "康和", "第一", "麥證", "法興", "匯豐", 
    "國票", "永昌", "亞東"
]

print("⚡ 正在啟動權證戰情室 (v2025.12 向量光速版 - 修正 Indexs 拼字)...")

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
# 2. 金融工程核心 (向量化極速引擎)
# ==========================================
class VectorizedEngine:
    @staticmethod
    def bs_price_scalar(sigma, S, K, T, r, option_type='call'):
        """單筆計算 BS 價格 (用於反推 IV 的迴圈中)"""
        try:
            if T <= 0: return max(0, S - K) if option_type == 'call' else max(0, K - S)
            if sigma <= 0.0001: return max(0, S - K) if option_type == 'call' else max(0, K - S)
            
            d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
            d2 = d1 - sigma * np.sqrt(T)
            
            if option_type == 'call':
                return S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
            else:
                return K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
        except:
            return 0

    @staticmethod
    def implied_volatility_scalar(price, S, K, T, r, option_type='call'):
        """反推隱含波動率 (Scalar)"""
        try:
            intrinsic = max(0, S - K) if option_type == 'call' else max(0, K - S)
            if price <= intrinsic + 0.001: return np.nan
            
            def objective(sigma):
                return VectorizedEngine.bs_price_scalar(sigma, S, K, T, r, option_type) - price
            
            return brentq(objective, 0.01, 5.0)
        except:
            return np.nan

    @staticmethod
    def calculate_greeks_analytical_batch(S_arr, K_arr, T_arr, r, sigma_arr, types_arr):
        """
        【核心加速區】使用解析解公式一次計算所有 Greeks
        包含 Delta, Gamma (未輸出), Theta (年化)
        """
        # 避免除以零
        sigma_arr = np.maximum(sigma_arr, 0.0001)
        T_arr = np.maximum(T_arr, 0.00001)
        
        d1 = (np.log(S_arr / K_arr) + (r + 0.5 * sigma_arr ** 2) * T_arr) / (sigma_arr * np.sqrt(T_arr))
        d2 = d1 - sigma_arr * np.sqrt(T_arr)
        
        # 預先計算 PDF 和 CDF
        pdf_d1 = norm.pdf(d1)
        cdf_d1 = norm.cdf(d1)
        cdf_minus_d1 = norm.cdf(-d1)
        cdf_minus_d2 = norm.cdf(-d2)
        cdf_d2 = norm.cdf(d2) 
        
        # --- Delta 計算 ---
        delta_calls = cdf_d1
        delta_puts = cdf_d1 - 1.0
        deltas = np.where(types_arr == 'call', delta_calls, delta_puts)
        
        # --- Theta 計算 (解析解) ---
        term1 = -(S_arr * sigma_arr * pdf_d1) / (2 * np.sqrt(T_arr))
        
        theta_calls = term1 - r * K_arr * np.exp(-r * T_arr) * cdf_d2
        theta_puts = term1 + r * K_arr * np.exp(-r * T_arr) * cdf_minus_d2
        
        thetas_annual = np.where(types_arr == 'call', theta_calls, theta_puts)
        
        return deltas, thetas_annual

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
# 4. 搜尋與運算主邏輯 (修正 Indexs 拼字)
# ==========================================
def process_search(query_text):
    print(f"\n🔔 [Firebase] 收到搜尋請求：{query_text}")
    
    query_str = str(query_text).strip().replace("*", "")
    
    mother_name = query_str
    mother_code = None

    # === 大盤 (001) 特判邏輯 ===
    if query_str in ["001", "大盤", "臺股指", "台股指", "加權指數", "加權", "加權指", "台股", "臺股", "TAIEX"]:
        print("   🔍 識別為大盤指數搜尋！")
        mother_code = "001"
        mother_name = "臺股指"
    # =========================
    elif query_str in STOCK_CODE_TO_NAME:
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
        print(f"   ❌ 找不到此股票代號: {query_str}")
        return []

    print(f"   🔍 正在抓取標的 ({mother_name}) 即時報價...")
    mother_price = 0.0
    
    try:
        # === 修正點：使用 Indexs (Shioaji 特殊拼法) ===
        if mother_code == "001":
            # 注意：這裡是 Indexs，不是 Indices
            m_contract = api.Contracts.Indexs.TSE.get("001")
        else:
            # 一般個股
            m_contract = api.Contracts.Stocks.TSE.get(mother_code) or api.Contracts.Stocks.OTC.get(mother_code)
        
        if m_contract:
            s = api.snapshots([m_contract])
            if s: 
                mother_price = float(s[0].close)
                print(f"   📊 標的價格: {mother_price}")
    except Exception as e:
        print(f"   ❌ 標的報價抓取錯誤: {e}")

    if mother_price <= 0:
        print("   ⚠️ 標的無價格，無法計算。")
        return []

    # 設定搜尋關鍵字
    if mother_code == "001":
        search_name = "臺股指"
    else:
        search_name = mother_name.replace("-KY", "").replace("KY", "").replace("*", "")
        search_name = search_name.replace("投控", "").replace("控股", "").replace("-DR", "")
        search_name = search_name.strip()

    target_warrants = []
    for w in ALL_WARRANTS:
        if search_name in w.name:
            if STRATEGY_CONFIG["EXCLUDE_BROKER"] in w.name:
                continue 
            target_warrants.append(w)
        
    if not target_warrants:
        print(f"   ⚠️ 找不到權證 (過濾後: {search_name})")
        return []

    print(f"   📋 初步鎖定 {len(target_warrants)} 檔權證，進行光速運算...")

    # --- 階段一：批次抓取與基礎過濾 ---
    valid_candidates = []
    
    # 分批抓取 Snapshot
    chunk_size = 200
    for i in range(0, len(target_warrants), chunk_size):
        chunk = target_warrants[i:i+chunk_size]
        try:
            snapshots = api.snapshots(chunk)
        except Exception as e:
            print(f"⚠️ API Snapshot 錯誤: {e}")
            continue
        
        snap_map = {s.code: s for s in snapshots}
        
        for c in chunk:
            if c.code not in snap_map: continue
            if c.code not in CACHE_SPECS: continue
            
            snap = snap_map[c.code]
            
            try:
                best_bid = float(snap.buy_price)
                best_ask = float(snap.sell_price)
                last_price = float(snap.close)
                best_bid_vol = int(snap.buy_volume)
                best_ask_vol = int(snap.sell_volume)
                volume = int(snap.total_volume)
                
                # 1. 價差過濾
                if best_ask > 0 and best_bid > 0:
                    spread = best_ask - best_bid
                    if spread > STRATEGY_CONFIG["MAX_SPREAD"]: continue
                
                # 2. 定義市價
                if best_ask > 0: market_price = best_ask
                elif last_price > 0: market_price = last_price
                elif best_bid > 0: market_price = best_bid
                else: continue
                
                # 3. 量能過濾
                if volume < STRATEGY_CONFIG["MIN_VOLUME"]: continue

                if market_price < STRATEGY_CONFIG["MIN_PRICE"] or market_price > STRATEGY_CONFIG["MAX_PRICE"]: continue

                # 4. 時間過濾
                specs = CACHE_SPECS[c.code]
                m_date = datetime.datetime.strptime(specs['maturity_date'], "%Y-%m-%d").date()
                days_left = (m_date - datetime.date.today()).days
                
                if days_left < STRATEGY_CONFIG["MIN_DAYS_LEFT"]: continue
                
                # 收集有效數據
                valid_candidates.append({
                    "contract": c,
                    "market_price": market_price,
                    "strike": specs['strike_price'],
                    "multiplier": specs['multiplier'],
                    "days_left": days_left,
                    "type": specs['type'],
                    "best_bid": best_bid,
                    "best_ask": best_ask,
                    "bid_vol": best_bid_vol,
                    "ask_vol": best_ask_vol,
                    "volume": volume
                })
            except Exception as e:
                continue

    if not valid_candidates:
        print("   ⚠️ 基礎篩選後無符合資料")
        return []

    # --- 階段二：向量化運算 (Vectorized Greeks) ---
    
    count = len(valid_candidates)
    S_arr = np.full(count, mother_price)
    K_arr = np.array([x['strike'] for x in valid_candidates])
    T_arr = np.array([x['days_left'] for x in valid_candidates]) / 365.0
    Price_arr = np.array([x['market_price'] for x in valid_candidates])
    Mul_arr = np.array([x['multiplier'] for x in valid_candidates])
    Type_arr = np.array([x['type'] for x in valid_candidates])
    
    Unit_Price_arr = np.where(Mul_arr > 0, Price_arr / Mul_arr, Price_arr)
    
    # 1. 計算隱含波動率 (IV)
    r_rate = 0.016
    IV_list = []
    
    for i in range(count):
        iv = VectorizedEngine.implied_volatility_scalar(
            Unit_Price_arr[i], S_arr[i], K_arr[i], T_arr[i], r_rate, Type_arr[i]
        )
        IV_list.append(iv)
    
    IV_arr = np.array(IV_list)
    
    valid_mask = ~np.isnan(IV_arr)
    
    # 2. 向量化 Greeks 計算
    deltas, thetas_annual = VectorizedEngine.calculate_greeks_analytical_batch(
        S_arr, K_arr, T_arr, r_rate, IV_arr, Type_arr
    )
    
    # 3. 後處理與最後篩選
    final_results = []
    for i in range(count):
        if not valid_mask[i]: continue 
        
        lev = (S_arr[i] * abs(deltas[i]) * Mul_arr[i]) / Price_arr[i]
        theta_dollar_day = (thetas_annual[i] / 252.0) * Mul_arr[i]
        
        calc_base = valid_candidates[i]['best_bid'] if valid_candidates[i]['best_bid'] > 0 else Price_arr[i]
        theta_pct = (abs(theta_dollar_day) / calc_base) * 100 if calc_base > 0 else 999
        
        if lev < STRATEGY_CONFIG["MIN_LEVERAGE"] or lev > STRATEGY_CONFIG["MAX_LEVERAGE"]: continue
        if abs(theta_pct) > STRATEGY_CONFIG["MAX_THETA_PCT"]: continue
        
        c_info = valid_candidates[i]
        contract = c_info['contract']
        
        broker_name = "其他"
        for b in KNOWN_BROKERS:
            if b in contract.name:
                broker_name = b
                break
        
        final_results.append({
            "id": contract.code,
            "name": contract.name,
            "price": round(float(c_info['market_price']), 2),
            "bid": round(float(c_info['best_bid']), 2),
            "ask": round(float(c_info['best_ask']), 2),
            "spread": round(c_info['best_ask'] - c_info['best_bid'], 2) if (c_info['best_ask']>0 and c_info['best_bid']>0) else 0,
            "bid_vol": c_info['bid_vol'],
            "ask_vol": c_info['ask_vol'],
            "volume": c_info['volume'],
            "lev": round(float(lev), 2),
            "theta_pct": round(float(theta_pct), 3),
            "days": int(c_info['days_left']),
            "strike": float(c_info['strike']),
            "iv": round(float(IV_arr[i] * 100), 1),
            "broker": broker_name,
        })

    final_results.sort(key=lambda x: x['volume'], reverse=True)

    print(f"   ✅ 計算完成！找到 {len(final_results)} 檔優質權證")
    return final_results

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
                            elif isinstance(v, (np.floating, np.float64, np.float32)):
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
                        print(f"   ☁️ 成功！資料已回傳 (Doc ID: {doc.id})")
                    except Exception as e:
                        print(f"   ❌ 上傳失敗: {e}")

def start_server():
    build_contract_index()
    print(f"📡 伺服器啟動成功！(API Key模式)")
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