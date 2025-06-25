-- CreateIndex
CREATE UNIQUE INDEX "Follower_leaderId_followerId_key" ON "Follower"("leaderId", "followerId"); 