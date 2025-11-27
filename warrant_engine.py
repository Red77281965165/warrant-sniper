import sys
import os
import time
import datetime
import math
import firebase_admin
import shioaji as sj
from firebase_admin import credentials, firestore

# ==========================================
# 設定區
# ==========================================
CRED_PATH = "serviceAccountKey.json" 
COMMAND_COLLECTION = "search_commands" 
RESULT_COLLECTION = "search_results"   

SJ_API_KEY = "4QXJ3FiGFtzR5WvXtf9Tt41xg6dog6VfhZ5qZy6fiMiy"
SJ_SECRET_KEY = "EHdBKPXyC2h3gpJmHr9UbYtsqup7aREAyn1sLDnb3mCK"

# 篩選條件
FILTER_CONFIG = {
    "EXCLUDE_BROKER": "統一",
    "MIN_VOLUME": 0,          
    "MIN_PRICE": 0.1,
    "MAX_PRICE": 50.0,        
    "MAX_SPREAD_PCT": 10.0,   
    "MIN_LEVERAGE": 0.0,      # 暫時設0，確保有資料
    "MAX_LEVERAGE": 999.0 
}

# 超級字典
MANUAL_STOCK_MAP = {
    "2330": "台積電", "3661": "世芯-KY", "2454": "聯發科",
    "2317": "鴻海", "2303": "聯電", "2603": "長榮",
    "2344": "華邦電", "2409": "友達", "3481": "群創",
    "2609": "陽明", "2615": "萬海", "3037": "欣興"
}

print("⚡ 正在啟動權證戰情室 (v39.0 數據校正版)...")

# ==========================================
# 1. 初始化
# ==========================================
if not os.path.exists(CRED_PATH):
    print(f"❌ 找不到金鑰檔案")
    sys.exit(1)

try:
    cred = credentials.Certificate(CRED_PATH)
    if not firebase_admin._apps: firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase 連線成功")
except Exception as e:
    db = None

api = sj.Shioaji()
try:
    api.login(api_key=SJ_API_KEY, secret_key=SJ_SECRET_KEY)
    print("✅ Shioaji 登入成功")
    time.sleep(2)
except Exception as e:
    sys.exit(1)

if not api.simulation:
    print("🚀 [A計畫] 加速引擎運作中 (Excellent!)")
else:
    print("⚠️ [警告] 仍在慢速模式")

# ==========================================
# 2. 建立資料庫
# ==========================================
ALL_WARRANTS = []
STOCK_NAME_MAP = MANUAL_STOCK_MAP.copy()

def build_data():
    print("📥 正在下載全市場清單...")
    try:
        api.fetch_contracts(contract_download=True)
    except: pass
    
    global ALL_WARRANTS, STOCK_NAME_MAP
    ALL_WARRANTS = []
    
    for i in range(120):
        if hasattr(api.Contracts, 'Stocks') and hasattr(api.Contracts.Stocks, 'TSE'):
            tse = list(api.Contracts.Stocks.TSE)
            otc = list(api.Contracts.Stocks.OTC)
            
            if len(tse) + len(otc) > 5000:
                print(f"✅ 下載完成，正在建立索引...")
                all_s = tse + otc
                for c in all_s:
                    if len(c.code) == 4: 
                        STOCK_NAME_MAP[c.code] = c.name
                    if "購" in c.name or "售" in c.name:
                        if len(c.code) == 6:
                            ALL_WARRANTS.append(c)
                break
        time.sleep(1)
    
    print(f"🗺️ 索引完成！權證總數: {len(ALL_WARRANTS)} 筆")

# ==========================================
# 3. 狙擊邏輯 (強力校正)
# ==========================================
def clean_stock_name(name):
    return name.replace("-KY", "").replace("-DR", "").replace("*", "").strip()

def extract_broker(warrant_name, stock_name):
    try:
        clean_s_name = clean_stock_name(stock_name)
        temp = warrant_name.replace(clean_s_name, "")
        return temp[:2]
    except: return "N/A"

class FinanceCalculator:
    @staticmethod
    def days_to_maturity(contract):
        # 取得原始資料
        raw_date = getattr(contract, 'delivery_date', '')
        
        target_date = None
        try:
            # 情況1: 字串格式 "20250301"
            if isinstance(raw_date, str):
                d_str = raw_date.replace("/", "").replace("-", "")[:8]
                if len(d_str) == 8:
                    target_date = datetime.datetime.strptime(d_str, "%Y%m%d").date()
            
            # 情況2: 整數格式 20250301 (加速版常見)
            elif isinstance(raw_date, int):
                target_date = datetime.datetime.strptime(str(raw_date), "%Y%m%d").date()
                
        except: pass
        
        if target_date:
            today = datetime.date.today()
            return max(0, (target_date - today).days)
        return 0

    @staticmethod
    def calculate_leverage(price, strike, multiplier):
        # 如果行使比例是 0，我們預設給 0.1 (救命補丁)
        if multiplier == 0: multiplier = 0.1
        
        if price > 0 and strike > 0:
            return (strike * multiplier) / price
        return 0.0

