import { prisma } from '../../lib/prisma';
import { ollamaProvider } from '../../ai/ollama.provider';

export const ragService = {
  async embedText(text: string): Promise<number[]> {
    return ollamaProvider.embed(text);
  },

  async storeIncidentEmbedding(incidentId: string): Promise<void> {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      select: { title: true, description: true },
    });
    if (!incident) return;
    const text = `${incident.title}. ${incident.description}`;
    const embedding = await this.embedText(text);
    const vectorStr = `[${embedding.join(',')}]`;
    await prisma.$executeRaw`
      INSERT INTO "IncidentEmbedding" ("incidentId", embedding)
      VALUES (${incidentId}, ${vectorStr}::vector)
      ON CONFLICT ("incidentId") DO UPDATE SET embedding = ${vectorStr}::vector
    `;
  },

  async findSimilarIncidents(incidentId: string, limit = 5): Promise<Array<{ id: string; ref: string; title: string; similarity: number }>> {
    const results = await prisma.$queryRaw<Array<{ id: string; ref: string; title: string; similarity: number }>>`
      SELECT i."incidentId" AS id, inc.ref, inc.title,
             1 - (ie.embedding <=> (SELECT embedding FROM "IncidentEmbedding" WHERE "incidentId" = ${incidentId})) AS similarity
      FROM "IncidentEmbedding" ie
      JOIN "Incident" inc ON inc.id = ie."incidentId"
      WHERE ie."incidentId" != ${incidentId}
      ORDER BY ie.embedding <=> (SELECT embedding FROM "IncidentEmbedding" WHERE "incidentId" = ${incidentId})
      LIMIT ${limit}
    `;
    return results.map((r) => ({ ...r, similarity: Math.round(r.similarity * 100) / 100 }));
  },

  async storeArticleEmbedding(articleId: string, content: string, chunkIndex = 0): Promise<void> {
    const embedding = await this.embedText(content);
    if (embedding.length === 0) {
      logger.warn({ articleId }, 'Empty embedding returned — skipping');
      return;
    }
    const vectorStr = `[${embedding.join(',')}]`;
    await prisma.$executeRaw`
      INSERT INTO "KnowledgeEmbedding" ("articleId", "chunkIndex", content, embedding)
      VALUES (${articleId}, ${chunkIndex}, ${content}, ${vectorStr}::vector)
      ON CONFLICT ("articleId", "chunkIndex") DO UPDATE SET embedding = ${vectorStr}::vector, content = ${content}
    `;
  },

  async searchKnowledge(query: string, limit = 5): Promise<Array<{ articleId: string; title: string; content: string; similarity: number }>> {
    const embedding = await this.embedText(query);
    const vectorStr = `[${embedding.join(',')}]`;
    const results = await prisma.$queryRaw<Array<{ articleId: string; title: string; content: string; similarity: number }>>`
      SELECT ke."articleId", ka.title, ke.content,
             1 - (ke.embedding <=> ${vectorStr}::vector) AS similarity
      FROM "KnowledgeEmbedding" ke
      JOIN "KnowledgeArticle" ka ON ka.id = ke."articleId"
      WHERE ka.status = 'PUBLISHED'
      ORDER BY ke.embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `;
    return results.map((r) => ({ ...r, similarity: Math.round(r.similarity * 100) / 100 }));
  },

  async askQuestion(question: string): Promise<{ answer: string; sources: Array<{ title: string; similarity: number }> }> {
    const sources = await this.searchKnowledge(question, 4);
    if (sources.length === 0) {
      return { answer: 'I could not find relevant documentation in the knowledge base. Please try rephrasing your question or contact a technician.', sources: [] };
    }
    const context = sources.map((s, i) => `[Source ${i + 1}: ${s.title}]\n${s.content}`).join('\n\n');
    const prompt = `You are an IT support assistant. Answer the following question using ONLY the provided sources. If the sources do not contain enough information, say so clearly. Always cite sources by name.

Sources:
${context}

Question: ${question}

Provide a concise, helpful answer with citations.`;
    try {
      const response = await ollamaProvider.chat(prompt);
      return { answer: response, sources: sources.map((s) => ({ title: s.title, similarity: s.similarity })) };
    } catch (err) {
      // If AI model is too slow/unavailable, return sources as fallback
      const sourceList = sources.map((s) => `- ${s.title}`).join('\n');
      return {
        answer: `I found these relevant articles that may help:\n${sourceList}\n\n(The AI assistant is currently slow — try again in a moment for a generated answer.)`,
        sources: sources.map((s) => ({ title: s.title, similarity: s.similarity })),
      };
    }
  },
};
