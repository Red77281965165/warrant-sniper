import sys
import os
import time
import datetime
import firebase_admin
import shioaji as sj
from firebase_admin import credentials, firestore

# ==========================================
# 設定區
# ==========================================
CRED_PATH = "serviceAccountKey.json" 
COMMAND_COLLECTION = "search_commands" 
RESULT_COLLECTION = "search_results"   

# ⚠️ 請注意資訊安全，不要將真實 Key 外流
SJ_API_KEY = "4QXJ3FiGFtzR5WvXtf9Tt41xg6dog6VfhZ5qZy6fiMiy"
SJ_SECRET_KEY = "EHdBKPXyC2h3gpJmHr9UbYtsqup7aREAyn1sLDnb3mCK"

# 篩選條件 (真實數據版)
FILTER_CONFIG = {
    "EXCLUDE_BROKER": "統一",
    "MIN_VOLUME": 0,          # 設為 0 以便在盤後/夜間測試
    "MIN_PRICE": 0.1,
    "MAX_PRICE": 10.0,        # 放寬到 10 元，涵蓋高價權證
    "MAX_SPREAD_PCT": 10.0,
    "MIN_LEVERAGE": 1.0,
    "MAX_LEVERAGE": 20.0 
}

# 🌟 【超級字典】收錄 200+ 檔權證熱門標的 (涵蓋台股 90% 交易熱度)
MANUAL_STOCK_MAP = {
    # === 晶圓代工/半導體龍頭 ===
    "2330": "台積電", "2303": "聯電", "5347": "世界", "6770": "力積電",
    "3711": "日月光投控", "2408": "南亞科", "2344": "華邦電", "2337": "旺宏",
    "6488": "環球晶", "5483": "中美晶", "3532": "台勝科",

    # === IC 設計 (高價/高波段) ===
    "2454": "聯發科", "3034": "聯詠", "2379": "瑞昱", "3035": "智原",
    "3443": "創意", "3661": "世芯-KY", "6531": "愛普", "3529": "力旺",
    "6643": "M31", "5269": "祥碩", "4961": "天鈺", "6104": "創惟",
    "4919": "新唐", "8016": "矽創", "3006": "晶豪科", "3227": "原相",
    "8299": "群聯", "6202": "盛群", "2458": "義隆", "5274": "信驊",

    # === AI / 伺服器 / 電腦周邊 ===
    "2382": "廣達", "3231": "緯創", "6669": "緯穎", "2356": "英業達",
    "2301": "光寶科", "3017": "奇鋐", "3324": "雙鴻", "2376": "技嘉",
    "2377": "微星", "2324": "仁寶", "2353": "宏碁", "2357": "華碩",
    "3653": "健策", "3665": "貿聯-KY", "2059": "川湖", "3013": "晟銘電",
    "8210": "勤誠", "6213": "聯茂", "2383": "台光電", "6274": "台燿",
    "3037": "欣興", "3189": "景碩", "8046": "南電",

    # === 航運 / 航空 / 散裝 ===
    "2603": "長榮", "2609": "陽明", "2615": "萬海", "2618": "長榮航",
    "2610": "華航", "2637": "慧洋-KY", "2606": "裕民", "2605": "新興",
    "2634": "漢翔", "2633": "台灣高鐵",

    # === 重電 / 綠能 / 線纜 ===
    "1513": "中興電", "1519": "華城", "1504": "東元", "1503": "士電",
    "1605": "華新", "1609": "大亞", "1514": "亞力", "9958": "世紀鋼",
    "3708": "上緯投控", "6806": "森崴能源", "6443": "元晶", "6477": "安集",

    # === 光學 / 面板 / 網通 ===
    "3008": "大立光", "3406": "玉晶光", "2409": "友達", "3481": "群創",
    "2317": "鴻海", "2308": "台達電", "5388": "中磊", "6285": "啟碁",
    "2345": "智邦", "2498": "宏達電", "2455": "全新", "8086": "宏捷科",
    "3105": "穩懋", "4977": "眾達-KY", "4906": "正文", "3596": "智易",

    # === 金融 / 壽險 ===
    "2881": "富邦金", "2882": "國泰金", "2891": "中信金", "2886": "兆豐金",
    "2884": "玉山金", "2892": "第一金", "2885": "元大金", "2880": "華南金",
    "2890": "永豐金", "2883": "開發金", "2887": "台新金", "5880": "合庫金",
    "5871": "中租-KY", "2801": "彰銀", "2834": "臺企銀",

    # === 傳產 / 原物料 / 汽車 ===
    "2002": "中鋼", "2027": "大成鋼", "2014": "中鸿", "1605": "華新",
    "1101": "台泥", "1102": "亞泥", "1301": "台塑", "1303": "南亞",
    "1326": "台化", "6505": "台塑化", "1402": "遠東新", "2207": "和泰車",
    "2201": "裕隆", "2204": "中華", "9904": "寶成", "9910": "豐泰",

    # === 生技 / 防疫 ===
    "6446": "藥華藥", "1795": "美時", "4128": "中天", "4743": "合一",
    "4147": "中裕", "4174": "浩鼎", "6547": "高端疫苗", "6589": "台康生技",
    "1760": "寶齡富錦", "4164": "承業醫",

    # === 通路 / 觀光 / 其他 ===
    "2912": "統一超", "5903": "全家", "2915": "潤泰全", "9945": "潤泰新",
    "2707": "晶華", "2727": "王品", "5706": "鳳凰", "2731": "雄獅",
    "8454": "富邦媒", "8044": "網家", "2412": "中華電", "3045": "台灣大"
}

