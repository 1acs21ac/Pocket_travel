import { getDb } from './db.js'

function toJsonParam(value) {
  if (value === null || value === undefined) return '{}'
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export async function upsertOfficialContentImport({ provider, externalId, contentType, title = '', sourceUrl = '', payloadJson = {} }) {
  const [result] = await getDb().query(
    `INSERT INTO official_content_imports (provider, external_id, content_type, title, source_url, payload_json, imported_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       source_url = VALUES(source_url),
       payload_json = VALUES(payload_json),
       imported_at = NOW()`,
    [provider, externalId, contentType, title, sourceUrl, toJsonParam(payloadJson)]
  )
  return { affected: result.affectedRows, id: result.insertId }
}

export async function upsertSpotProviderRef({ spotId, provider, externalId, sourceUrl = '', payloadJson = {} }) {
  const [result] = await getDb().query(
    `INSERT INTO spot_provider_refs (spot_id, provider, external_id, source_url, payload_json)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       spot_id = VALUES(spot_id),
       source_url = VALUES(source_url),
       payload_json = VALUES(payload_json)`,
    [spotId, provider, externalId, sourceUrl, toJsonParam(payloadJson)]
  )
  return { affected: result.affectedRows, id: result.insertId }
}

export async function importOfficialContentBatch({ imports = [], spotProviderRefs = [] }) {
  const importedContents = []
  const providerRefs = []

  for (const item of imports) {
    importedContents.push(await upsertOfficialContentImport(item))
  }

  for (const ref of spotProviderRefs) {
    providerRefs.push(await upsertSpotProviderRef(ref))
  }

  return { importedContents, providerRefs }
}
