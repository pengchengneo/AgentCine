-- CreateTable
CREATE TABLE `account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    INDEX `account_userId_idx`(`userId`),
    UNIQUE INDEX `account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_appearances` (
    `id` VARCHAR(191) NOT NULL,
    `characterId` VARCHAR(191) NOT NULL,
    `appearanceIndex` INTEGER NOT NULL,
    `changeReason` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `descriptions` TEXT NULL,
    `imageUrl` TEXT NULL,
    `imageUrls` TEXT NULL,
    `selectedIndex` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `previousImageUrl` TEXT NULL,
    `previousImageUrls` TEXT NULL,
    `previousDescription` TEXT NULL,
    `previousDescriptions` TEXT NULL,
    `imageMediaId` VARCHAR(191) NULL,

    INDEX `character_appearances_characterId_idx`(`characterId`),
    INDEX `character_appearances_imageMediaId_idx`(`imageMediaId`),
    UNIQUE INDEX `character_appearances_characterId_appearanceIndex_key`(`characterId`, `appearanceIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `location_images` (
    `id` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `imageIndex` INTEGER NOT NULL,
    `description` TEXT NULL,
    `imageUrl` TEXT NULL,
    `isSelected` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `previousImageUrl` TEXT NULL,
    `previousDescription` TEXT NULL,
    `imageMediaId` VARCHAR(191) NULL,

    INDEX `location_images_locationId_idx`(`locationId`),
    INDEX `location_images_imageMediaId_idx`(`imageMediaId`),
    UNIQUE INDEX `location_images_locationId_imageIndex_key`(`locationId`, `imageIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `novel_promotion_characters` (
    `id` VARCHAR(191) NOT NULL,
    `novelPromotionProjectId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `aliases` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `customVoiceUrl` TEXT NULL,
    `customVoiceMediaId` VARCHAR(191) NULL,
    `voiceId` VARCHAR(191) NULL,
    `voiceType` VARCHAR(191) NULL,
    `profileData` TEXT NULL,
    `profileConfirmed` BOOLEAN NOT NULL DEFAULT false,
    `introduction` TEXT NULL,
    `sourceGlobalCharacterId` VARCHAR(191) NULL,
    `promptFragment` TEXT NULL,
    `assetStatus` VARCHAR(191) NOT NULL DEFAULT 'draft',

    INDEX `novel_promotion_characters_novelPromotionProjectId_idx`(`novelPromotionProjectId`),
    INDEX `novel_promotion_characters_customVoiceMediaId_idx`(`customVoiceMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `novel_promotion_locations` (
    `id` VARCHAR(191) NOT NULL,
    `novelPromotionProjectId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `summary` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sourceGlobalLocationId` VARCHAR(191) NULL,
    `promptFragment` TEXT NULL,
    `assetStatus` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `selectedImageId` VARCHAR(191) NULL,

    INDEX `novel_promotion_locations_novelPromotionProjectId_idx`(`novelPromotionProjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `novel_promotion_episodes` (
    `id` VARCHAR(191) NOT NULL,
    `novelPromotionProjectId` VARCHAR(191) NOT NULL,
    `episodeNumber` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `novelText` TEXT NULL,
    `audioUrl` TEXT NULL,
    `audioMediaId` VARCHAR(191) NULL,
    `srtContent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `speakerVoices` TEXT NULL,

    INDEX `novel_promotion_episodes_novelPromotionProjectId_idx`(`novelPromotionProjectId`),
    INDEX `novel_promotion_episodes_audioMediaId_idx`(`audioMediaId`),
    UNIQUE INDEX `novel_promotion_episodes_novelPromotionProjectId_episodeNumb_key`(`novelPromotionProjectId`, `episodeNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `video_editor_projects` (
    `id` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NOT NULL,
    `projectData` TEXT NOT NULL,
    `renderStatus` VARCHAR(191) NULL,
    `renderTaskId` VARCHAR(191) NULL,
    `outputUrl` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `video_editor_projects_episodeId_key`(`episodeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `novel_promotion_clips` (
    `id` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NOT NULL,
    `start` INTEGER NULL,
    `end` INTEGER NULL,
    `duration` INTEGER NULL,
    `summary` TEXT NOT NULL,
    `location` TEXT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `characters` TEXT NULL,
    `endText` TEXT NULL,
    `shotCount` INTEGER NULL,
    `startText` TEXT NULL,
    `screenplay` TEXT NULL,

    INDEX `novel_promotion_clips_episodeId_idx`(`episodeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `novel_promotion_panels` (
    `id` VARCHAR(191) NOT NULL,
    `storyboardId` VARCHAR(191) NOT NULL,
    `panelIndex` INTEGER NOT NULL,
    `panelNumber` INTEGER NULL,
    `shotType` TEXT NULL,
    `cameraMove` TEXT NULL,
    `description` TEXT NULL,
    `location` TEXT NULL,
    `characters` TEXT NULL,
    `srtSegment` TEXT NULL,
    `srtStart` DOUBLE NULL,
    `srtEnd` DOUBLE NULL,
    `duration` DOUBLE NULL,
    `imagePrompt` TEXT NULL,
    `imageUrl` TEXT NULL,
    `imageMediaId` VARCHAR(191) NULL,
    `imageHistory` TEXT NULL,
    `videoPrompt` TEXT NULL,
    `firstLastFramePrompt` TEXT NULL,
    `videoUrl` TEXT NULL,
    `videoGenerationMode` TEXT NULL,
    `videoMediaId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sceneType` VARCHAR(191) NULL,
    `candidateImages` TEXT NULL,
    `linkedToNextPanel` BOOLEAN NOT NULL DEFAULT false,
    `lipSyncTaskId` VARCHAR(191) NULL,
    `lipSyncVideoUrl` VARCHAR(191) NULL,
    `lipSyncVideoMediaId` VARCHAR(191) NULL,
    `sketchImageUrl` TEXT NULL,
    `sketchImageMediaId` VARCHAR(191) NULL,
    `photographyRules` TEXT NULL,
    `actingNotes` TEXT NULL,
    `previousImageUrl` TEXT NULL,
    `previousImageMediaId` VARCHAR(191) NULL,

    INDEX `novel_promotion_panels_storyboardId_idx`(`storyboardId`),
    INDEX `novel_promotion_panels_imageMediaId_idx`(`imageMediaId`),
    INDEX `novel_promotion_panels_videoMediaId_idx`(`videoMediaId`),
    INDEX `novel_promotion_panels_lipSyncVideoMediaId_idx`(`lipSyncVideoMediaId`),
    INDEX `novel_promotion_panels_sketchImageMediaId_idx`(`sketchImageMediaId`),
    INDEX `novel_promotion_panels_previousImageMediaId_idx`(`previousImageMediaId`),
    UNIQUE INDEX `novel_promotion_panels_storyboardId_panelIndex_key`(`storyboardId`, `panelIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `novel_promotion_projects` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `analysisModel` VARCHAR(191) NULL,
    `imageModel` VARCHAR(191) NULL,
    `videoModel` VARCHAR(191) NULL,
    `audioModel` VARCHAR(191) NULL,
    `videoRatio` VARCHAR(191) NOT NULL DEFAULT '9:16',
    `ttsRate` VARCHAR(191) NOT NULL DEFAULT '+50%',
    `globalAssetText` TEXT NULL,
    `artStyle` VARCHAR(191) NOT NULL DEFAULT 'american-comic',
    `artStylePrompt` TEXT NULL,
    `characterModel` VARCHAR(191) NULL,
    `locationModel` VARCHAR(191) NULL,
    `storyboardModel` VARCHAR(191) NULL,
    `editModel` VARCHAR(191) NULL,
    `videoResolution` VARCHAR(191) NOT NULL DEFAULT '720p',
    `capabilityOverrides` TEXT NULL,
    `workflowMode` VARCHAR(191) NOT NULL DEFAULT 'srt',
    `lastEpisodeId` VARCHAR(191) NULL,
    `imageResolution` VARCHAR(191) NOT NULL DEFAULT '2K',
    `importStatus` VARCHAR(191) NULL,
    `pipelineMode` VARCHAR(191) NOT NULL DEFAULT 'manual',

    UNIQUE INDEX `novel_promotion_projects_projectId_key`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `novel_promotion_shots` (
    `id` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NOT NULL,
    `clipId` VARCHAR(191) NULL,
    `shotId` VARCHAR(191) NOT NULL,
    `srtStart` INTEGER NOT NULL,
    `srtEnd` INTEGER NOT NULL,
    `srtDuration` DOUBLE NOT NULL,
    `sequence` TEXT NULL,
    `locations` TEXT NULL,
    `characters` TEXT NULL,
    `plot` TEXT NULL,
    `imagePrompt` TEXT NULL,
    `scale` TEXT NULL,
    `module` TEXT NULL,
    `focus` TEXT NULL,
    `zhSummarize` TEXT NULL,
    `imageUrl` TEXT NULL,
    `imageMediaId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pov` TEXT NULL,

    INDEX `novel_promotion_shots_clipId_idx`(`clipId`),
    INDEX `novel_promotion_shots_episodeId_idx`(`episodeId`),
    INDEX `novel_promotion_shots_shotId_idx`(`shotId`),
    INDEX `novel_promotion_shots_imageMediaId_idx`(`imageMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `novel_promotion_storyboards` (
    `id` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NOT NULL,
    `clipId` VARCHAR(191) NOT NULL,
    `storyboardImageUrl` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `panelCount` INTEGER NOT NULL DEFAULT 9,
    `storyboardTextJson` TEXT NULL,
    `imageHistory` TEXT NULL,
    `candidateImages` TEXT NULL,
    `lastError` VARCHAR(191) NULL,
    `photographyPlan` TEXT NULL,

    UNIQUE INDEX `novel_promotion_storyboards_clipId_key`(`clipId`),
    INDEX `novel_promotion_storyboards_clipId_idx`(`clipId`),
    INDEX `novel_promotion_storyboards_episodeId_idx`(`episodeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplementary_panels` (
    `id` VARCHAR(191) NOT NULL,
    `storyboardId` VARCHAR(191) NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `sourcePanelId` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `imagePrompt` TEXT NULL,
    `imageUrl` TEXT NULL,
    `imageMediaId` VARCHAR(191) NULL,
    `characters` TEXT NULL,
    `location` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `supplementary_panels_storyboardId_idx`(`storyboardId`),
    INDEX `supplementary_panels_imageMediaId_idx`(`imageMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `mode` VARCHAR(191) NOT NULL DEFAULT 'novel-promotion',
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastAccessedAt` DATETIME(3) NULL,

    INDEX `projects_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    INDEX `session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usage_costs` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `apiType` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `cost` DECIMAL(18, 6) NOT NULL,
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `usage_costs_apiType_idx`(`apiType`),
    INDEX `usage_costs_createdAt_idx`(`createdAt`),
    INDEX `usage_costs_projectId_idx`(`projectId`),
    INDEX `usage_costs_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `emailVerified` DATETIME(3) NULL,
    `image` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_preferences` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `analysisModel` VARCHAR(191) NULL,
    `characterModel` VARCHAR(191) NULL,
    `locationModel` VARCHAR(191) NULL,
    `storyboardModel` VARCHAR(191) NULL,
    `editModel` VARCHAR(191) NULL,
    `videoModel` VARCHAR(191) NULL,
    `audioModel` VARCHAR(191) NULL,
    `lipSyncModel` VARCHAR(191) NULL,
    `voiceDesignModel` VARCHAR(191) NULL,
    `analysisConcurrency` INTEGER NULL,
    `imageConcurrency` INTEGER NULL,
    `videoConcurrency` INTEGER NULL,
    `videoRatio` VARCHAR(191) NOT NULL DEFAULT '9:16',
    `videoResolution` VARCHAR(191) NOT NULL DEFAULT '720p',
    `artStyle` VARCHAR(191) NOT NULL DEFAULT 'american-comic',
    `ttsRate` VARCHAR(191) NOT NULL DEFAULT '+50%',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `imageResolution` VARCHAR(191) NOT NULL DEFAULT '2K',
    `capabilityDefaults` TEXT NULL,
    `llmBaseUrl` VARCHAR(191) NULL DEFAULT 'https://openrouter.ai/api/v1',
    `llmApiKey` TEXT NULL,
    `falApiKey` TEXT NULL,
    `googleAiKey` TEXT NULL,
    `arkApiKey` TEXT NULL,
    `qwenApiKey` TEXT NULL,
    `customModels` TEXT NULL,
    `customProviders` TEXT NULL,

    UNIQUE INDEX `user_preferences_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verificationtoken` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `verificationtoken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `novel_promotion_voice_lines` (
    `id` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NOT NULL,
    `lineIndex` INTEGER NOT NULL,
    `speaker` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `voicePresetId` VARCHAR(191) NULL,
    `audioUrl` TEXT NULL,
    `audioMediaId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `emotionPrompt` TEXT NULL,
    `emotionStrength` DOUBLE NULL DEFAULT 0.4,
    `matchedPanelIndex` INTEGER NULL,
    `matchedStoryboardId` VARCHAR(191) NULL,
    `audioDuration` INTEGER NULL,
    `matchedPanelId` VARCHAR(191) NULL,

    INDEX `novel_promotion_voice_lines_episodeId_idx`(`episodeId`),
    INDEX `novel_promotion_voice_lines_matchedPanelId_idx`(`matchedPanelId`),
    INDEX `novel_promotion_voice_lines_audioMediaId_idx`(`audioMediaId`),
    UNIQUE INDEX `novel_promotion_voice_lines_episodeId_lineIndex_key`(`episodeId`, `lineIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `voice_presets` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `audioUrl` TEXT NOT NULL,
    `audioMediaId` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `gender` VARCHAR(191) NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `voice_presets_audioMediaId_idx`(`audioMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_balances` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `balance` DECIMAL(18, 6) NOT NULL DEFAULT 0,
    `frozenAmount` DECIMAL(18, 6) NOT NULL DEFAULT 0,
    `totalSpent` DECIMAL(18, 6) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_balances_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `balance_freezes` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 6) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `source` VARCHAR(64) NULL,
    `taskId` VARCHAR(191) NULL,
    `requestId` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `metadata` TEXT NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `balance_freezes_idempotencyKey_key`(`idempotencyKey`),
    INDEX `balance_freezes_userId_idx`(`userId`),
    INDEX `balance_freezes_status_idx`(`status`),
    INDEX `balance_freezes_taskId_idx`(`taskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `balance_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 6) NOT NULL,
    `balanceAfter` DECIMAL(18, 6) NOT NULL,
    `description` TEXT NULL,
    `relatedId` VARCHAR(191) NULL,
    `freezeId` VARCHAR(191) NULL,
    `operatorId` VARCHAR(64) NULL,
    `externalOrderId` VARCHAR(128) NULL,
    `idempotencyKey` VARCHAR(128) NULL,
    `projectId` VARCHAR(128) NULL,
    `episodeId` VARCHAR(128) NULL,
    `taskType` VARCHAR(64) NULL,
    `billingMeta` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `balance_transactions_userId_idx`(`userId`),
    INDEX `balance_transactions_type_idx`(`type`),
    INDEX `balance_transactions_createdAt_idx`(`createdAt`),
    INDEX `balance_transactions_freezeId_idx`(`freezeId`),
    INDEX `balance_transactions_externalOrderId_idx`(`externalOrderId`),
    INDEX `balance_transactions_projectId_idx`(`projectId`),
    UNIQUE INDEX `balance_transactions_userId_type_idempotencyKey_key`(`userId`, `type`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'queued',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `attempt` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 5,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `dedupeKey` VARCHAR(191) NULL,
    `externalId` VARCHAR(191) NULL,
    `payload` JSON NULL,
    `result` JSON NULL,
    `errorCode` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `billingInfo` JSON NULL,
    `billedAt` DATETIME(3) NULL,
    `queuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `heartbeatAt` DATETIME(3) NULL,
    `enqueuedAt` DATETIME(3) NULL,
    `enqueueAttempts` INTEGER NOT NULL DEFAULT 0,
    `lastEnqueueError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tasks_dedupeKey_key`(`dedupeKey`),
    INDEX `tasks_status_idx`(`status`),
    INDEX `tasks_type_idx`(`type`),
    INDEX `tasks_targetType_targetId_idx`(`targetType`, `targetId`),
    INDEX `tasks_projectId_idx`(`projectId`),
    INDEX `tasks_userId_idx`(`userId`),
    INDEX `tasks_heartbeatAt_idx`(`heartbeatAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `taskId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_events_projectId_id_idx`(`projectId`, `id`),
    INDEX `task_events_taskId_idx`(`taskId`),
    INDEX `task_events_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `graph_runs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `episodeId` VARCHAR(191) NULL,
    `workflowType` VARCHAR(191) NOT NULL,
    `taskType` VARCHAR(191) NULL,
    `taskId` VARCHAR(191) NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'queued',
    `input` JSON NULL,
    `output` JSON NULL,
    `errorCode` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `cancelRequestedAt` DATETIME(3) NULL,
    `queuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `lastSeq` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `graph_runs_taskId_key`(`taskId`),
    INDEX `graph_runs_projectId_status_idx`(`projectId`, `status`),
    INDEX `graph_runs_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `graph_runs_taskId_idx`(`taskId`),
    INDEX `graph_runs_targetType_targetId_idx`(`targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `graph_steps` (
    `id` VARCHAR(191) NOT NULL,
    `runId` VARCHAR(191) NOT NULL,
    `stepKey` VARCHAR(191) NOT NULL,
    `stepTitle` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `currentAttempt` INTEGER NOT NULL DEFAULT 0,
    `stepIndex` INTEGER NOT NULL,
    `stepTotal` INTEGER NOT NULL,
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `lastErrorCode` VARCHAR(191) NULL,
    `lastErrorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `graph_steps_runId_status_idx`(`runId`, `status`),
    INDEX `graph_steps_runId_stepIndex_idx`(`runId`, `stepIndex`),
    UNIQUE INDEX `graph_steps_runId_stepKey_key`(`runId`, `stepKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `graph_step_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `runId` VARCHAR(191) NOT NULL,
    `stepKey` VARCHAR(191) NOT NULL,
    `attempt` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `provider` VARCHAR(191) NULL,
    `modelKey` VARCHAR(191) NULL,
    `inputHash` VARCHAR(191) NULL,
    `input` JSON NULL,
    `outputText` TEXT NULL,
    `outputReasoning` TEXT NULL,
    `usageJson` JSON NULL,
    `errorCode` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `graph_step_attempts_runId_stepKey_idx`(`runId`, `stepKey`),
    INDEX `graph_step_attempts_runId_createdAt_idx`(`runId`, `createdAt`),
    UNIQUE INDEX `graph_step_attempts_runId_stepKey_attempt_key`(`runId`, `stepKey`, `attempt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `graph_events` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `runId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `seq` INTEGER NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `stepKey` VARCHAR(191) NULL,
    `attempt` INTEGER NULL,
    `lane` VARCHAR(191) NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `graph_events_projectId_id_idx`(`projectId`, `id`),
    INDEX `graph_events_runId_id_idx`(`runId`, `id`),
    INDEX `graph_events_userId_id_idx`(`userId`, `id`),
    UNIQUE INDEX `graph_events_runId_seq_key`(`runId`, `seq`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `graph_checkpoints` (
    `id` VARCHAR(191) NOT NULL,
    `runId` VARCHAR(191) NOT NULL,
    `nodeKey` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `stateJson` JSON NOT NULL,
    `stateBytes` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `graph_checkpoints_runId_createdAt_idx`(`runId`, `createdAt`),
    UNIQUE INDEX `graph_checkpoints_runId_nodeKey_version_key`(`runId`, `nodeKey`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `graph_artifacts` (
    `id` VARCHAR(191) NOT NULL,
    `runId` VARCHAR(191) NOT NULL,
    `stepKey` VARCHAR(191) NULL,
    `artifactType` VARCHAR(191) NOT NULL,
    `refId` VARCHAR(191) NOT NULL,
    `versionHash` VARCHAR(191) NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `graph_artifacts_runId_idx`(`runId`),
    INDEX `graph_artifacts_runId_stepKey_idx`(`runId`, `stepKey`),
    INDEX `graph_artifacts_artifactType_refId_idx`(`artifactType`, `refId`),
    UNIQUE INDEX `graph_artifacts_runId_stepKey_artifactType_refId_key`(`runId`, `stepKey`, `artifactType`, `refId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `global_asset_folders` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `global_asset_folders_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `global_characters` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `folderId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `aliases` TEXT NULL,
    `profileData` TEXT NULL,
    `profileConfirmed` BOOLEAN NOT NULL DEFAULT false,
    `voiceId` VARCHAR(191) NULL,
    `voiceType` VARCHAR(191) NULL,
    `customVoiceUrl` TEXT NULL,
    `customVoiceMediaId` VARCHAR(191) NULL,
    `globalVoiceId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `global_characters_userId_idx`(`userId`),
    INDEX `global_characters_folderId_idx`(`folderId`),
    INDEX `global_characters_customVoiceMediaId_idx`(`customVoiceMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `global_character_appearances` (
    `id` VARCHAR(191) NOT NULL,
    `characterId` VARCHAR(191) NOT NULL,
    `appearanceIndex` INTEGER NOT NULL,
    `changeReason` VARCHAR(191) NOT NULL DEFAULT 'default',
    `artStyle` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `descriptions` TEXT NULL,
    `imageUrl` TEXT NULL,
    `imageMediaId` VARCHAR(191) NULL,
    `imageUrls` TEXT NULL,
    `selectedIndex` INTEGER NULL,
    `previousImageUrl` TEXT NULL,
    `previousImageMediaId` VARCHAR(191) NULL,
    `previousImageUrls` TEXT NULL,
    `previousDescription` TEXT NULL,
    `previousDescriptions` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `global_character_appearances_characterId_idx`(`characterId`),
    INDEX `global_character_appearances_imageMediaId_idx`(`imageMediaId`),
    INDEX `global_character_appearances_previousImageMediaId_idx`(`previousImageMediaId`),
    UNIQUE INDEX `global_character_appearances_characterId_appearanceIndex_key`(`characterId`, `appearanceIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `global_locations` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `folderId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `artStyle` VARCHAR(191) NULL,
    `summary` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `global_locations_userId_idx`(`userId`),
    INDEX `global_locations_folderId_idx`(`folderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `global_location_images` (
    `id` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `imageIndex` INTEGER NOT NULL,
    `description` TEXT NULL,
    `imageUrl` TEXT NULL,
    `imageMediaId` VARCHAR(191) NULL,
    `isSelected` BOOLEAN NOT NULL DEFAULT false,
    `previousImageUrl` TEXT NULL,
    `previousImageMediaId` VARCHAR(191) NULL,
    `previousDescription` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `global_location_images_locationId_idx`(`locationId`),
    INDEX `global_location_images_imageMediaId_idx`(`imageMediaId`),
    INDEX `global_location_images_previousImageMediaId_idx`(`previousImageMediaId`),
    UNIQUE INDEX `global_location_images_locationId_imageIndex_key`(`locationId`, `imageIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `global_voices` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `folderId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `voiceId` VARCHAR(191) NULL,
    `voiceType` VARCHAR(191) NOT NULL DEFAULT 'qwen-designed',
    `customVoiceUrl` TEXT NULL,
    `customVoiceMediaId` VARCHAR(191) NULL,
    `voicePrompt` TEXT NULL,
    `gender` VARCHAR(191) NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'zh',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `global_voices_userId_idx`(`userId`),
    INDEX `global_voices_folderId_idx`(`folderId`),
    INDEX `global_voices_customVoiceMediaId_idx`(`customVoiceMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_objects` (
    `id` VARCHAR(191) NOT NULL,
    `publicId` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(512) NOT NULL,
    `sha256` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NULL,
    `sizeBytes` BIGINT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `durationMs` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `media_objects_publicId_key`(`publicId`),
    UNIQUE INDEX `media_objects_storageKey_key`(`storageKey`),
    INDEX `media_objects_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legacy_media_refs_backup` (
    `id` VARCHAR(191) NOT NULL,
    `runId` VARCHAR(191) NOT NULL,
    `tableName` VARCHAR(191) NOT NULL,
    `rowId` VARCHAR(191) NOT NULL,
    `fieldName` VARCHAR(191) NOT NULL,
    `legacyValue` TEXT NOT NULL,
    `checksum` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `legacy_media_refs_backup_runId_idx`(`runId`),
    INDEX `legacy_media_refs_backup_tableName_fieldName_idx`(`tableName`, `fieldName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pipeline_runs` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'queued',
    `currentPhase` VARCHAR(191) NOT NULL DEFAULT 'script',
    `stateSnapshot` JSON NULL,
    `config` JSON NULL,
    `errorCode` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `pipeline_runs_projectId_status_idx`(`projectId`, `status`),
    INDEX `pipeline_runs_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pipeline_review_items` (
    `id` VARCHAR(191) NOT NULL,
    `pipelineRunId` VARCHAR(191) NOT NULL,
    `phase` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `score` DOUBLE NULL,
    `feedback` TEXT NULL,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `pipeline_review_items_pipelineRunId_phase_idx`(`pipelineRunId`, `phase`),
    INDEX `pipeline_review_items_pipelineRunId_status_idx`(`pipelineRunId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `style_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `artStyle` VARCHAR(191) NOT NULL,
    `stylePrefix` TEXT NOT NULL,
    `negativePrompt` TEXT NOT NULL,
    `colorPalette` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `style_profiles_projectId_key`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `account` ADD CONSTRAINT `account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `character_appearances` ADD CONSTRAINT `character_appearances_imageMediaId_fkey` FOREIGN KEY (`imageMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `character_appearances` ADD CONSTRAINT `character_appearances_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `novel_promotion_characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `location_images` ADD CONSTRAINT `location_images_imageMediaId_fkey` FOREIGN KEY (`imageMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `location_images` ADD CONSTRAINT `location_images_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `novel_promotion_locations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_characters` ADD CONSTRAINT `novel_promotion_characters_customVoiceMediaId_fkey` FOREIGN KEY (`customVoiceMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_characters` ADD CONSTRAINT `novel_promotion_characters_novelPromotionProjectId_fkey` FOREIGN KEY (`novelPromotionProjectId`) REFERENCES `novel_promotion_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_locations` ADD CONSTRAINT `novel_promotion_locations_selectedImageId_fkey` FOREIGN KEY (`selectedImageId`) REFERENCES `location_images`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_locations` ADD CONSTRAINT `novel_promotion_locations_novelPromotionProjectId_fkey` FOREIGN KEY (`novelPromotionProjectId`) REFERENCES `novel_promotion_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_episodes` ADD CONSTRAINT `novel_promotion_episodes_audioMediaId_fkey` FOREIGN KEY (`audioMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_episodes` ADD CONSTRAINT `novel_promotion_episodes_novelPromotionProjectId_fkey` FOREIGN KEY (`novelPromotionProjectId`) REFERENCES `novel_promotion_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `video_editor_projects` ADD CONSTRAINT `video_editor_projects_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `novel_promotion_episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_clips` ADD CONSTRAINT `novel_promotion_clips_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `novel_promotion_episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_panels` ADD CONSTRAINT `novel_promotion_panels_imageMediaId_fkey` FOREIGN KEY (`imageMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_panels` ADD CONSTRAINT `novel_promotion_panels_videoMediaId_fkey` FOREIGN KEY (`videoMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_panels` ADD CONSTRAINT `novel_promotion_panels_lipSyncVideoMediaId_fkey` FOREIGN KEY (`lipSyncVideoMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_panels` ADD CONSTRAINT `novel_promotion_panels_sketchImageMediaId_fkey` FOREIGN KEY (`sketchImageMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_panels` ADD CONSTRAINT `novel_promotion_panels_previousImageMediaId_fkey` FOREIGN KEY (`previousImageMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_panels` ADD CONSTRAINT `novel_promotion_panels_storyboardId_fkey` FOREIGN KEY (`storyboardId`) REFERENCES `novel_promotion_storyboards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_projects` ADD CONSTRAINT `novel_promotion_projects_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_shots` ADD CONSTRAINT `novel_promotion_shots_imageMediaId_fkey` FOREIGN KEY (`imageMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_shots` ADD CONSTRAINT `novel_promotion_shots_clipId_fkey` FOREIGN KEY (`clipId`) REFERENCES `novel_promotion_clips`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_shots` ADD CONSTRAINT `novel_promotion_shots_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `novel_promotion_episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_storyboards` ADD CONSTRAINT `novel_promotion_storyboards_clipId_fkey` FOREIGN KEY (`clipId`) REFERENCES `novel_promotion_clips`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_storyboards` ADD CONSTRAINT `novel_promotion_storyboards_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `novel_promotion_episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplementary_panels` ADD CONSTRAINT `supplementary_panels_imageMediaId_fkey` FOREIGN KEY (`imageMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplementary_panels` ADD CONSTRAINT `supplementary_panels_storyboardId_fkey` FOREIGN KEY (`storyboardId`) REFERENCES `novel_promotion_storyboards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usage_costs` ADD CONSTRAINT `usage_costs_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usage_costs` ADD CONSTRAINT `usage_costs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_voice_lines` ADD CONSTRAINT `novel_promotion_voice_lines_audioMediaId_fkey` FOREIGN KEY (`audioMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_voice_lines` ADD CONSTRAINT `novel_promotion_voice_lines_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `novel_promotion_episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novel_promotion_voice_lines` ADD CONSTRAINT `novel_promotion_voice_lines_matchedPanelId_fkey` FOREIGN KEY (`matchedPanelId`) REFERENCES `novel_promotion_panels`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voice_presets` ADD CONSTRAINT `voice_presets_audioMediaId_fkey` FOREIGN KEY (`audioMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_balances` ADD CONSTRAINT `user_balances_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_events` ADD CONSTRAINT `task_events_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_events` ADD CONSTRAINT `task_events_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `graph_runs` ADD CONSTRAINT `graph_runs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `graph_steps` ADD CONSTRAINT `graph_steps_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `graph_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `graph_step_attempts` ADD CONSTRAINT `graph_step_attempts_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `graph_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `graph_step_attempts` ADD CONSTRAINT `graph_step_attempts_runId_stepKey_fkey` FOREIGN KEY (`runId`, `stepKey`) REFERENCES `graph_steps`(`runId`, `stepKey`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `graph_events` ADD CONSTRAINT `graph_events_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `graph_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `graph_events` ADD CONSTRAINT `graph_events_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `graph_checkpoints` ADD CONSTRAINT `graph_checkpoints_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `graph_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `graph_artifacts` ADD CONSTRAINT `graph_artifacts_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `graph_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_asset_folders` ADD CONSTRAINT `global_asset_folders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_characters` ADD CONSTRAINT `global_characters_customVoiceMediaId_fkey` FOREIGN KEY (`customVoiceMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_characters` ADD CONSTRAINT `global_characters_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_characters` ADD CONSTRAINT `global_characters_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `global_asset_folders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_character_appearances` ADD CONSTRAINT `global_character_appearances_imageMediaId_fkey` FOREIGN KEY (`imageMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_character_appearances` ADD CONSTRAINT `global_character_appearances_previousImageMediaId_fkey` FOREIGN KEY (`previousImageMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_character_appearances` ADD CONSTRAINT `global_character_appearances_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `global_characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_locations` ADD CONSTRAINT `global_locations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_locations` ADD CONSTRAINT `global_locations_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `global_asset_folders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_location_images` ADD CONSTRAINT `global_location_images_imageMediaId_fkey` FOREIGN KEY (`imageMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_location_images` ADD CONSTRAINT `global_location_images_previousImageMediaId_fkey` FOREIGN KEY (`previousImageMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_location_images` ADD CONSTRAINT `global_location_images_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `global_locations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_voices` ADD CONSTRAINT `global_voices_customVoiceMediaId_fkey` FOREIGN KEY (`customVoiceMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_voices` ADD CONSTRAINT `global_voices_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_voices` ADD CONSTRAINT `global_voices_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `global_asset_folders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pipeline_review_items` ADD CONSTRAINT `pipeline_review_items_pipelineRunId_fkey` FOREIGN KEY (`pipelineRunId`) REFERENCES `pipeline_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
