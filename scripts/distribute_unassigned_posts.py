import subprocess
import random

NEWS_COMMENT_PREFIXES = [
    'Full story:',
    'Read more:',
    'Full report:',
    'Details:',
    'Read the full story:',
    'Read more here:'
]

def get_random_news_comment(url):
    prefix = random.choice(NEWS_COMMENT_PREFIXES)
    return f"{prefix} {url}"

def run_sql(sql):
    cmd = ["docker", "exec", "-i", "ztreel3_postgres_prod", "psql", "-U", "root", "-d", "ztreel", "-t", "-A", "-F|", "-c", sql]
    res = subprocess.check_output(cmd, text=True)
    return res.strip()

def main():
    print("=" * 60)
    print("ZTTeam: Bat dau phan bo 141 bai viet ton dong tren VPS...")
    print("=" * 60 + "\n")

    # ---------------------------------------------------------
    # PHAN 1: PHAN BO BAI VIET TIN TUC (mv.imsb.info) -> 26 Fanpages
    # ---------------------------------------------------------
    print(">>> [PHAN 1] XU LY BAI VIET TIN TUC (mv.imsb.info)...")
    raw_pages = run_sql("""
        SELECT p.id, p.name, count(i.id)::int as cnt
        FROM ztteam_pages p
        JOIN ztteam_page_sources ps ON p.id = ps.page_id
        LEFT JOIN ztteam_images i ON p.id = i.page_id
        WHERE ps.target_site_id = 'c83fef00-5d07-4f42-8a05-a9e74445b590' AND p.is_active = true
        GROUP BY p.id, p.name
        ORDER BY cnt ASC, p.name ASC;
    """)

    news_pages = []
    for line in raw_pages.split("\n"):
        if not line:
            continue
        p_id, p_name, cnt = line.split("|")
        news_pages.append({"id": p_id, "name": p_name, "count": int(cnt)})

    print(f"- Tim thay {len(news_pages)} Fanpage Tin tuc active.")

    raw_news_posts = run_sql("""
        SELECT id, wp_post_url
        FROM ztteam_images
        WHERE page_id IS NULL AND wp_post_url LIKE '%mv.imsb%'
        ORDER BY created_at ASC;
    """)

    news_posts = []
    for line in raw_news_posts.split("\n"):
        if not line:
            continue
        parts = line.split("|")
        news_posts.append({"id": parts[0], "url": parts[1]})

    print(f"- Tim thay {len(news_posts)} bai Tin tuc chua gan page_id.\n")

    news_assigned = 0
    for post in news_posts:
        news_pages.sort(key=lambda p: (p["count"], p["name"]))
        target_page = news_pages[0]

        comment_text = get_random_news_comment(post["url"])
        escaped_comment = comment_text.replace("'", "''")

        run_sql(f"""
            UPDATE ztteam_images
            SET page_id = '{target_page["id"]}',
                ai_first_comment = '{escaped_comment}',
                ai_caption = regexp_replace(ai_caption, '\\.\\.\\.\\s*FULL STORY IN THE COMMENT.*', '...Full story in the comments', 'i'),
                video_status = CASE WHEN video_status = 'FAILED' THEN 'PENDING' ELSE video_status END,
                error_log = NULL,
                updated_at = NOW()
            WHERE id = '{post["id"]}';
        """)

        target_page["count"] += 1
        news_assigned += 1

    print(f"=> DA GAN THANH CONG {news_assigned} BAI TIN TUC VAO 26 FANPAGE NEWS!\n")

    # ---------------------------------------------------------
    # PHAN 2: PHAN BO BAI VIET DONG VAT (an.imsb.info) -> 15 Fanpages
    # ---------------------------------------------------------
    print(">>> [PHAN 2] XU LY BAI VIET DONG VAT (an.imsb.info)...")
    raw_animal_pages = run_sql("""
        SELECT p.id, p.name, count(i.id)::int as cnt
        FROM ztteam_pages p
        JOIN ztteam_page_sources ps ON p.id = ps.page_id
        LEFT JOIN ztteam_images i ON p.id = i.page_id
        WHERE ps.target_site_id = '3d6b8858-7937-45a0-b39b-a2e2b0de4310' AND p.is_active = true
        GROUP BY p.id, p.name
        ORDER BY cnt ASC, p.name ASC;
    """)

    animal_pages = []
    for line in raw_animal_pages.split("\n"):
        if not line:
            continue
        p_id, p_name, cnt = line.split("|")
        animal_pages.append({"id": p_id, "name": p_name, "count": int(cnt)})

    print(f"- Tim thay {len(animal_pages)} Fanpage Dong vat active.")

    raw_animal_posts = run_sql("""
        SELECT id, wp_post_url
        FROM ztteam_images
        WHERE page_id IS NULL AND wp_post_url LIKE '%an.imsb%'
        ORDER BY created_at ASC;
    """)

    animal_posts = []
    for line in raw_animal_posts.split("\n"):
        if not line:
            continue
        parts = line.split("|")
        animal_posts.append({"id": parts[0], "url": parts[1]})

    print(f"- Tim thay {len(animal_posts)} bai Dong vat chua gan page_id.\n")

    animal_assigned = 0
    for post in animal_posts:
        animal_pages.sort(key=lambda p: (p["count"], p["name"]))
        target_page = animal_pages[0]

        comment_text = get_random_news_comment(post["url"])
        escaped_comment = comment_text.replace("'", "''")

        run_sql(f"""
            UPDATE ztteam_images
            SET page_id = '{target_page["id"]}',
                ai_first_comment = '{escaped_comment}',
                ai_caption = regexp_replace(ai_caption, '\\.\\.\\.\\s*FULL STORY IN THE COMMENT.*', '...Full story in the comments', 'i'),
                video_status = CASE WHEN video_status = 'FAILED' THEN 'PENDING' ELSE video_status END,
                error_log = NULL,
                updated_at = NOW()
            WHERE id = '{post["id"]}';
        """)

        target_page["count"] += 1
        animal_assigned += 1

    print(f"=> DA GAN THANH CONG {animal_assigned} BAI DONG VAT VAO 15 FANPAGE DONG VAT!\n")

    # ---------------------------------------------------------
    # TONG KET KET QUA
    # ---------------------------------------------------------
    print("=" * 60)
    print("BANG PHAN BO CHI TIET SAU KHI GAN:")
    print("=" * 60)
    print("-- Nhom Tin tuc (26 Fanpages):")
    for p in sorted(news_pages, key=lambda x: x["name"]):
        print(f"  * {p['name'].ljust(40)}: {p['count']} bai")

    print("\n-- Nhom Dong vat (15 Fanpages):")
    for p in sorted(animal_pages, key=lambda x: x["name"]):
        print(f"  * {p['name'].ljust(40)}: {p['count']} bai")

    remaining = run_sql("SELECT count(*) FROM ztteam_images WHERE page_id IS NULL;")
    print(f"\n=> SO BAI CON LAI CO page_id IS NULL: {remaining}")

if __name__ == "__main__":
    main()
