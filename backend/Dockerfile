FROM php:8.5-cli-alpine

RUN apk add --no-cache \
        icu-data-full \
        icu-dev \
        icu-libs \
        libpq \
        libzip \
        libzip-dev \
        oniguruma \
        oniguruma-dev \
        postgresql-dev \
    && docker-php-ext-install -j"$(nproc)" \
        intl \
        mbstring \
        pcntl \
        pdo_pgsql \
        zip \
    && apk del --no-cache \
        icu-dev \
        libzip-dev \
        oniguruma-dev \
        postgresql-dev

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /app

# Copiar dependencias primero para optimizar capa de caché de Composer
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

# Copiar el código fuente completo del backend
COPY . .

# Finalizar la generación del autoloader optimizado
RUN composer dump-autoload --optimize --no-dev \
    && rm /usr/local/bin/composer

# Configurar directorios de almacenamiento y propiedad para www-data (UID 33 / GID 33)
RUN mkdir -p \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
        /tmp/laravel/views \
    && chown -R www-data:www-data storage bootstrap/cache /tmp/laravel /app

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER www-data:www-data

ENV PORT=8000
ENV LOG_CHANNEL=stderr
ENV CACHE_STORE=array
ENV SESSION_DRIVER=array
ENV VIEW_COMPILED_PATH=/tmp/laravel/views
ENV PHP_CLI_SERVER_WORKERS=4

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

