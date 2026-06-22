/**
 * RAG 检索接口占位：
 * 本期仅返回模拟数据，后续可接入向量库（Milvus/pgvector）。
 */
export async function retrieveKnowledgeByMoodAndPreference() {
  return [
    { chunkId: 'c1', content: '安静治愈类景点在工作日午后体验更佳' },
    { chunkId: 'c2', content: '情绪低落用户优先推荐自然风光与慢节奏咖啡馆' }
  ]
}
