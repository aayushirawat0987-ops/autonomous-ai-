-- CreateTable
CREATE TABLE "ImprovementAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "scores" TEXT NOT NULL,
    "weaknesses" TEXT NOT NULL,
    "improvementSuggestions" TEXT NOT NULL,
    "finalDecision" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImprovementAttempt_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
