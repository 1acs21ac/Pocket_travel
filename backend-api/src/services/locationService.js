const QQ_MAP_KEY = process.env.QQ_MAP_KEY || ''

export async function reverseGeocode(lat, lng) {
  if (!QQ_MAP_KEY) {
    return {
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      formatted_addresses: { recommend: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }
    }
  }
  
  const url = `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=${QQ_MAP_KEY}&get_poi=1`
  
  const response = await fetch(url)
  const data = await response.json()
  
  if (data.status !== 0) {
    throw new Error(data.message || '逆地理编码失败')
  }
  
  return data.result
}
