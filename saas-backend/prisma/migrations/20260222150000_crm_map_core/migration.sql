-- CRM map core: сброс прежних таблиц этого сервиса (dev / чистая среда).
-- Для продакшена с данными — бэкап и отдельный план переноса, не запускать вслепую.

DROP TABLE IF EXISTS "Comment" CASCADE;
DROP TABLE IF EXISTS "Location" CASCADE;
DROP TABLE IF EXISTS "Project" CASCADE;
DROP TABLE IF EXISTS "Status" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Status" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Status_key_key" ON "Status"("key");
CREATE INDEX "Status_order_idx" ON "Status"("order");

CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Project_userId_idx" ON "Project"("userId");
CREATE INDEX "Project_userId_updatedAt_idx" ON "Project"("userId", "updatedAt" DESC);

CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "lat" DECIMAL(10,7) NOT NULL,
    "lng" DECIMAL(10,7) NOT NULL,
    "statusId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "nextVisitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Location_projectId_statusId_idx" ON "Location"("projectId", "statusId");
CREATE INDEX "Location_projectId_assignedToId_idx" ON "Location"("projectId", "assignedToId");
CREATE INDEX "Location_projectId_nextVisitAt_idx" ON "Location"("projectId", "nextVisitAt");
CREATE INDEX "Location_statusId_idx" ON "Location"("statusId");
CREATE INDEX "Location_assignedToId_idx" ON "Location"("assignedToId");
CREATE INDEX "Location_projectId_lat_idx" ON "Location"("projectId", "lat");
CREATE INDEX "Location_projectId_lng_idx" ON "Location"("projectId", "lng");
CREATE INDEX "Location_projectId_createdAt_id_idx" ON "Location"("projectId", "createdAt" DESC, "id" DESC);

ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Location" ADD CONSTRAINT "Location_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Location" ADD CONSTRAINT "Location_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Location" ADD CONSTRAINT "Location_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Comment_locationId_idx" ON "Comment"("locationId");
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");
CREATE INDEX "Comment_locationId_createdAt_idx" ON "Comment"("locationId", "createdAt" DESC);

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
