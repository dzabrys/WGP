FROM mcr.microsoft.com/devcontainers/php:1-8.3-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends libpng-dev libwebp-dev libjpeg62-turbo-dev libzip-dev libonig-dev libsqlite3-dev libcurl4-openssl-dev \
    && docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install -j2 gd zip mbstring pdo_mysql pdo_sqlite curl \
    && rm -rf /var/lib/apt/lists/*
