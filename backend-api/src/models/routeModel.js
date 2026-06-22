import { getDb } from './db.js'

function toJsonValue(value, fallback) {
  return JSON.stringify(value ?? fallback)
}

export async function createRoute(connection, payload) {
  const [result] = await connection.query(
    'INSERT INTO routes (user_id, title, subtitle, detail_json, source_type) VALUES (?, ?, ?, ?, ?)',
    [payload.userId, payload.title, payload.subtitle, toJsonValue(payload.detail, {}), payload.sourceType]
  )
  return result.insertId
}

export async function createRouteRunTx(connection, payload) {
  const resultJson = payload.outputJson
    ? toJsonValue({ ...payload.outputJson, consumedBeans: payload.consumedBeans || 0 }, {})
    : null
  const [result] = await connection.query(
    `INSERT INTO route_generation_runs (user_id, source_type, status, request_json, result_json, error_message, route_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.userId,
      payload.sourceType,
      payload.status || 'running',
      toJsonValue(payload.inputJson, {}),
      resultJson,
      payload.error || '',
      payload.routeId || null
    ]
  )
  return result.insertId ?? null
}

export async function updateRouteRunTx(connection, runId, payload) {
  const resultJson = payload.outputJson
    ? toJsonValue({ ...payload.outputJson, consumedBeans: payload.consumedBeans || 0 }, {})
    : null
  const [result] = await connection.query(
    'UPDATE route_generation_runs SET status = ?, result_json = ?, error_message = ?, route_id = ? WHERE id = ?',
    [payload.status, resultJson, payload.error || '', payload.routeId || null, runId]
  )
  return result.affectedRows > 0 ? { id: runId } : null
}

export async function createRouteStopsTx(connection, routeId, spots = []) {
  const createdStops = []
  for (const [index, spot] of spots.entries()) {
    const [result] = await connection.query(
      'INSERT INTO route_stops (route_id, spot_id, stop_order, title, lat, lng, detail_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        routeId,
        spot.spotId || null,
        spot.order || index + 1,
        spot.name || spot.title || `第 ${index + 1} 站`,
        spot.lat ?? null,
        spot.lng ?? null,
        toJsonValue(spot, {})
      ]
    )
    createdStops.push({ id: result.insertId, spot_id: spot.spotId || null, stop_order: spot.order || index + 1 })
  }
  return createdStops
}

export async function createRouteLegsTx(connection, routeId, connections = []) {
  const [stopRows] = await connection.query(
    'SELECT id, spot_id, stop_order FROM route_stops WHERE route_id = ? ORDER BY stop_order ASC',
    [routeId]
  )
  const stopBySpotId = new Map(stopRows.filter((stop) => stop.spot_id).map((stop) => [Number(stop.spot_id), stop.id]))

  for (const [index, leg] of connections.entries()) {
    await connection.query(
      `INSERT INTO route_legs (route_id, from_stop_id, to_stop_id, leg_order, distance_meter, duration_min, transport_mode, detail_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        routeId,
        stopBySpotId.get(Number(leg.fromSpotId)) || stopRows[index]?.id || null,
        stopBySpotId.get(Number(leg.toSpotId)) || stopRows[index + 1]?.id || null,
        leg.order || index + 1,
        (leg.distanceMeters ?? Math.round((leg.distanceKm || 0) * 1000)) || null,
        leg.durationMinute ?? leg.durationMin ?? null,
        leg.transport || leg.transportMode || '',
        toJsonValue(leg, {})
      ]
    )
  }
}

export async function getRouteList(userId) {
  const [rows] = await getDb().query(
    'SELECT id, title, subtitle, source_type, created_at FROM routes WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  )
  return rows
}

export async function getRouteDetail(userId, routeId) {
  const [rows] = await getDb().query(
    'SELECT * FROM routes WHERE id = ? AND user_id = ? LIMIT 1',
    [routeId, userId]
  )
  return rows[0] || null
}

export async function deleteRouteById(userId, routeId) {
  const [result] = await getDb().query(
    'DELETE FROM routes WHERE id = ? AND user_id = ?',
    [routeId, userId]
  )
  return result.affectedRows > 0 ? { id: routeId } : null
}