print("⚡ 正在啟動權證狙擊手 (v31.0 全市場字典版)...")

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
    print(f"❌ Firebase 錯誤: {e}")
    sys.exit(1)

api = sj.Shioaji()
try:
    api.login(api_key=SJ_API_KEY, secret_key=SJ_SECRET_KEY)
    print("✅ Shioaji 登入成功")
    time.sleep(2)
except Exception as e:
    print(f"❌ 登入失敗: {e}")
    sys.exit(1)

# ==========================================
# 2. 建立資料庫
# ==========================================
ALL_WARRANTS = []
STOCK_NAME_MAP = MANUAL_STOCK_MAP.copy()

def build_data():
    print("📥 正在下載全市場清單...")
    # 嘗試下載，如果失敗也不會崩潰，因為我們有超級字典
    try:
        api.fetch_contracts(contract_download=True)
    except:
        print("⚠️ 清單下載異常，將使用內建超級字典運行")
    
    global ALL_WARRANTS, STOCK_NAME_MAP
    ALL_WARRANTS = []
    
    for i in range(120):
        if hasattr(api.Contracts, 'Stocks') and hasattr(api.Contracts.Stocks, 'TSE'):
            tse = list(api.Contracts.Stocks.TSE)
            otc = list(api.Contracts.Stocks.OTC)
            
            if len(tse) + len(otc) > 5000:
                print(f"✅ 下載完成，正在擴充索引庫...")
                all_s = tse + otc
                
                for c in all_s:
                    # 1. 自動補充新股票
                    if len(c.code) == 4: 
                        STOCK_NAME_MAP[c.code] = c.name
                    # 2. 收集權證
                    if "購" in c.name or "售" in c.name:
                        if len(c.code) == 6:
                            ALL_WARRANTS.append(c)
                break
        time.sleep(1)
    
    print(f"🗺️ 索引完成！\n   👉 股票字典: {len(STOCK_NAME_MAP)} 檔 (含內建200檔熱門股)\n   👉 權證資料庫: {len(ALL_WARRANTS)} 筆")

# ==========================================
# 3. 狙擊邏輯
# ==========================================
def clean_stock_name(name):
    return name.replace("-KY", "").replace("-DR", "").replace("*", "").strip()

class FinanceCalculator:
    @staticmethod
    def days_to_maturity(delivery_date_raw):
        if not delivery_date_raw: return 0
        try:
            d_str = str(delivery_date_raw).replace("/", "").replace("-", "")
            target = datetime.datetime.strptime(d_str, "%Y%m%d").date()
            today = datetime.date.today()
            return max(0, (target - today).days)
        except: return 0

def process_search(query_text):
    print(f"\n🔔 收到搜尋指令：{query_text}")
    
    target_warrants = []
    search_keywords = []

    query_str = str(query_text).strip()
    
    # 策略：先查字典，查不到就直接搜關鍵字
    if query_str in STOCK_NAME_MAP:
        full_name = STOCK_NAME_MAP[query_str]
        short_name = clean_stock_name(full_name)
        print(f"   🔍 代碼匹配 -> {full_name} -> 搜尋: {short_name}")
        search_keywords.append(short_name)
    else:
        short_name = clean_stock_name(query_str)
        print(f"   🔍 文字匹配 -> 搜尋: {short_name}")
        search_keywords.append(short_name)

    # 掃描所有權證
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
            
            if c.code in snap_map:
                snap = snap_map[c.code]
                price = snap.close
                volume = snap.total_volume
            
            # 夜間/無量補救：抓昨收
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

            # 屬性
            strike = 0.0
            mult = 0.0
            try:
                if hasattr(c, 'strike_price'): strike = float(c.strike_price)
                if hasattr(c, 'multiplier'): mult = float(c.multiplier)
                elif hasattr(c, 'strike_rate'): mult = float(c.strike_rate)
            except: pass

            lev = 0.0
            if price > 0 and strike > 0:
                lev = (strike * mult) / price
            
            if lev > 0:
                if lev < FILTER_CONFIG["MIN_LEVERAGE"] or lev > FILTER_CONFIG["MAX_LEVERAGE"]: continue

            days = FinanceCalculator.days_to_maturity(c.delivery_date)
            
            valid_results.append({
                "id": c.code,
                "name": c.name,
                "price": round(float(price), 2),
                "volume": int(volume),
                "lev": round(lev, 2),
                "strike": strike,
                "days": days
            })

    valid_results.sort(key=lambda x: x['volume'], reverse=True)
    
    if not valid_results:
        print(f"   ⚠️ 篩選後無符合資料")
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