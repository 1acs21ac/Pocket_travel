import { getDb } from './db.js'

export async function saveMoodProfile(userId, answers, moodTags) {
  await getDb().query(
    `INSERT INTO mood_profiles (user_id, answers_json, mood_tags_json, updated_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       answers_json = VALUES(answers_json),
       mood_tags_json = VALUES(mood_tags_json),
       updated_at = NOW()`,
    [userId, JSON.stringify(answers), JSON.stringify(moodTags)]
  )
}

export async function getMoodProfile(userId) {
  const [rows] = await getDb().query('SELECT * FROM mood_profiles WHERE user_id = ? LIMIT 1', [userId])
  return rows[0] || null
}
