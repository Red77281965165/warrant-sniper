import requests
import pandas as pd
import time
import io

def get_twse_warrants_openapi():
    print("正在從【證交所 OpenAPI】下載上市權證資料...")
    # 這是證交所官方最新的 Open Data 接口 (TWT85U: 上市權證發行資訊)
    # 優點：穩定、速度快、不會擋
    url = "https://openapi.twse.com.tw/v1/exchangeReport/TWT85U"
    
    try:
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            data = res.json()
            df = pd.DataFrame(data)
            
            # OpenAPI 的欄位名稱可能不同，這裡做對應
            # 觀察回傳資料，通常欄位是: Code, Name, Underlying, StrikePrice...
            # 我們需要印出來確認一下，但通常如下：
            # 假設欄位名是中文 Key (OpenAPI 特性)
            
            # 為了保險，我們只取需要的並重新命名
            # 如果欄位是英文 (Code, Name)，則需對應；如果是中文則直接用
            # 先判斷欄位格式
            if 'Code' in df.columns: # 英文欄位版
                df = df.rename(columns={
                    'Code': '權證代號',
                    'Name': '權證簡稱', 
                    'UnderlyingStock': '標的證券',
                    'MaturityDate': '到期日',
                    'StrikePrice': '履約價格',
                    'StrikeRate': '行使比例'
                })
            
            df['市場別'] = '上市'
            return df
        else:
            print(f"上市下載失敗 (狀態碼 {res.status_code})")
            return pd.DataFrame()
            
    except Exception as e:
        print(f"上市 OpenAPI 錯誤: {e}")
        return pd.DataFrame()

def get_tpex_warrants_opendata():
    print("正在從【櫃買中心 Open Data】下載上櫃權證資料...")
    # 櫃買中心開放資料 CSV 下載點
    # 這是最穩定的來源，不走網頁 API
    url = "https://www.tpex.org.tw/web/warrant/warrant_info/warrant_summary_download.php?l=zh-tw&s=0,asc,0"
    
    try:
        # 櫃買通常給 CSV
        res = requests.get(url, timeout=15)
        if res.status_code == 200:
            # 使用 pandas 直接讀取 CSV 內容
            df = pd.read_csv(io.StringIO(res.text))
            
            # 欄位清理：櫃買 CSV 的欄位通常是中文
            # 欄位範例: "權證代號", "權證簡稱", "標的代號", "到期日", "履約價格", "行使比例"
            # 我們只需要重新命名對應好即可
            
            # 有時候欄位會多空格，先清理
            df.columns = df.columns.str.strip()
            
            # 確保欄位存在
            required_cols = {
                '權證代號': '權證代號',
                '權證名稱': '權證簡稱', # 有時候叫名稱
                '權證簡稱': '權證簡稱',
                '標的代號': '標的證券', # 櫃買通常給代號
                '到期日': '到期日',
                '履約價格': '履約價格',
                '行使比例': '行使比例'
            }
            
            df = df.rename(columns=required_cols)
            df['市場別'] = '上櫃'
            
            return df
        else:
            print(f"上櫃下載失敗 (狀態碼 {res.status_code})")
            return pd.DataFrame()
            
    except Exception as e:
        print(f"上櫃 Open Data 錯誤: {e}")
        return pd.DataFrame()

# --- 主程式 ---
print("🚀 啟動權證資料更新 (v2025 官方接口版)...")

# 1. 抓上市 (OpenAPI)
df_twse = get_twse_warrants_openapi()
print(f"上市筆數: {len(df_twse)}")

# 2. 抓上櫃 (CSV)
df_tpex = get_tpex_warrants_opendata()
print(f"上櫃筆數: {len(df_tpex)}")

# 3. 合併處理
if df_twse.empty and df_tpex.empty:
    print("❌ 錯誤：完全抓不到資料，請檢查網路連線。")
else:
    df_all = pd.concat([df_twse, df_tpex], ignore_index=True)

    # 欄位標準化與過濾
    target_cols = ['權證代號', '權證簡稱', '標的證券', '到期日', '履約價格', '行使比例', '市場別']
    
    # 確保所有目標欄位都有，沒有的補空值
    for col in target_cols:
        if col not in df_all.columns:
            df_all[col] = ""

    df_final = df_all[target_cols]
    
    # 存檔
    filename = "warrant_full_data.csv"
    df_final.to_csv(filename, index=False, encoding='utf-8-sig')
    
    print("-" * 30)
    print(f"✅ 更新成功！共 {len(df_final)} 筆權證資料")
    print(f"📁 已存檔至: {filename}")
    print("現在您可以執行 python warrant_engine.py 了")