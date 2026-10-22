import subprocess

def run_sql(sql):
    cmd = ["docker", "exec", "-i", "ztreel3_postgres_prod", "psql", "-U", "root", "-d", "ztreel", "-c", sql]
    return subprocess.check_output(cmd, text=True)

print("=== 1. ERROR LOG IN ztteam_images (video_status = 'FAILED') ===")
print(run_sql("""
    SELECT COALESCE(substring(error_log from 1 for 120), 'NULL / No error recorded') as err, count(id) 
    FROM ztteam_images 
    WHERE video_status = 'FAILED' 
    GROUP BY err 
    ORDER BY count(id) DESC;
"""))

print("\n=== 2. TOTAL COUNTS IN ztteam_images ===")
print(run_sql("""
    SELECT 
        video_status,
        is_posted,
        count(id) 
    FROM ztteam_images 
    GROUP BY video_status, is_posted 
    ORDER BY video_status, is_posted;
"""))

print("\n=== 3. ERROR LOG IN ztteam_reels (status = 'FAILED') ===")
print(run_sql("""
    SELECT COALESCE(substring(error_log from 1 for 120), 'NULL / No error recorded') as err, count(id) 
    FROM ztteam_reels 
    WHERE status = 'FAILED' 
    GROUP BY err 
    ORDER BY count(id) DESC;
"""))

print("\n=== 4. TOTAL COUNTS IN ztteam_reels ===")
print(run_sql("""
    SELECT status, is_posted, count(id) 
    FROM ztteam_reels 
    GROUP BY status, is_posted 
    ORDER BY status, is_posted;
"""))

print("\n=== 5. SAMPLE ERROR DETAILS ===")
print(run_sql("""
    SELECT id, page_id, video_status, is_posted, substring(error_log from 1 for 250) as error_sample 
    FROM ztteam_images 
    WHERE video_status = 'FAILED' 
    LIMIT 5;
"""))

import urllib.request, json

def test_key(label, key):
    req = urllib.request.Request(
        'https://api.openai.com/v1/chat/completions',
        data=json.dumps({
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": "hi"}],
            "max_tokens": 5
        }).encode('utf-8'),
        headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode('utf-8'))
            print(f"{label}: SUCCESS -> {res['choices'][0]['message']['content']}")
    except Exception as e:
        print(f"{label}: FAILED -> {e}")

print("\n=== 6. TEST OPENAI KEYS ===")
db_key = run_sql("SELECT value FROM ztteam_settings WHERE key = 'openai_api_key';").strip()
test_key("DB KEY", db_key)
with open('/root/ztreel-t3/.env') as f:
    for line in f:
        if line.startswith('OPENAI_API_KEY='):
            env_key = line.split('=', 1)[1].strip()
            test_key("ENV KEY", env_key)

