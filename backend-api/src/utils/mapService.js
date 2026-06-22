/**
 * 地图 POI / 距离矩阵服务占位：
 * 本期返回模拟数据，后续可替换为高德/腾讯地图 API。
 */
export async function getPoiAndDistanceMatrix() {
  return {
    pois: [
      { id: 1, name: '林间步道', lat: 31.2304, lng: 121.4737 },
      { id: 2, name: '疗愈咖啡馆', lat: 31.228, lng: 121.479 }
    ],
    matrix: [
      [0, 1800],
      [1800, 0]
    ]
  }
}
