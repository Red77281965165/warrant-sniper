import pandas as pd
import os
import re

def normalize_code(code):
    """
    代號正規化核心：
    1. 去除 Excel 的垃圾符號 (="...")
    2. 去除小數點 (.0)
    3. 自動補 0 到 6 位數 (32556 -> 032556)
    """
    # 1. 轉成字串並去除空白
    code = str(code).strip()
    
    # 2. 移除 Excel 格式
    code = code.replace('="', '').replace('"', '')
    
    # 3. 處理浮點數 (例如讀進來變成 32556.0)
    if '.' in code:
        code = code.split('.')[0]
    
    # 4. 關鍵修正：如果是純數字且長度不足 6 碼，前面補 0
    # 注意：有些權證可能是 P/Q 開頭 (例如 03xxxxP)，這類不做 zfill
    if code.isdigit() and len(code) < 6:
        code = code.zfill(6)
        
    return code

def clean_twse_date(date_str):
    """將民國年格式 (114年01月01日) 轉為西元格式 (20250101)"""
    if not isinstance(date_str, str): return str(date_str)
    try:
        match = re.match(r'(\d+)年(\d+)月(\d+)日', date_str.strip())
        if match:
            year, month, day = match.groups()
            year_ad = int(year) + 1911
            return f"{year_ad}{month.zfill(2)}{day.zfill(2)}"
        return date_str
    except:
        return date_str

def run_merger():
    print("🧹 開始清理並合併權證資料 (含補零修正)...")

    # ==========================================
    # 1. 處理上櫃資料 (TPEX)
    # ==========================================
    tpex_file = "tpex.csv"
    df_tpex = pd.DataFrame()
    
    if os.path.exists(tpex_file):
        try:
            # TPEX 通常第 2 行才是欄位
            df_tpex = pd.read_csv(tpex_file, header=1, encoding='utf-8', dtype=str) # 強制用 str 讀取
        except:
            try:
                df_tpex = pd.read_csv(tpex_file, header=1, encoding='cp950', dtype=str)
            except Exception as e:
                print(f"❌ 上櫃資料讀取失敗: {e}")

    if not df_tpex.empty:
        df_tpex = df_tpex.rename(columns={
            '最新履約價': '履約價格',
            '最新行使比例': '行使比例',
            '權證名稱': '權證簡稱'
        })
        # 這裡也要跑一次正規化，以防萬一
        if '權證代號' in df_tpex.columns:
            df_tpex['權證代號'] = df_tpex['權證代號'].apply(normalize_code)
            
        print(f"✅ 上櫃資料載入成功: {len(df_tpex)} 筆")

    # ==========================================
    # 2. 處理上市資料 (TWSE)
    # ==========================================
    twse_file = "twse.csv"
    df_twse = pd.DataFrame()

    if os.path.exists(twse_file):
        try:
            # 強制 dtype=str 避免 pandas 自作聰明轉成數字
            df_twse = pd.read_csv(twse_file, header=2, encoding='utf-8', dtype=str)
        except:
            try:
                df_twse = pd.read_csv(twse_file, header=2, encoding='cp950', dtype=str)
            except Exception as e:
                print(f"❌ 上市資料讀取失敗: {e}")

    if not df_twse.empty:
        # 清洗代號 (這一步就會把 32556 變回 032556)
        if '權證代號' in df_twse.columns:
            df_twse['權證代號'] = df_twse['權證代號'].apply(normalize_code)
        
        # 日期轉西元
        if '最後交易日' in df_twse.columns:
            df_twse['最後交易日'] = df_twse['最後交易日'].apply(clean_twse_date)

        df_twse = df_twse.rename(columns={
            '履約價格(元)/點數': '履約價格',
            '最後交易日': '到期日'
        })
        print(f"✅ 上市資料載入成功: {len(df_twse)} 筆")

    # ==========================================
    # 3. 合併與輸出
    # ==========================================
    target_columns = ['權證代號', '權證簡稱', '履約價格', '行使比例', '到期日']
    
    for col in target_columns:
        if col not in df_tpex.columns: df_tpex[col] = None
        if col not in df_twse.columns: df_twse[col] = None
            
    df_tpex_clean = df_tpex[target_columns]
    df_twse_clean = df_twse[target_columns]

    df_final = pd.concat([df_tpex_clean, df_twse_clean], ignore_index=True)

    # 再次確保轉成數字前去除逗號
    df_final['履約價格'] = pd.to_numeric(df_final['履約價格'].astype(str).str.replace(',', ''), errors='coerce')
    df_final['行使比例'] = pd.to_numeric(df_final['行使比例'].astype(str).str.replace(',', ''), errors='coerce')
    
    # 再次確保代號是字串且補 0 (雙重保險)
    df_final['權證代號'] = df_final['權證代號'].apply(normalize_code)

    df_final = df_final.dropna(subset=['權證代號', '履約價格'])

    # 存檔時強制用 text 格式，避免 Excel 打開又自動去零
    # 但為了 Python 讀取方便，我們還是存標準 CSV，只要讀取端 (Engine) 知道是字串即可
    output_file = "warrant_full_data.csv"
    df_final.to_csv(output_file, index=False, encoding='utf-8-sig')
    
    print("-" * 30)
    print(f"🎉 成功！資料庫已修正 (已自動補 0)")
    # 印出幾筆原本可能有問題的代號來檢查
    print("檢查樣本 (0 開頭代號):")
    print(df_final[df_final['權證代號'].str.startswith('0')].head(3)['權證代號'].to_string(index=False))
    print("➡️ 現在可以重新執行 python warrant_engine.py 了！")

if __name__ == "__main__":
    run_merger()