def process_search(query_text):
    print(f"\n🔔 收到搜尋指令：{query_text}")
    
    target_warrants = []
    search_keywords = []
    stock_display_name = str(query_text)

    query_str = str(query_text).strip()
    if query_str in STOCK_NAME_MAP:
        full_name = STOCK_NAME_MAP[query_str]
        stock_display_name = clean_stock_name(full_name)
        print(f"   🔍 代碼匹配 -> {full_name}")
        search_keywords.append(stock_display_name)
    else:
        stock_display_name = clean_stock_name(query_str)
        print(f"   🔍 文字匹配 -> {stock_display_name}")
        search_keywords.append(stock_display_name)

    for w in ALL_WARRANTS:
        for keyword in search_keywords:
            if keyword in w.name:
                target_warrants.append(w)
                break

    if not target_warrants:
        print(f"   ⚠️ 找不到相關權證")
        return []

    print(f"   📋 找到 {len(target_warrants)} 檔權證，抓取數據中...")
    
    valid_results = []
    
    # 診斷旗標：只印一次
    debug_printed = False

    chunk_size = 200
    for i in range(0, len(target_warrants), chunk_size):
        chunk = target_warrants[i:i+chunk_size]
        snapshots = []
        try:
            snapshots = api.snapshots(chunk)
        except: pass
        
        snap_map = {s.code: s for s in snapshots} if snapshots else {}
        
        for c in chunk:
            price = 0.0
            volume = 0
            bid_price = 0.0
            bid_vol = 0
            ask_price = 0.0
            ask_vol = 0
            
            if c.code in snap_map:
                snap = snap_map[c.code]
                price = snap.close
                volume = snap.total_volume
                bid_price = snap.buy_price
                bid_vol = snap.buy_volume
                ask_price = snap.sell_price
                ask_vol = snap.sell_volume
            
            if price == 0:
                if hasattr(c, 'reference') and c.reference > 0:
                    price = float(c.reference)
                elif hasattr(c, 'limit_up') and hasattr(c, 'limit_down'):
                    price = (float(c.limit_up) + float(c.limit_down)) / 2

            if price == 0: continue

            # 篩選
            if FILTER_CONFIG["EXCLUDE_BROKER"] in c.name: continue
            if price < FILTER_CONFIG["MIN_PRICE"] or price > FILTER_CONFIG["MAX_PRICE"]: continue
            if volume < FILTER_CONFIG["MIN_VOLUME"]: continue

            # --- 屬性讀取 (強力校正) ---
            strike = 0.0
            mult = 0.0
            try:
                if hasattr(c, 'strike_price'): strike = float(c.strike_price)
                
                if hasattr(c, 'multiplier'): mult = float(c.multiplier)
                elif hasattr(c, 'strike_rate'): mult = float(c.strike_rate)
            except: pass

            # --- 診斷區：印出第一筆資料的原始樣貌 ---
            if not debug_printed and strike > 0:
                print("\n   🕵️ [數據診斷] 成功抓取範例:")
                print(f"   👉 名稱: {c.name}")
                print(f"   👉 原始日期: {c.delivery_date} (Type: {type(c.delivery_date)})")
                print(f"   👉 履約價: {strike}")
                print(f"   👉 行使比例: {mult}")
                debug_printed = True
            # -----------------------------------

            # 計算
            lev = FinanceCalculator.calculate_leverage(price, strike, mult)
            days = FinanceCalculator.days_to_maturity(c)
            
            # 價差
            spread = 0.0
            if bid_price > 0 and ask_price > 0:
                spread = ((ask_price - bid_price) / bid_price) * 100

            # 五檔
            bids = []
            asks = []
            if bid_price > 0: bids.append({"price": bid_price, "volume": bid_vol})
            if ask_price > 0: asks.append({"price": ask_price, "volume": ask_vol})

            broker_name = extract_broker(c.name, stock_display_name)

            valid_results.append({
                "id": c.code,
                "name": c.name,
                "price": round(float(price), 2),
                "volume": int(volume),
                "lev": round(lev, 2),
                "strike": strike,
                "spread": round(spread, 1),
                "days": days,
                "bids": bids, 
                "asks": asks,
                "broker": broker_name, 
                "theta": 0.0 
            })

    valid_results.sort(key=lambda x: x['volume'], reverse=True)
    
    if not valid_results:
        print(f"   ⚠️ 篩選後無資料")
    else:
        print(f"   ✅ 成功篩選出 {len(valid_results)} 筆資料")

    return valid_results

# ==========================================
# 4. 監聽 Firebase
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
                    safe_id = str(query_text).replace("/", "").replace(".", "")
                    db.collection(RESULT_COLLECTION).document(safe_id).set({
                        "query": query_text,
                        "updatedAt": firestore.SERVER_TIMESTAMP,
                        "results": results
                    })
                    doc.reference.update({"status": "completed"})
                    print(f"   ☁️ 已回傳結果至 App\n")

def start_server():
    build_data()
    print(f"📡 伺服器已啟動，監聽中...")
    col_ref = db.collection(COMMAND_COLLECTION)
    col_watch = col_ref.on_snapshot(on_snapshot)
    while True:
        try: time.sleep(1)
        except KeyboardInterrupt: break

if __name__ == "__main__":
    start_server()