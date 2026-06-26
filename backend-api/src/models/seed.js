import { getDb } from './db.js'

const SPOTS_DATA = [
  {
    name: '愚园路',
    lat: 31.220,
    lng: 121.440,
    detail_json: JSON.stringify({
      description: '梧桐树下的海派风情，百年老街焕新颜',
      openTime: '全天开放',
      ticketInfo: '免费',
      images: []
    })
  },
  {
    name: '武康路',
    lat: 31.207,
    lng: 121.436,
    detail_json: JSON.stringify({
      description: '上海最网红的历史街区，武康大楼必打卡',
      openTime: '全天开放',
      ticketInfo: '免费',
      images: []
    })
  },
  {
    name: '复兴公园',
    lat: 31.228,
    lng: 121.465,
    detail_json: JSON.stringify({
      description: '梧桐树下，安静治愈的城市绿洲',
      openTime: '6:00-18:00',
      ticketInfo: '免费',
      images: []
    })
  },
  {
    name: '思南公园',
    lat: 31.222,
    lng: 121.470,
    detail_json: JSON.stringify({
      description: '百年梧桐，适合发呆的文艺街区',
      openTime: '全天开放',
      ticketInfo: '免费',
      images: []
    })
  },
  {
    name: '安福路',
    lat: 31.217,
    lng: 121.450,
    detail_json: JSON.stringify({
      description: '上海最洋气的街区，咖啡买手店云集',
      openTime: '全天开放',
      ticketInfo: '免费',
      images: []
    })
  },
  {
    name: '徐汇滨江',
    lat: 31.198,
    lng: 121.472,
    detail_json: JSON.stringify({
      description: '魔都最佳日落机位，黄浦江畔的浪漫',
      openTime: '全天开放',
      ticketInfo: '免费',
      images: []
    })
  }
]

export async function seedSpots() {
  const db = getDb()

  for (const spot of SPOTS_DATA) {
    try {
      await db.query(
        `INSERT IGNORE INTO spots (name, lat, lng, detail_json)
         SELECT ?, ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name = ?)`,
        [spot.name, spot.lat, spot.lng, spot.detail_json, spot.name]
      )
    } catch (error) {
      console.error(`Failed to seed spot ${spot.name}:`, error.message)
    }
  }

  console.log('Seeded spots:', SPOTS_DATA.length)
}

export async function seedUserDemoData(userId) {
  const db = getDb()
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    // 获取一个示例景点ID
    const [spots] = await connection.query('SELECT id, name FROM spots LIMIT 1')
    if (spots.length === 0) {
      console.log('No spots found, skipping user demo data')
      await connection.commit()
      return
    }

    const spotId = spots[0].id
    const spotName = spots[0].name

    // 检查用户是否已有打卡记录
    const [existingCheckins] = await connection.query(
      'SELECT id FROM checkins WHERE user_id = ? LIMIT 1',
      [userId]
    )

    if (existingCheckins.length === 0) {
      // 添加示例打卡记录
      await connection.query(
        `INSERT INTO checkins (user_id, spot_id, distance_meter, photos_json, dry_tags_json, content, created_at)
         VALUES (?, ?, 120, '[]', '["安静治愈"]', '这里的梧桐树真的很适合一个人发呆', DATE_SUB(NOW(), INTERVAL 1 DAY))`,
        [userId, spotId]
      )

      // 添加示例打卡评论
      await connection.query(
        `INSERT INTO comments (user_id, spot_id, rating, content, like_count, created_at)
         VALUES (?, ?, 5, '进门左转第三个窗户光线最好，适合拍逆光照片~', 5, DATE_SUB(NOW(), INTERVAL 12 HOUR))`,
        [userId, spotId]
      )
    }

    await connection.commit()
    console.log('Seeded user demo data for userId:', userId)
  } catch (error) {
    await connection.rollback()
    console.error('Failed to seed user demo data:', error.message)
  } finally {
    connection.release()
  }
}

export async function seedAll() {
  await seedSpots()
}
