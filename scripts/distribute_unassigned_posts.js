const { execSync } = require('child_process');

/**
 * ZTTeam: Script phan bo toan bo 141 bai viet chua co page_id vao dung cac Fanpage da chon
 * - 88 bai Tin tuc (mv.imsb.info) -> 26 Fanpage Tin tuc (kem First Comment chuan bao chi)
 * - 53 bai Dong vat (an.imsb.info) -> 15 Fanpage Dong vat
 */

const NEWS_COMMENT_PREFIXES = [
  'Full story:',
  'Read more:',
  'Full report:',
  'Details:',
  'Read the full story:',
  'Read more here:'
];

function getRandomNewsComment(url) {
  const prefix = NEWS_COMMENT_PREFIXES[Math.floor(Math.random() * NEWS_COMMENT_PREFIXES.length)];
  return `${prefix} ${url}`;
}

function runSql(sql) {
  const escaped = sql.replace(/"/g, '\\"');
  const res = execSync(`docker exec -i ztreel3_postgres_prod psql -U root -d ztreel -t -A -F"|" -c "${escaped}"`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });
  return res.trim();
}

async function main() {
  console.log('====================================================');
  console.log('ZTTeam: Bat dau phan bo 141 bai viet ton dong...');
  console.log('====================================================\n');

  /** ----------------------------------------------------
   * PHAN 1: PHAN BO BAI VIET TIN TUC (mv.imsb.info)
   * ---------------------------------------------------- */
  console.log('>>> [PHAN 1] XU LY BAI VIET TIN TUC (mv.imsb.info)...');

  // 1. Lay danh sach 26 Fanpage Tin tuc kem so luong bai hien tai
  const newsPagesRaw = runSql(`
    SELECT p.id, p.name, count(i.id)::int as cnt
    FROM ztteam_pages p
    JOIN ztteam_page_sources ps ON p.id = ps.page_id
    LEFT JOIN ztteam_images i ON p.id = i.page_id
    WHERE ps.target_site_id = 'c83fef00-5d07-4f42-8a05-a9e74445b590' AND p.is_active = true
    GROUP BY p.id, p.name
    ORDER BY cnt ASC, p.name ASC;
  `);

  const newsPages = newsPagesRaw.split('\n').filter(Boolean).map(line => {
    const [id, name, cnt] = line.split('|');
    return { id, name, count: parseInt(cnt, 10) || 0 };
  });

  console.log(`- Tim thay ${newsPages.length} Fanpage Tin tuc active.`);

  // 2. Lay danh sach cac bai tin tuc chua co page_id
  const unassignedNewsRaw = runSql(`
    SELECT id, wp_post_url
    FROM ztteam_images
    WHERE page_id IS NULL AND wp_post_url LIKE '%mv.imsb%'
    ORDER BY created_at ASC;
  `);

  const unassignedNews = unassignedNewsRaw.split('\n').filter(Boolean).map(line => {
    const [id, url] = line.split('|');
    return { id, url };
  });

  console.log(`- Tim thay ${unassignedNews.length} bai Tin tuc chua gan page_id.\n`);

  let newsAssignedCount = 0;
  for (const post of unassignedNews) {
    // Sap xep de chon page co it bai nhat (Least-Loaded Round Robin)
    newsPages.sort((a, b) => a.count - b.count);
    const targetPage = newsPages[0];

    const commentText = getRandomNewsComment(post.url);
    const escapedComment = commentText.replace(/'/g, "''");

    runSql(`
      UPDATE ztteam_images
      SET page_id = '${targetPage.id}',
          ai_first_comment = '${escapedComment}',
          updated_at = NOW()
      WHERE id = '${post.id}';
    `);

    targetPage.count += 1;
    newsAssignedCount += 1;
  }
  console.log(`=> DA GAN THANH CONG ${newsAssignedCount} BAI TIN TUC VAO 26 FANPAGE NEWS!\n`);

  /** ----------------------------------------------------
   * PHAN 2: PHAN BO BAI VIET DONG VAT (an.imsb.info)
   * ---------------------------------------------------- */
  console.log('>>> [PHAN 2] XU LY BAI VIET DONG VAT (an.imsb.info)...');

  // 1. Lay danh sach 15 Fanpage Dong vat kem so luong bai hien tai
  const animalPagesRaw = runSql(`
    SELECT p.id, p.name, count(i.id)::int as cnt
    FROM ztteam_pages p
    JOIN ztteam_page_sources ps ON p.id = ps.page_id
    LEFT JOIN ztteam_images i ON p.id = i.page_id
    WHERE ps.target_site_id = '3d6b8858-7937-45a0-b39b-a2e2b0de4310' AND p.is_active = true
    GROUP BY p.id, p.name
    ORDER BY cnt ASC, p.name ASC;
  `);

  const animalPages = animalPagesRaw.split('\n').filter(Boolean).map(line => {
    const [id, name, cnt] = line.split('|');
    return { id, name, count: parseInt(cnt, 10) || 0 };
  });

  console.log(`- Tim thay ${animalPages.length} Fanpage Dong vat active.`);

  // 2. Lay danh sach cac bai dong vat chua co page_id
  const unassignedAnimalRaw = runSql(`
    SELECT id, wp_post_url
    FROM ztteam_images
    WHERE page_id IS NULL AND wp_post_url LIKE '%an.imsb%'
    ORDER BY created_at ASC;
  `);

  const unassignedAnimals = unassignedAnimalRaw.split('\n').filter(Boolean).map(line => {
    const [id, url] = line.split('|');
    return { id, url };
  });

  console.log(`- Tim thay ${unassignedAnimals.length} bai Dong vat chua gan page_id.\n`);

  let animalAssignedCount = 0;
  for (const post of unassignedAnimals) {
    animalPages.sort((a, b) => a.count - b.count);
    const targetPage = animalPages[0];

    const commentText = getRandomNewsComment(post.url);
    const escapedComment = commentText.replace(/'/g, "''");

    runSql(`
      UPDATE ztteam_images
      SET page_id = '${targetPage.id}',
          ai_first_comment = '${escapedComment}',
          updated_at = NOW()
      WHERE id = '${post.id}';
    `);

    targetPage.count += 1;
    animalAssignedCount += 1;
  }
  console.log(`=> DA GAN THANH CONG ${animalAssignedCount} BAI DONG VAT VAO 15 FANPAGE DONG VAT!\n`);

  /** ----------------------------------------------------
   * TONG KET KET QUA PHAN BO
   * ---------------------------------------------------- */
  console.log('====================================================');
  console.log('BANG PHAN BO CHI TIET SAU KHI GAN:');
  console.log('====================================================');
  console.log('-- Nhom Tin tuc (26 Fanpages):');
  newsPages.forEach(p => console.log(`  * ${p.name.padEnd(40)}: ${p.count} bai`));

  console.log('\n-- Nhom Dong vat (15 Fanpages):');
  animalPages.forEach(p => console.log(`  * ${p.name.padEnd(40)}: ${p.count} bai`));

  // Kiem tra lai so luong page_id IS NULL con lai trong database
  const remainingNull = runSql(`SELECT count(*) FROM ztteam_images WHERE page_id IS NULL;`);
  console.log(`\n=> SO BAI CON LAI CO page_id IS NULL: ${remainingNull}`);
}

main().catch(err => {
  console.error('Loi thuc thi:', err.message);
  process.exit(1);
});
