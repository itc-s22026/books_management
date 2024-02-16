-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(256) NOT NULL,
    `name` VARCHAR(100) NULL,
    `password` TINYBLOB NOT NULL,
    `salt` TINYBLOB NOT NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `books` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `isbn13` DECIMAL(13, 0) NOT NULL,
    `title` VARCHAR(200) NULL,
    `author` VARCHAR(100) NULL,
    `publishDate` DATE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rental` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `book_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `rentalDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `returnDeadline` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL 7 DAY,
    `returnDate` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
